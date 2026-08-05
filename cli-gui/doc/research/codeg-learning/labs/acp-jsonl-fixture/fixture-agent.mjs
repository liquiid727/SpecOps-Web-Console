import readline from "node:readline";

const sessionId = "fixture-session-1";
const pendingTurns = new Map();
let outputQueue = Promise.resolve();

function sendJson(value, { fragmented = false } = {}) {
  const wire = `${JSON.stringify(value)}\n`;
  outputQueue = outputQueue.then(
    () =>
      new Promise((resolve) => {
        if (!fragmented) {
          process.stdout.write(wire, resolve);
          return;
        }

        // Deliberately split one JSON line. The client must frame by newline,
        // not by assuming that one stdout chunk is one protocol message.
        const pivot = Math.max(1, Math.floor(wire.length / 2));
        process.stdout.write(wire.slice(0, pivot));
        setTimeout(() => process.stdout.write(wire.slice(pivot), resolve), 2);
      }),
  );
}

function response(id, result) {
  sendJson({ jsonrpc: "2.0", id, result });
}

function update(session, update) {
  sendJson({
    jsonrpc: "2.0",
    method: "session/update",
    params: { sessionId: session, update },
  });
}

function startPrompt(request) {
  const current = {
    requestId: request.id,
    sessionId: request.params?.sessionId,
    timers: [],
  };
  pendingTurns.set(current.sessionId, current);

  update(current.sessionId, {
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text: "hello " },
  });

  // An unknown update is intentional. A resilient client should retain a
  // diagnostic and continue rather than crash on a newer update kind.
  current.timers.push(
    setTimeout(
      () =>
        update(current.sessionId, {
          sessionUpdate: "fixture_unknown_update",
          payload: { source: "learning-fixture" },
        }),
      10,
    ),
  );

  current.timers.push(
    setTimeout(
      () =>
        update(current.sessionId, {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "world" },
        }),
      40,
    ),
  );

  current.timers.push(
    setTimeout(() => {
      pendingTurns.delete(current.sessionId);
      update(current.sessionId, { sessionUpdate: "turn_complete" });
      response(current.requestId, { status: "completed" });
    }, 70),
  );
}

function cancelSession(request) {
  const session = request.params?.sessionId;
  const current = pendingTurns.get(session);

  if (!current) {
    response(request.id, { status: "ignored", reason: "no-active-turn" });
    return;
  }

  for (const timer of current.timers) clearTimeout(timer);
  pendingTurns.delete(session);
  update(session, { sessionUpdate: "turn_cancelled" });
  response(current.requestId, { status: "cancelled" });
  response(request.id, { status: "cancelled" });
}

function handle(request) {
  if (request?.jsonrpc !== "2.0" || typeof request.method !== "string") {
    response(request?.id ?? null, { error: "invalid-jsonrpc-request" });
    return;
  }

  switch (request.method) {
    case "initialize":
      response(request.id, {
        protocolVersion: 1,
        agentInfo: { name: "codeg-learning-fixture", version: "0.1.0" },
        agentCapabilities: { loadSession: false },
      });
      break;
    case "session/new":
      response(request.id, { sessionId });
      break;
    case "session/prompt":
      startPrompt(request);
      break;
    case "session/cancel":
      cancelSession(request);
      break;
    default:
      response(request.id, { error: `unknown-method:${request.method}` });
  }
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", (line) => {
  try {
    handle(JSON.parse(line));
  } catch {
    response(null, { error: "invalid-json-line" });
  }
});
