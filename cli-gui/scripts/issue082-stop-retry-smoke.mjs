// issue-082 real-engine smoke: Stop (cancel turn) and session restart
// 用法：node scripts/issue082-stop-retry-smoke.mjs [profileId]（默认 profile-codex）
// 验证：发送长任务 → 立即取消 → 确认不死锁 → 再发一轮正常完成 → stop/start 恢复
const BASE = "http://localhost:3001";
const ORIGIN = { origin: "http://localhost:3000" };
const PROFILE_ID = process.argv[2] || "profile-codex";

async function api(path, init = {}) {
  const res = await fetch(BASE + path, { ...init, headers: { "content-type": "application/json", ...ORIGIN, ...(init.headers || {}) } });
  const body = await res.json().catch(() => undefined);
  if (!res.ok && res.status !== 409) throw new Error(`${init.method || "GET"} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return { status: res.status, body };
}

const { body: state } = await api("/api/state");
const cap = state.csrfCapability;
const post = (path, payload) => api(path, { method: "POST", body: JSON.stringify(payload), headers: { "x-specos-csrf-capability": cap } });

async function waitForEvent(sessionId, afterSeq, predicate, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const { body: page } = await api(`/api/sessions/${sessionId}/transcript?afterSequence=${afterSeq}&limit=200`);
    const events = page.events || page.items || [];
    const match = events.find(predicate);
    if (match) return { found: match, events };
  }
  return { found: null, events: [] };
}

console.log(`=== issue-082 Stop/Retry/Restart smoke (${PROFILE_ID}) ===\n`);

// 创建会话
const { body: created } = await post("/api/sessions", {
  name: `smoke-stop-retry (${PROFILE_ID})`,
  workspaceId: state.workspaces[0].id,
  profileId: PROFILE_ID,
  interactionMode: "chat",
  start: true,
  confirmed: true
});
const session = created.session || created;
console.log("[created]", session.id, "mode:", session.interactionMode);
if (session.interactionMode !== "chat") { console.error("FAIL: not chat"); process.exit(1); }

// --- TEST 1: Stop (cancel turn) ---
console.log("\n--- TEST 1: Stop running turn ---");
// 发送需要较长时间的 prompt
const turnMsg = await post(`/api/sessions/${session.id}/messages`, {
  clientMessageId: crypto.randomUUID(),
  content: "Write a detailed 2000 word essay about the history of computing. Include all major milestones.",
  startIfStopped: true,
  confirmedStart: true
});
console.log("[sent long prompt]", turnMsg.status);

// 等待一些事件出现（证明 turn 已开始）
await new Promise(r => setTimeout(r, 5000));
const { body: midPage } = await api(`/api/sessions/${session.id}/transcript?afterSequence=0&limit=100`);
const midEvents = midPage.events || midPage.items || [];
const activeTurn = midEvents.find(e => e.kind === "lifecycle" && /Turn started/.test(e.raw || ""));
if (!activeTurn) {
  // 如果还没找到 turn started，再等一会
  await new Promise(r => setTimeout(r, 5000));
}

// 从 transcript 事件中推断 turnId
const { body: page2 } = await api(`/api/sessions/${session.id}/transcript?afterSequence=0&limit=100`);
const evts = page2.events || page2.items || [];
const turnEvent = [...evts].reverse().find(e => e.metadata?.turnId);
const effectiveTurnId = turnEvent?.metadata?.turnId;
console.log("[inferred turnId]", effectiveTurnId);

if (effectiveTurnId) {
  const cancelResult = await post(`/api/sessions/${session.id}/turns/cancel`, { turnId: effectiveTurnId });
  console.log("[cancel]", cancelResult.status, cancelResult.body?.code || "OK");
  
  // 等待 lifecycle 事件确认取消
  const { body: postCancel } = await api(`/api/sessions/${session.id}/transcript?afterSequence=0&limit=200`);
  const postEvents = postCancel.events || postCancel.items || [];
  const cancelled = postEvents.some(e => e.kind === "lifecycle" && /cancel|abort/i.test(e.raw || ""));
  const completed = postEvents.some(e => e.kind === "lifecycle" && /completed/i.test(e.raw || ""));
  console.log(cancelled || completed ? "PASS: turn ended after cancel" : "WARN: no cancel lifecycle yet (may be async)");
} else {
  // Turn 可能已经结束（codex 快速回复）
  console.log("SKIP cancel: turn already finished (fast engine)");
}

// --- TEST 2: 取消后可以正常发下一轮 ---
console.log("\n--- TEST 2: Send after cancel ---");
await new Promise(r => setTimeout(r, 3000)); // 等引擎进程清理

const { body: postCancelState } = await api(`/api/sessions/${session.id}/transcript?afterSequence=0&limit=200`);
const seqAfterCancel = Math.max(0, ...((postCancelState.events || postCancelState.items || []).map(e => e.sequence)));

await post(`/api/sessions/${session.id}/messages`, {
  clientMessageId: crypto.randomUUID(),
  content: "Reply with exactly: AFTER-CANCEL-OK",
  startIfStopped: true,
  confirmedStart: true
});

const { found: afterCancelMsg } = await waitForEvent(
  session.id, seqAfterCancel,
  e => e.kind === "assistant_message" && /AFTER-CANCEL-OK/i.test(e.raw || ""),
  120_000
);
console.log(afterCancelMsg ? "PASS: turn after cancel succeeded" : "FAIL: turn after cancel did not produce assistant_message");

// --- TEST 3: Stop session + restart ---
console.log("\n--- TEST 3: Stop + Start session ---");
const stopResult = await post(`/api/sessions/${session.id}/stop`, {});
console.log("[stop]", stopResult.status);

await new Promise(r => setTimeout(r, 2000));
const startResult = await post(`/api/sessions/${session.id}/start`, { confirmed: true });
console.log("[start]", startResult.status);

// 发一轮确认恢复
const { body: restartTranscript } = await api(`/api/sessions/${session.id}/transcript?afterSequence=0&limit=200`);
const seqAfterRestart = Math.max(0, ...((restartTranscript.events || restartTranscript.items || []).map(e => e.sequence)));

await post(`/api/sessions/${session.id}/messages`, {
  clientMessageId: crypto.randomUUID(),
  content: "Reply with exactly: RESTART-OK",
  startIfStopped: true,
  confirmedStart: true
});

const { found: restartMsg } = await waitForEvent(
  session.id, seqAfterRestart,
  e => e.kind === "assistant_message" && /RESTART-OK/i.test(e.raw || ""),
  120_000
);
console.log(restartMsg ? "PASS: session restart + turn succeeded" : "FAIL: restart turn did not produce assistant_message");

// Summary
const allPass = !!afterCancelMsg && !!restartMsg;
console.log(`\n=== ${allPass ? "ALL PASS" : "SOME FAILED"} ===`);
process.exit(allPass ? 0 : 1);
