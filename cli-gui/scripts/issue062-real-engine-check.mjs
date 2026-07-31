// issue-062/075 real-engine structured channel acceptance probe
// 用法：node scripts/issue062-real-engine-check.mjs [profileId]（默认 profile-codex）
// 验证：chat 会话创建（json-stream）→ 首轮结构化事件 → 第二轮 native resume 上下文续接
const BASE = "http://localhost:3001";
const ORIGIN = { origin: "http://localhost:3000" };
const PROFILE_ID = process.argv[2] || "profile-codex";
const TOKEN = "STRUCTURED-CHANNEL-OK";

async function api(path, init = {}) {
  const res = await fetch(BASE + path, { ...init, headers: { "content-type": "application/json", ...ORIGIN, ...(init.headers || {}) } });
  const body = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const state = await api("/api/state");
const cap = state.csrfCapability;
const post = (path, payload) => api(path, { method: "POST", body: JSON.stringify(payload), headers: { "x-specos-csrf-capability": cap } });

async function waitTurn(sessionId, afterSequence, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const page = await api(`/api/sessions/${sessionId}/transcript?afterSequence=${afterSequence}&limit=200`);
    const events = page.events || page.items || [];
    if (events.some((e) => e.kind === "lifecycle" && /Turn completed/.test(e.raw || ""))) return events;
    if (events.some((e) => e.kind === "error")) return events;
  }
  throw new Error("TIMEOUT waiting for turn completion");
}

const created = await post("/api/sessions", {
  name: `issue-062 structured check (${PROFILE_ID})`,
  workspaceId: state.workspaces[0].id,
  profileId: PROFILE_ID,
  interactionMode: "chat",
  start: true,
  confirmed: true
});
const session = created.session || created;
console.log("[created]", JSON.stringify({ id: session.id, mode: session.interactionMode, backendId: session.backendId, ref: session.backendSessionRef, downgraded: created.interactionModeDowngraded, startupError: created.startupError }));
if (session.interactionMode !== "chat") { console.error("FAIL: not a chat session"); process.exit(1); }

// 首轮：结构化事件断言
await post(`/api/sessions/${session.id}/messages`, { clientMessageId: crypto.randomUUID(), content: `Reply with exactly: ${TOKEN}`, startIfStopped: true, confirmedStart: true });
const turn1 = await waitTurn(session.id, 0);
for (const e of turn1) console.log(`  seq=${e.sequence} kind=${e.kind} source=${e.source} raw=${JSON.stringify((e.raw || "").slice(0, 90))}`);
const lastSeq = Math.max(...turn1.map((e) => e.sequence));
const pass1 = turn1.some((e) => e.kind === "assistant_message" && e.raw.includes(TOKEN));
const noPty = !turn1.some((e) => e.kind === "pty_output");
console.log(pass1 ? "PASS turn1: structured assistant_message" : "FAIL turn1: no matching assistant_message");
console.log(noPty ? "PASS turn1: zero pty_output" : "WARN turn1: pty_output present");

// 第二轮：native resume 上下文续接断言
await post(`/api/sessions/${session.id}/messages`, { clientMessageId: crypto.randomUUID(), content: "What exact token did I ask you to reply with in my previous message? Reply with the token only.", startIfStopped: true, confirmedStart: true });
const turn2 = await waitTurn(session.id, lastSeq);
for (const e of turn2) console.log(`  seq=${e.sequence} kind=${e.kind} source=${e.source} raw=${JSON.stringify((e.raw || "").slice(0, 90))}`);
const cur = (await api("/api/state")).sessions.find((s) => s.id === session.id);
console.log("[final ref]", JSON.stringify(cur.backendSessionRef), "chatContext:", JSON.stringify(cur.chatContext));
const pass2 = turn2.some((e) => e.kind === "assistant_message" && e.raw.includes(TOKEN));
console.log(pass2 ? "PASS turn2: native resume kept context" : "FAIL turn2: context lost");
process.exit(pass1 && pass2 ? 0 : 1);
