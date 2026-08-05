import { spawn } from "node:child_process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const fixturePath = fileURLToPath(new URL("./fixture-agent.mjs", import.meta.url));
const child = spawn(process.execPath, [fixturePath], {
  stdio: ["pipe", "pipe", "pipe"],
});

const messages = [];
const waiters = [];
let stderr = "";

function fail(error) {
  for (const waiter of waiters.splice(0)) waiter.reject(error);
}

function push(message) {
  const waiterIndex = waiters.findIndex((waiter) => waiter.predicate(message));
  if (waiterIndex === -1) {
    messages.push(message);
    return;
  }

  const [waiter] = waiters.splice(waiterIndex, 1);
  clearTimeout(waiter.timer);
  waiter.resolve(message);
}

function nextWhere(predicate, timeoutMs = 1_000) {
  const messageIndex = messages.findIndex(predicate);
  if (messageIndex !== -1) return Promise.resolve(messages.splice(messageIndex, 1)[0]);

  return new Promise((resolve, reject) => {
    const waiter = { predicate, resolve, reject, timer: undefined };
    waiter.timer = setTimeout(() => {
      const index = waiters.indexOf(waiter);
      if (index !== -1) waiters.splice(index, 1);
      reject(new Error(`timed out waiting for protocol message after ${timeoutMs}ms`));
    }, timeoutMs);
    waiters.push(waiter);
  });
}

function send(id, method, params = undefined) {
  const request = { jsonrpc: "2.0", id, method };
  if (params !== undefined) request.params = params;
  child.stdin.write(`${JSON.stringify(request)}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const output = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
output.on("line", (line) => {
  try {
    push(JSON.parse(line));
  } catch (error) {
    fail(new Error(`fixture emitted a non-JSON line: ${line}`, { cause: error }));
  }
});
child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});
child.on("error", fail);

try {
  send(1, "initialize");
  const initialized = await nextWhere((message) => message.id === 1);
  assert(initialized.result?.agentInfo?.name === "codeg-learning-fixture", "initialize response missing agent info");

  send(2, "session/new", { cwd: "/tmp/learning-fixture" });
  const created = await nextWhere((message) => message.id === 2);
  const sessionId = created.result?.sessionId;
  assert(sessionId === "fixture-session-1", "session/new returned an unexpected session id");

  send(3, "session/prompt", {
    sessionId,
    prompt: [{ type: "text", text: "Say hello" }],
  });
  const firstUpdate = await nextWhere(
    (message) =>
      message.method === "session/update" &&
      message.params?.update?.sessionUpdate === "agent_message_chunk",
  );
  assert(firstUpdate.params.update.content.text === "hello ", "first chunk was not preserved");

  const unknownUpdate = await nextWhere(
    (message) =>
      message.method === "session/update" &&
      message.params?.update?.sessionUpdate === "fixture_unknown_update",
  );
  assert(unknownUpdate.params.sessionId === sessionId, "unknown update lost its session id");

  // Cancel after the unknown event but before the second text chunk. This
  // demonstrates that a client can keep diagnostics while still cancelling.
  send(4, "session/cancel", { sessionId });
  const cancelledUpdate = await nextWhere(
    (message) =>
      message.method === "session/update" &&
      message.params?.update?.sessionUpdate === "turn_cancelled",
  );
  assert(cancelledUpdate.params.sessionId === sessionId, "cancel update lost its session id");

  const promptResult = await nextWhere((message) => message.id === 3);
  const cancelResult = await nextWhere((message) => message.id === 4);
  assert(promptResult.result?.status === "cancelled", "prompt did not settle as cancelled");
  assert(cancelResult.result?.status === "cancelled", "cancel request did not settle");

  send(5, "session/cancel", { sessionId });
  const ignoredCancel = await nextWhere((message) => message.id === 5);
  assert(ignoredCancel.result?.status === "ignored", "second cancel was not idempotent");

  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(messages.length === 0, "fixture emitted an unexpected late message after cancel");
  console.log("PASS: JSONL framing, response correlation, unknown update, ordered cancel, and idempotency");
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  if (stderr.trim()) console.error(`fixture stderr: ${stderr.trim()}`);
  child.kill();
  process.exitCode = 1;
} finally {
  child.stdin.end();
  output.close();
}

await new Promise((resolve) => child.once("close", resolve));
