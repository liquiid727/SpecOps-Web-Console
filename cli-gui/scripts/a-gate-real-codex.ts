// MVP01-A 门禁收口脚本（issue-009，test-spec §4.1）：
// G-A1 真实 v2 备份迁移零丢失、G-A2 首 token 计时、G-A3 重启回放一致、
// 真实 Codex 连续 3+ 轮（resume 延续）+ 中途取消 + headless 审批 stdin 探测。
// 运行：npx tsx scripts/a-gate-real-codex.ts（需本机 codex CLI 已登录）
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createApplication } from "../server/application.js";
import { createServer } from "../server/http-server.js";
import { createProductionDependencies } from "../server/production.js";
import { migrateAndValidate } from "../server/store.js";
import type { TranscriptEvent } from "../shared/types.js";

const execFileAsync = promisify(execFile);
// npx 会向 PATH 注入 node_modules/.bin（含旧 fake codex）；门禁必须命中真实 CLI
const cleanPath = (process.env.PATH ?? "").split(":").filter((entry) => !entry.includes("node_modules/.bin")).join(":");
// detectCapabilities（profile-adapters.ts）用 process.env 探测版本，脚本与 server 同进程，必须覆写
process.env.PATH = cleanPath;
const cleanEnv = { ...process.env, PATH: cleanPath };
const results: string[] = [];
const record = (line: string) => { results.push(line); console.log(line); };

try {
  execFileSync("codex", ["--version"], { stdio: "ignore", timeout: 5_000, shell: false, env: cleanEnv });
} catch {
  console.log("SKIP: codex CLI unavailable; a-gate real verification cannot run.");
  process.exit(0);
}
const codexVersion = (await execFileAsync("codex", ["--version"], { timeout: 5_000, shell: false, env: cleanEnv })).stdout.trim();
record(`INFO codex version: ${codexVersion}; date: ${new Date().toISOString()}`);

// —— G-A1：真实 v2 备份数据迁移 v3 零丢失 ——
const backupPath = path.join(process.cwd(), "data", "state.json.v2.bak");
try {
  const rawBackup = JSON.parse(await fs.readFile(backupPath, "utf8"));
  const before = rawBackup.state ?? rawBackup;
  const migrated = await migrateAndValidate(structuredClone(rawBackup), { now: () => new Date().toISOString() });
  const ids = (items: Array<{ id: string }> | undefined) => (items ?? []).map((item) => item.id).sort().join(",");
  const lossless = ids(before.workspaces) === ids(migrated.workspaces) && ids(before.profiles) === ids(migrated.profiles) && ids(before.sessions) === ids(migrated.sessions);
  record(`${lossless ? "PASS" : "FAIL"} G-A1 real v2 backup migration: workspaces ${migrated.workspaces.length}, profiles ${migrated.profiles.length}, sessions ${migrated.sessions.length}; id sets ${lossless ? "identical" : "DIVERGED"}`);
} catch (error) {
  record(`FAIL G-A1 real v2 backup migration threw: ${String(error)}`);
}

// —— 真实 Codex chat 验证环境 ——
const root = await fs.mkdtemp(path.join(os.tmpdir(), "specos-a-gate-"));
const dataDirectory = path.join(root, "data");
const workspacePath = path.join(root, "workspace");
await fs.mkdir(workspacePath, { recursive: true });
await execFileAsync("git", ["init", "-q"], { cwd: workspacePath, shell: false });
const processEnvironment = { PATH: cleanPath, HOME: process.env.HOME, LANG: "C.UTF-8", TERM: "xterm-256color" };

function makeDependencies() {
  return createProductionDependencies({ dataDirectory, readonly: false, processEnvironment });
}

async function boot(dependencies: ReturnType<typeof makeDependencies>) {
  const application = await createApplication(dependencies);
  const server = createServer(application, {
    host: "127.0.0.1",
    port: 0,
    allowedHosts: ["127.0.0.1"],
    allowedOrigins: ["http://127.0.0.1:3000"],
    csrfCapability: dependencies.policy.csrfCapability,
    logger: dependencies.logger,
    requestIdFactory: () => dependencies.idGenerator.create("a-gate")
  });
  const address = await server.listen();
  return { server, port: address.port, capability: dependencies.policy.csrfCapability! };
}

function requestJson(port: number, capability: string, method: string, pathname: string, payload?: unknown) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const body = payload === undefined ? "" : JSON.stringify(payload);
    const request = http.request({
      host: "127.0.0.1", port, path: pathname, method,
      headers: { host: `127.0.0.1:${port}`, origin: "http://127.0.0.1:3000", "content-type": "application/json", "content-length": Buffer.byteLength(body), "x-specos-csrf-capability": capability }
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.once("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        try { resolve({ status: response.statusCode ?? 0, body: text ? JSON.parse(text) : undefined }); }
        catch { resolve({ status: response.statusCode ?? 0, body: text }); }
      });
    });
    request.once("error", reject);
    request.end(body);
  });
}

async function fetchTranscript(port: number, capability: string, sessionId: string): Promise<TranscriptEvent[]> {
  // API 限制 limit ≤ 200（application.ts 校验），分页拉取全量
  const events: TranscriptEvent[] = [];
  let afterSequence = 0;
  for (let pageCount = 0; pageCount < 50; pageCount += 1) {
    const page = await requestJson(port, capability, "GET", `/api/sessions/${sessionId}/transcript?afterSequence=${afterSequence}&limit=200`);
    const batch: TranscriptEvent[] = Array.isArray(page.body?.events) ? page.body.events : [];
    events.push(...batch);
    if (!page.body?.hasMore || typeof page.body?.nextAfterSequence !== "number" || page.body.nextAfterSequence <= afterSequence) break;
    afterSequence = page.body.nextAfterSequence;
  }
  return events;
}

// 轮次终态：lifecycle turn-*（completed/failed/cancelled）或该 turnId 的 error 事件
function turnFinished(events: TranscriptEvent[], turnId: string) {
  return events.some((event) => event.metadata?.turnId === turnId && (event.kind === "error" || (event.kind === "lifecycle" && String(event.metadata?.status ?? "").startsWith("turn-"))));
}

async function waitForTurn(port: number, capability: string, sessionId: string, turnId: string, timeoutMs: number) {
  const startedAt = Date.now();
  let firstAssistantMs: number | undefined;
  while (Date.now() - startedAt < timeoutMs) {
    const events = await fetchTranscript(port, capability, sessionId);
    if (firstAssistantMs === undefined && events.some((event) => event.metadata?.turnId === turnId && (event.kind === "assistant_message" || event.kind === "tool_activity"))) firstAssistantMs = Date.now() - startedAt;
    if (turnFinished(events, turnId)) return { events, firstAssistantMs, elapsedMs: Date.now() - startedAt };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return { events: await fetchTranscript(port, capability, sessionId), firstAssistantMs, elapsedMs: Date.now() - startedAt, timedOut: true as const };
}

let handle: Awaited<ReturnType<typeof boot>> | undefined;
let sessionId = "";
let snapshotBeforeRestart: Array<{ id: string; sequence: number; kind: string }> = [];
try {
  handle = await boot(makeDependencies());
  const { port, capability } = handle;
  const workspace = await requestJson(port, capability, "POST", "/api/workspaces", { name: "A-gate workspace", path: workspacePath });
  const profile = await requestJson(port, capability, "POST", "/api/profiles", { name: "Codex", command: "codex", args: [], adapterId: "codex" });
  const session = await requestJson(port, capability, "POST", "/api/sessions", { name: "A-gate chat", workspaceId: workspace.body.id, profileId: profile.body.id, interactionMode: "chat" });
  sessionId = session.body.session?.id ?? session.body.id;
  record(`INFO session created: ${sessionId} (status ${session.status}, interactionMode ${session.body.session?.interactionMode ?? session.body.interactionMode})`);

  async function sendTurn(content: string, timeoutMs = 180_000) {
    const clientMessageId = crypto.randomUUID();
    const posted = await requestJson(port, capability, "POST", `/api/sessions/${sessionId}/messages`, { content, clientMessageId, startIfStopped: true, confirmedStart: true });
    if (posted.status !== 202 || typeof posted.body?.turnId !== "string") throw new Error(`turn submit failed: ${posted.status} ${JSON.stringify(posted.body)}`);
    const outcome = await waitForTurn(port, capability, sessionId, posted.body.turnId, timeoutMs);
    const assistantText = outcome.events.filter((event) => event.metadata?.turnId === posted.body.turnId && event.kind === "assistant_message").map((event) => event.raw).join("\n");
    return { turnId: posted.body.turnId as string, ...outcome, assistantText };
  }

  // 轮 1：记忆词 + 首 token 计时（G-A2）
  const turn1 = await sendTurn("Remember the word PINEAPPLE42. Reply with exactly: OK. Do not use any tools.");
  record(`${turn1.firstAssistantMs !== undefined && turn1.firstAssistantMs <= 5_000 ? "PASS" : "FAIL"} G-A2 first structured token: ${turn1.firstAssistantMs ?? "none"}ms (turn total ${turn1.elapsedMs}ms)`);
  record(`INFO turn1 assistant: ${turn1.assistantText.slice(0, 120)}`);

  // 轮 2：resume 上下文延续
  const turn2 = await sendTurn("What word did I ask you to remember earlier in this conversation? Reply with just that word. Do not use any tools.");
  record(`${turn2.assistantText.includes("PINEAPPLE42") ? "PASS" : "FAIL"} resume continuity: turn2 recalled ${JSON.stringify(turn2.assistantText.slice(0, 80))}`);

  // 轮 3：连续第三轮
  const turn3 = await sendTurn("Reply with exactly: THIRD_TURN_OK. Do not use any tools.");
  record(`${turn3.assistantText.includes("THIRD_TURN_OK") ? "PASS" : "FAIL"} third consecutive turn: ${JSON.stringify(turn3.assistantText.slice(0, 60))}`);

  // 中途取消 → 再发新轮
  const cancelMessageId = crypto.randomUUID();
  const longTurn = await requestJson(port, capability, "POST", `/api/sessions/${sessionId}/messages`, { content: "Write a very detailed 2000 word essay about the history of terminals. Do not use tools.", clientMessageId: cancelMessageId });
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  const cancelled = await requestJson(port, capability, "POST", `/api/sessions/${sessionId}/turns/cancel`, { turnId: longTurn.body.turnId });
  const cancelOutcome = await waitForTurn(port, capability, sessionId, longTurn.body.turnId, 30_000);
  const cancelEvent = cancelOutcome.events.find((event) => event.metadata?.turnId === longTurn.body.turnId && (event.metadata?.code === "TURN_CANCELLED" || event.metadata?.status === "turn-cancelled"));
  record(`${cancelled.status === 202 && cancelEvent ? "PASS" : "FAIL"} mid-turn cancel: cancel status ${cancelled.status}, terminal event ${cancelEvent ? `${cancelEvent.kind}/${cancelEvent.metadata?.code ?? cancelEvent.metadata?.status}` : "missing"}`);
  const afterCancel = await sendTurn("Reply with exactly: AFTER_CANCEL_OK. Do not use any tools.");
  record(`${afterCancel.assistantText.includes("AFTER_CANCEL_OK") ? "PASS" : "FAIL"} new turn after cancel: ${JSON.stringify(afterCancel.assistantText.slice(0, 60))}`);

  // G-A3：重启回放一致（事件数、顺序、kind）
  snapshotBeforeRestart = (await fetchTranscript(port, capability, sessionId)).map((event) => ({ id: event.id, sequence: event.sequence, kind: event.kind }));
  await handle.server.close();
  handle = await boot(makeDependencies());
  const replayed = (await fetchTranscript(handle.port, handle.capability, sessionId)).map((event) => ({ id: event.id, sequence: event.sequence, kind: event.kind }));
  const identical = JSON.stringify(snapshotBeforeRestart) === JSON.stringify(replayed);
  record(`${identical && snapshotBeforeRestart.length > 0 ? "PASS" : "FAIL"} G-A3 restart replay: before ${snapshotBeforeRestart.length} events, after ${replayed.length} events, ${identical ? "identical ids/order/kinds" : "DIVERGED"}`);

  // ANSI 检查：assistant_message 原文不含 ESC 字节（结构化门禁佐证）
  const finalEvents = await fetchTranscript(handle.port, handle.capability, sessionId);
  const assistantEvents = finalEvents.filter((event) => event.kind === "assistant_message");
  const ansiFree = assistantEvents.every((event) => !event.raw.includes("\u001b"));
  record(`${assistantEvents.length > 0 && ansiFree ? "PASS" : "FAIL"} structured assistant output: ${assistantEvents.length} assistant_message events, ANSI-free ${ansiFree}`);
} catch (error) {
  record(`FAIL real codex chat verification threw: ${String(error)}`);
} finally {
  await handle?.server.close().catch(() => undefined);
}

// —— headless 审批 stdin 探测（adapter-spec §5 开放问题）——
try {
  const probeDir = path.join(root, "approval-probe");
  await fs.mkdir(probeDir, { recursive: true });
  await execFileAsync("git", ["init", "-q"], { cwd: probeDir, shell: false });
  const child = spawn("codex", ["exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check", "-C", probeDir, "Create a file named probe.txt containing hello using the shell."], { cwd: probeDir, env: { ...cleanEnv, LANG: "C.UTF-8" }, shell: false, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString("utf8"); });
  child.stderr.on("data", (chunk) => { output += chunk.toString("utf8"); });
  const exited = await new Promise<{ timedOut: boolean; code: number | null }>((resolve) => {
    const timer = setTimeout(() => { child.kill("SIGTERM"); resolve({ timedOut: true, code: null }); }, 150_000);
    child.once("close", (code) => { clearTimeout(timer); resolve({ timedOut: false, code }); });
  });
  const fileCreated = await fs.access(path.join(probeDir, "probe.txt")).then(() => true, () => false);
  record(`INFO approval probe (stdin ignored, sandbox read-only): exited=${!exited.timedOut} code=${exited.code} fileCreated=${fileCreated}`);
  record(`${!exited.timedOut ? "PASS" : "FAIL"} headless approval does not block on stdin: process ${exited.timedOut ? "HUNG until timeout" : "exited on its own"}; sandbox write ${fileCreated ? "SUCCEEDED (unexpected)" : "was denied/skipped"}`);
  record(`INFO approval probe tail: ${output.slice(-400).replace(/\s+/g, " ").trim()}`);
} catch (error) {
  record(`FAIL approval probe threw: ${String(error)}`);
}

await fs.rm(root, { recursive: true, force: true });
console.log("\n===== A-GATE SUMMARY =====");
for (const line of results) console.log(line);
process.exit(results.some((line) => line.startsWith("FAIL")) ? 1 : 0);
