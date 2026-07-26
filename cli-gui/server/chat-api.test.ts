// @vitest-environment node
// chat API 接线集成测试（issue-006；api-spec §2.2/§2.4/§2.6/§4.2/§5、test-spec §3.5）
// 假 CLI 驱动（test-spec §3.6）：不依赖真实 codex/claude。
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import type { AppStateV3, TranscriptEvent, TranscriptPage } from "../shared/types.js";
import { createApplication } from "./application.js";
import { createServer } from "./http-server.js";
import { createProfileAdapterRegistry } from "./profile-adapters.js";
import type { ApplicationDependencies, ParsedTurnEvent, PtyProcess, PtyRuntime, TurnConfig, TurnParseResult } from "./ports.js";

const emptyState: AppStateV3 = { workspaces: [], profiles: [], sessions: [] };

let fixtureDir = "";
let echoScript = "";
let sleepScript = "";
let claudeScript = "";

beforeAll(async () => {
  fixtureDir = await mkdtemp(path.join(tmpdir(), "chat-api-fake-cli-"));
  echoScript = path.join(fixtureDir, "echo.cjs");
  sleepScript = path.join(fixtureDir, "sleep.cjs");
  claudeScript = path.join(fixtureDir, "claude.cjs");
  await writeFile(echoScript, 'const token = process.argv[2] || "t-1";\nconsole.log("assistant says hi");\nconsole.log("token:" + token);\n');
  await writeFile(sleepScript, 'console.log("still working");\nsetTimeout(() => {}, Number(process.argv[2] || "5000"));\n');
  // 假 claude CLI：按 stream-json 行协议输出；--resume 有无决定 session_id 递进（test-spec §3.6）
  await writeFile(claudeScript, [
    'const resumeIndex = process.argv.indexOf("--resume");',
    'const resumed = resumeIndex >= 0 ? process.argv[resumeIndex + 1] : "";',
    'const sid = resumed ? "sess-2" : "sess-1";',
    'console.log(JSON.stringify({ type: "system", subtype: "init", session_id: sid }));',
    'console.log(JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: resumed ? "resumed:" + resumed : "claude first reply" }] }, session_id: sid }));',
    'console.log(JSON.stringify({ type: "result", subtype: "success", session_id: sid, usage: { input_tokens: 1, output_tokens: 2 } }));',
    ""
  ].join("\n"));
});

afterAll(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

// 行协议：普通行 → assistant_message；"token:x" 行 → resumeToken
async function* parseLines(stdout: Readable): AsyncGenerator<ParsedTurnEvent, TurnParseResult, void> {
  const result: TurnParseResult = {};
  let buffered = "";
  const emit = (line: string): ParsedTurnEvent | undefined => {
    if (!line.trim()) return undefined;
    if (line.startsWith("token:")) {
      result.resumeToken = line.slice("token:".length).trim();
      return undefined;
    }
    return { kind: "assistant_message", source: "profile-adapter", raw: line };
  };
  for await (const chunk of stdout) {
    buffered += chunk.toString("utf8");
    let index = buffered.indexOf("\n");
    while (index !== -1) {
      const event = emit(buffered.slice(0, index));
      buffered = buffered.slice(index + 1);
      if (event) yield event;
      index = buffered.indexOf("\n");
    }
  }
  const tail = emit(buffered);
  if (tail) yield tail;
  return result;
}

function createChatDependencies(overrides: Partial<ApplicationDependencies> = {}) {
  const state = structuredClone(emptyState);
  const transcripts = new Map<string, TranscriptEvent[]>();
  const turnConfigs: TurnConfig[] = [];
  const counters = new Map<string, number>();
  state.workspaces.push({ id: "workspace-1", name: "Workspace", path: fixtureDir, kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
  state.profiles.push({ id: "profile-chat", name: "Chat CLI", command: "fake-chat", args: [], adapterId: "codex", createdAt: "2026-01-01T00:00:00Z" });
  state.profiles.push({ id: "profile-generic", name: "Generic CLI", command: "fake-generic", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
  const capabilitiesFor = (adapterId: "claude-code" | "codex" | "generic") => ({
    adapterId,
    compatibility: "supported" as const,
    permissions: [],
    modes: [],
    models: [
      { id: "model-a", labelKey: "model.a", requiresRestart: false },
      { id: "model-b", labelKey: "model.b", requiresRestart: false }
    ],
    supportsComposer: true,
    supportsStructuredRecognition: adapterId === "codex",
    supportsHeadlessTurns: adapterId === "codex",
    supportsResume: adapterId === "codex",
    supportsApproval: false
  });
  const dependencies: ApplicationDependencies = {
    stateRepository: { load: vi.fn(async () => state), save: vi.fn(async () => undefined), drain: vi.fn(async () => undefined) },
    transcriptRepository: {
      append: vi.fn(async (input) => {
        const events = transcripts.get(input.sessionId) ?? [];
        const event: TranscriptEvent = {
          id: `event-${input.sessionId}-${events.length + 1}`,
          sessionId: input.sessionId,
          sequence: events.length + 1,
          occurredAt: input.occurredAt,
          kind: input.kind,
          source: input.source,
          raw: input.raw,
          rawBytes: Buffer.byteLength(input.raw),
          truncated: false,
          metadata: input.metadata,
          clientMessageId: input.clientMessageId
        };
        events.push(event);
        transcripts.set(input.sessionId, events);
        return event;
      }),
      list: vi.fn(async (sessionId, options = {}): Promise<TranscriptPage> => {
        const after = options.afterSequence ?? 0;
        const events = (transcripts.get(sessionId) ?? []).filter((event) => event.sequence > after);
        return { events, hasMore: false, nextAfterSequence: events.at(-1)?.sequence ?? after, visibleStartSequence: 1, retentionTruncated: false };
      }),
      latest: vi.fn(async (sessionId) => transcripts.get(sessionId)?.at(-1)),
      delete: vi.fn(async (sessionId) => { transcripts.delete(sessionId); }),
      drain: vi.fn(async () => undefined)
    },
    ptyRuntime: { spawn: vi.fn(() => { throw new Error("chat turns must not spawn a PTY"); }), shutdown: vi.fn(async () => undefined) },
    filesystem: {
      stat: vi.fn(async () => ({ isDirectory: () => true })),
      access: vi.fn(async () => undefined),
      readFile: vi.fn(async () => Buffer.from("")),
      realpath: vi.fn(async (target: string) => target),
      readdir: vi.fn(async () => [])
    },
    gitInspector: {
      available: false,
      status: vi.fn(async () => ({ repository: false, clean: true, entries: [], truncated: false })),
      diff: vi.fn(async (_workspacePath, scope) => ({ scope, files: [], truncated: false, originalBytes: 0, shownLines: 0 }))
    },
    directoryPicker: { available: false, pick: vi.fn(async () => ({ cancelled: true as const })) },
    profileAdapters: {
      availableAdapterIds: ["codex", "generic"],
      capabilities: async (profile) => capabilitiesFor(profile.adapterId),
      resolveLaunch: async (profile) => ({ command: profile.command, args: [...profile.args], capabilities: capabilitiesFor(profile.adapterId) }),
      buildTurn: async (_profile, config) => {
        turnConfigs.push(config);
        if (config.prompt.startsWith("sleep")) return { command: process.execPath, args: [sleepScript, "10000"], env: { PATH: process.env.PATH ?? "" } };
        return { command: process.execPath, args: [echoScript, config.resumeToken ? `resumed-${config.resumeToken}` : "thread-1"], env: { PATH: process.env.PATH ?? "" } };
      },
      parseEvents: (_profile, stream) => parseLines(stream)
    },
    clock: { now: vi.fn(() => new Date().toISOString()) },
    idGenerator: { create: vi.fn((prefix: string) => { const next = (counters.get(prefix) ?? 0) + 1; counters.set(prefix, next); return `${prefix}-${next}`; }) },
    policy: { readonly: false, processEnvironment: {} },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides
  };
  return { dependencies, state, transcripts, turnConfigs };
}

async function startServer(dependencies: ApplicationDependencies) {
  const application = await createApplication(dependencies);
  const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
  const address = await server.listen();
  return { server, port: address.port };
}

function send(port: number, pathname: string, method: string, body?: unknown) {
  return new Promise<{ status: number; json: any }>((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: pathname,
      method,
      headers: payload ? { "content-type": "application/json", "content-length": payload.length } : undefined
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({ status: response.statusCode ?? 0, json: text ? JSON.parse(text) : undefined });
      });
    });
    req.on("error", reject);
    req.end(payload);
  });
}

const post = (port: number, pathname: string, body: unknown) => send(port, pathname, "POST", body);
const patch = (port: number, pathname: string, body: unknown) => send(port, pathname, "PATCH", body);
const get = (port: number, pathname: string) => send(port, pathname, "GET");

async function waitFor(predicate: () => boolean | Promise<boolean>, timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (!(await predicate())) {
    if (Date.now() - startedAt > timeoutMs) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

const turnEnded = (events: TranscriptEvent[] | undefined, turnId: string) =>
  (events ?? []).some((event) => event.kind === "lifecycle" && typeof event.metadata?.status === "string" && String(event.metadata.status).startsWith("turn-") && event.metadata?.turnId === turnId);

describe("chat API wiring", () => {
  it("creates sessions defaulting to chat, downgrades unsupported profiles, and keeps the mode immutable", async () => {
    const { dependencies } = createChatDependencies();
    const { server, port } = await startServer(dependencies);
    try {
      const chat = await post(port, "/api/sessions", { name: "Chat", workspaceId: "workspace-1", profileId: "profile-chat" });
      expect(chat.status).toBe(201);
      expect(chat.json.interactionMode).toBe("chat");
      expect(chat.json.interactionModeDowngraded).toBeUndefined();

      const terminal = await post(port, "/api/sessions", { name: "Term", workspaceId: "workspace-1", profileId: "profile-chat", interactionMode: "terminal" });
      expect(terminal.json.interactionMode).toBe("terminal");
      expect(terminal.json.interactionModeDowngraded).toBeUndefined();

      const downgraded = await post(port, "/api/sessions", { name: "Down", workspaceId: "workspace-1", profileId: "profile-generic", interactionMode: "chat" });
      expect(downgraded.status).toBe(201);
      expect(downgraded.json.interactionMode).toBe("terminal");
      expect(downgraded.json.interactionModeDowngraded).toBe(true);

      const invalid = await post(port, "/api/sessions", { name: "Bad", workspaceId: "workspace-1", profileId: "profile-chat", interactionMode: "voice" });
      expect(invalid.status).toBe(400);
      expect(invalid.json.error.code).toBe("VALIDATION_FAILED");

      const immutable = await patch(port, `/api/sessions/${chat.json.id}`, { expectedRevision: chat.json.revision, interactionMode: "terminal" });
      expect(immutable.status).toBe(400);
      expect(immutable.json.error.code).toBe("VALIDATION_FAILED");
    } finally {
      await server.close();
    }
  });

  it("runs a chat turn end to end without a PTY, persists resumeToken, and keeps clientMessageId idempotent", async () => {
    const { dependencies, state, transcripts, turnConfigs } = createChatDependencies();
    const { server, port } = await startServer(dependencies);
    try {
      const created = await post(port, "/api/sessions", { name: "Chat", workspaceId: "workspace-1", profileId: "profile-chat" });
      const sessionId = created.json.id as string;

      const sent = await post(port, `/api/sessions/${sessionId}/messages`, { clientMessageId: "client-1", content: "hello", startIfStopped: true, confirmedStart: true });
      expect(sent.status).toBe(202);
      expect(sent.json).toMatchObject({ duplicate: false, runtimeStatus: "running", event: { kind: "user_message", raw: "hello", clientMessageId: "client-1" } });
      expect(typeof sent.json.turnId).toBe("string");
      expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();

      await waitFor(() => turnEnded(transcripts.get(sessionId), sent.json.turnId));
      const events = transcripts.get(sessionId)!;
      expect(events.some((event) => event.kind === "assistant_message" && event.raw === "assistant says hi")).toBe(true);
      expect(events.find((event) => event.metadata?.status === "turn-completed")?.metadata?.turnId).toBe(sent.json.turnId);
      const session = state.sessions.find((item) => item.id === sessionId)!;
      expect(session.chatContext?.resumeToken).toBe("thread-1");

      const duplicate = await post(port, `/api/sessions/${sessionId}/messages`, { clientMessageId: "client-1", content: "hello" });
      expect(duplicate.status).toBe(202);
      expect(duplicate.json).toMatchObject({ duplicate: true, turnId: sent.json.turnId, event: { clientMessageId: "client-1" } });

      // 第二轮：resumeToken 经 buildTurn 注入（adapter-spec §2.1 原生续聊）
      const second = await post(port, `/api/sessions/${sessionId}/messages`, { clientMessageId: "client-2", content: "again" });
      expect(second.status).toBe(202);
      await waitFor(() => turnEnded(transcripts.get(sessionId), second.json.turnId));
      expect(turnConfigs.at(-1)?.resumeToken).toBe("thread-1");
    } finally {
      await server.close();
    }
  });

  it("enforces turn mutex and accepts cancellation per api-spec §2.4", async () => {
    const { dependencies, transcripts } = createChatDependencies();
    const { server, port } = await startServer(dependencies);
    try {
      const created = await post(port, "/api/sessions", { name: "Chat", workspaceId: "workspace-1", profileId: "profile-chat" });
      const sessionId = created.json.id as string;
      const first = await post(port, `/api/sessions/${sessionId}/messages`, { clientMessageId: "client-1", content: "sleep for a while", startIfStopped: true, confirmedStart: true });
      expect(first.status).toBe(202);

      const busy = await post(port, `/api/sessions/${sessionId}/messages`, { clientMessageId: "client-2", content: "too early" });
      expect(busy.status).toBe(409);
      expect(busy.json.error.code).toBe("TURN_IN_PROGRESS");

      const cancelled = await post(port, `/api/sessions/${sessionId}/turns/cancel`, { turnId: first.json.turnId });
      expect(cancelled.status).toBe(202);
      expect(cancelled.json).toEqual({ turnId: first.json.turnId });

      await waitFor(() => turnEnded(transcripts.get(sessionId), first.json.turnId));
      expect((transcripts.get(sessionId) ?? []).some((event) => event.metadata?.code === "TURN_CANCELLED")).toBe(true);

      const again = await post(port, `/api/sessions/${sessionId}/turns/cancel`, { turnId: first.json.turnId });
      expect(again.status).toBe(409);
      expect(again.json.error.code).toBe("TURN_NOT_ACTIVE");
    } finally {
      await server.close();
    }
  });

  it("rejects mode-mismatched turn, resize, and activeModel operations", async () => {
    const { dependencies } = createChatDependencies();
    const { server, port } = await startServer(dependencies);
    try {
      const terminal = await post(port, "/api/sessions", { name: "Term", workspaceId: "workspace-1", profileId: "profile-chat", interactionMode: "terminal" });
      const cancel = await post(port, `/api/sessions/${terminal.json.id}/turns/cancel`, { turnId: "turn-x" });
      expect(cancel.status).toBe(400);
      expect(cancel.json.error.code).toBe("INTERACTION_MODE_MISMATCH");

      const chat = await post(port, "/api/sessions", { name: "Chat", workspaceId: "workspace-1", profileId: "profile-chat" });
      const resize = await post(port, `/api/sessions/${chat.json.id}/resize`, { cols: 80, rows: 24 });
      expect(resize.status).toBe(400);
      expect(resize.json.error.code).toBe("INTERACTION_MODE_MISMATCH");

      const model = await patch(port, `/api/sessions/${terminal.json.id}`, { expectedRevision: terminal.json.revision, activeModel: "model-a" });
      expect(model.status).toBe(400);
      expect(model.json.error.code).toBe("INTERACTION_MODE_MISMATCH");
    } finally {
      await server.close();
    }
  });

  it("updates activeModel through PATCH with capability validation", async () => {
    const { dependencies, state } = createChatDependencies();
    const { server, port } = await startServer(dependencies);
    try {
      const chat = await post(port, "/api/sessions", { name: "Chat", workspaceId: "workspace-1", profileId: "profile-chat" });
      const updated = await patch(port, `/api/sessions/${chat.json.id}`, { expectedRevision: chat.json.revision, activeModel: "model-b" });
      expect(updated.status).toBe(200);
      expect(state.sessions.find((item) => item.id === chat.json.id)?.chatContext?.activeModel).toBe("model-b");

      const rejected = await patch(port, `/api/sessions/${chat.json.id}`, { expectedRevision: updated.json.revision, activeModel: "model-z" });
      expect(rejected.status).toBe(400);
      expect(rejected.json.error.code).toBe("CLI_OPTION_UNSUPPORTED");
    } finally {
      await server.close();
    }
  });

  it("broadcasts turn-status frames on the events channel without payload content", async () => {
    const { dependencies } = createChatDependencies();
    const { server, port } = await startServer(dependencies);
    try {
      const created = await post(port, "/api/sessions", { name: "Chat", workspaceId: "workspace-1", profileId: "profile-chat" });
      const sessionId = created.json.id as string;

      const frames: any[] = [];
      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?sessionId=${sessionId}&channel=events`);
      socket.on("message", (data) => frames.push(JSON.parse(String(data))));
      await new Promise<void>((resolve, reject) => {
        socket.once("open", () => resolve());
        socket.once("error", reject);
      });
      await waitFor(() => frames.some((frame) => frame.type === "subscription-ready"));

      const sent = await post(port, `/api/sessions/${sessionId}/messages`, { clientMessageId: "client-1", content: "hello", startIfStopped: true, confirmedStart: true });
      await waitFor(() => frames.some((frame) => frame.type === "turn-status" && frame.status === "completed"));

      const statuses = frames.filter((frame) => frame.type === "turn-status" && frame.turnId === sent.json.turnId);
      expect(statuses.map((frame) => frame.status)).toEqual(["running", "completed"]);
      expect(statuses.every((frame) => !("event" in frame) && !("raw" in frame))).toBe(true);
      socket.close();
    } finally {
      await server.close();
    }
  });

  it("blocks turn cancellation in readonly mode", async () => {
    const { dependencies } = createChatDependencies();
    dependencies.policy = { readonly: true, processEnvironment: {} };
    const { server, port } = await startServer(dependencies);
    try {
      const blocked = await post(port, "/api/sessions/session-x/turns/cancel", { turnId: "turn-1" });
      expect(blocked.status).toBe(403);
      expect(blocked.json.error.code).toBe("READONLY_MODE");
    } finally {
      await server.close();
    }
  });

  // issue-010：真实 Claude adapter + 假 stream-json CLI 的多轮 resume 集成（adapter-spec §3.2、test-spec §3.3）
  it("runs claude multi-turn chat with resume through the real adapter registry and a fake stream-json CLI", async () => {
    const { dependencies, state, transcripts } = createChatDependencies({ profileAdapters: createProfileAdapterRegistry() });
    state.profiles.push({ id: "profile-claude", name: "Claude", command: process.execPath, args: [claudeScript], adapterId: "claude-code", adapterVersionRange: ">=1.0.0 <100.0.0", createdAt: "2026-01-01T00:00:00Z" });
    const { server, port } = await startServer(dependencies);
    try {
      const created = await post(port, "/api/sessions", { name: "Claude chat", workspaceId: "workspace-1", profileId: "profile-claude" });
      expect(created.status).toBe(201);
      expect(created.json.interactionMode).toBe("chat");
      expect(created.json.interactionModeDowngraded).toBeUndefined();
      const sessionId = created.json.id as string;

      const first = await post(port, `/api/sessions/${sessionId}/messages`, { clientMessageId: "claude-1", content: "hello claude", startIfStopped: true, confirmedStart: true });
      expect(first.status).toBe(202);
      await waitFor(() => turnEnded(transcripts.get(sessionId), first.json.turnId));
      let events = transcripts.get(sessionId)!;
      expect(events.some((event) => event.kind === "assistant_message" && event.raw === "claude first reply")).toBe(true);
      expect(state.sessions.find((item) => item.id === sessionId)?.chatContext?.resumeToken).toBe("sess-1");

      // 第二轮：--resume sess-1 经真实 buildTurn 注入，假 CLI 回显验证
      const second = await post(port, `/api/sessions/${sessionId}/messages`, { clientMessageId: "claude-2", content: "continue" });
      expect(second.status).toBe(202);
      await waitFor(() => turnEnded(transcripts.get(sessionId), second.json.turnId));
      events = transcripts.get(sessionId)!;
      expect(events.some((event) => event.kind === "assistant_message" && event.raw === "resumed:sess-1")).toBe(true);
      expect(state.sessions.find((item) => item.id === sessionId)?.chatContext?.resumeToken).toBe("sess-2");
      // Adapter 不产出 user_message：仅 composer 侧产生的两条
      expect(events.filter((event) => event.kind === "user_message")).toHaveLength(2);
    } finally {
      await server.close();
    }
  });

  // issue-010：generic 降级链路走真实 registry（非假 capabilities）
  it("downgrades generic chat sessions to terminal through the real adapter registry", async () => {
    const { dependencies, state } = createChatDependencies({ profileAdapters: createProfileAdapterRegistry() });
    state.profiles.push({ id: "profile-generic-real", name: "Generic real", command: process.execPath, args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    const { server, port } = await startServer(dependencies);
    try {
      const downgraded = await post(port, "/api/sessions", { name: "Generic", workspaceId: "workspace-1", profileId: "profile-generic-real", interactionMode: "chat" });
      expect(downgraded.status).toBe(201);
      expect(downgraded.json.interactionMode).toBe("terminal");
      expect(downgraded.json.interactionModeDowngraded).toBe(true);
      expect(state.sessions.find((item) => item.id === downgraded.json.id)?.interactionMode).toBe("terminal");
    } finally {
      await server.close();
    }
  });
});

// issue-011：全局并发上限（决策 D-6，runtime-orchestrator-spec §3.3）与 4 并发零串台（test-spec §4.2）
describe("global session concurrency limit (D-6)", () => {
  // 回显式假 PTY：write 的内容带会话标记回显，驱动 transcript pty_output
  function createFakePtyRuntime(): PtyRuntime {
    return {
      spawn: (options) => {
        let dataListener: ((data: string) => void) | undefined;
        let exitListener: ((event: { exitCode: number }) => void) | undefined;
        const marker = options.args.at(-1) ?? "pty";
        const process: PtyProcess = {
          write: (data) => dataListener?.(`${marker}:${data.trim()}`),
          resize: () => undefined,
          kill: () => exitListener?.({ exitCode: 0 }),
          onData: (listener) => { dataListener = listener; },
          onExit: (listener) => { exitListener = listener; }
        };
        return process;
      },
      shutdown: async () => undefined
    };
  }

  async function createChatSessions(port: number, count: number, prefix = "Quest") {
    const ids: string[] = [];
    for (let index = 1; index <= count; index += 1) {
      const created = await post(port, "/api/sessions", { name: `${prefix} ${index}`, workspaceId: "workspace-1", profileId: "profile-chat" });
      expect(created.status).toBe(201);
      ids.push(created.json.id as string);
    }
    return ids;
  }

  it("rejects the fifth start with 429 SESSION_CONCURRENCY_LIMIT, keeps idempotent starts, and frees a slot on stop", async () => {
    const { dependencies } = createChatDependencies();
    dependencies.policy = { readonly: false, processEnvironment: { SPECOS_MAX_RUNNING_SESSIONS: "4" } };
    const { server, port } = await startServer(dependencies);
    try {
      const ids = await createChatSessions(port, 5);
      for (const id of ids.slice(0, 4)) expect((await post(port, `/api/sessions/${id}/start`, { confirmed: true })).status).toBe(200);

      const rejected = await post(port, `/api/sessions/${ids[4]}/start`, { confirmed: true });
      expect(rejected.status).toBe(429);
      expect(rejected.json.error.code).toBe("SESSION_CONCURRENCY_LIMIT");
      expect(rejected.json.error.details).toMatchObject({ running: 4, limit: 4 });

      // start-and-send 触发启动也受限（api-spec §2.2）
      const sendRejected = await post(port, `/api/sessions/${ids[4]}/messages`, { clientMessageId: "limit-1", content: "hi", startIfStopped: true, confirmedStart: true });
      expect(sendRejected.status).toBe(429);
      expect(sendRejected.json.error.code).toBe("SESSION_CONCURRENCY_LIMIT");

      // 已 running 会话的幂等 start 不受限
      expect((await post(port, `/api/sessions/${ids[0]}/start`, { confirmed: true })).status).toBe(200);

      expect((await post(port, `/api/sessions/${ids[0]}/stop`, {})).status).toBe(200);
      expect((await post(port, `/api/sessions/${ids[4]}/start`, { confirmed: true })).status).toBe(200);
    } finally {
      await server.close();
    }
  });

  it("clamps values below the floor to 4 and falls back to the default on invalid values with a warning", async () => {
    const clamped = createChatDependencies();
    clamped.dependencies.policy = { readonly: false, processEnvironment: { SPECOS_MAX_RUNNING_SESSIONS: "2" } };
    const clampedServer = await startServer(clamped.dependencies);
    try {
      const ids = await createChatSessions(clampedServer.port, 5);
      for (const id of ids.slice(0, 4)) expect((await post(clampedServer.port, `/api/sessions/${id}/start`, { confirmed: true })).status).toBe(200);
      const rejected = await post(clampedServer.port, `/api/sessions/${ids[4]}/start`, { confirmed: true });
      expect(rejected.status).toBe(429);
      expect(rejected.json.error.details).toMatchObject({ running: 4, limit: 4 });
      expect(clamped.dependencies.logger.warn).toHaveBeenCalledWith(expect.stringContaining("below the configuration floor"), expect.objectContaining({ value: "2" }));
    } finally {
      await clampedServer.server.close();
    }

    const invalid = createChatDependencies();
    invalid.dependencies.policy = { readonly: false, processEnvironment: { SPECOS_MAX_RUNNING_SESSIONS: "banana" } };
    const invalidServer = await startServer(invalid.dependencies);
    try {
      const ids = await createChatSessions(invalidServer.port, 5, "Fallback");
      for (const id of ids) expect((await post(invalidServer.port, `/api/sessions/${id}/start`, { confirmed: true })).status).toBe(200);
      expect(invalid.dependencies.logger.warn).toHaveBeenCalledWith(expect.stringContaining("Invalid SPECOS_MAX_RUNNING_SESSIONS"), expect.objectContaining({ value: "banana", limit: 8 }));
    } finally {
      await invalidServer.server.close();
    }
  });

  it("keeps 2 chat + 2 terminal sessions fully isolated under concurrency (test-spec §4.2)", async () => {
    const { dependencies, state, transcripts } = createChatDependencies({ ptyRuntime: createFakePtyRuntime() });
    state.profiles.push({ id: "profile-pty-a", name: "PTY A", command: "fake-pty", args: ["pty-a"], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-pty-b", name: "PTY B", command: "fake-pty", args: ["pty-b"], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    const { server, port } = await startServer(dependencies);
    const sockets: WebSocket[] = [];
    try {
      const [chatA, chatB] = await createChatSessions(port, 2, "Chat");
      const termA = (await post(port, "/api/sessions", { name: "Term A", workspaceId: "workspace-1", profileId: "profile-pty-a", interactionMode: "terminal" })).json.id as string;
      const termB = (await post(port, "/api/sessions", { name: "Term B", workspaceId: "workspace-1", profileId: "profile-pty-b", interactionMode: "terminal" })).json.id as string;
      expect((await post(port, `/api/sessions/${termA}/start`, { confirmed: true })).status).toBe(200);
      expect((await post(port, `/api/sessions/${termB}/start`, { confirmed: true })).status).toBe(200);

      // 每个会话一条 events 订阅，断言 WS 帧无串台
      const wsFrames = new Map<string, any[]>();
      for (const id of [chatA, chatB, termA, termB]) {
        const frames: any[] = [];
        wsFrames.set(id, frames);
        const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?sessionId=${id}&channel=events`);
        sockets.push(socket);
        socket.on("message", (data) => frames.push(JSON.parse(String(data))));
        await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
        await waitFor(() => frames.some((frame) => frame.type === "subscription-ready"));
      }

      // 4 会话并行输入输出：2 chat 轮次 + 2 terminal 消息
      const [sentA, sentB, termSentA, termSentB] = await Promise.all([
        post(port, `/api/sessions/${chatA}/messages`, { clientMessageId: "chat-a-1", content: "alpha task", startIfStopped: true, confirmedStart: true }),
        post(port, `/api/sessions/${chatB}/messages`, { clientMessageId: "chat-b-1", content: "beta task", startIfStopped: true, confirmedStart: true }),
        post(port, `/api/sessions/${termA}/messages`, { clientMessageId: "term-a-1", content: "ls-alpha" }),
        post(port, `/api/sessions/${termB}/messages`, { clientMessageId: "term-b-1", content: "ls-beta" })
      ]);
      for (const sent of [sentA, sentB, termSentA, termSentB]) expect(sent.status).toBe(202);
      await waitFor(() => turnEnded(transcripts.get(chatA), sentA.json.turnId) && turnEnded(transcripts.get(chatB), sentB.json.turnId));
      await waitFor(() => (transcripts.get(termA) ?? []).some((event) => event.kind === "pty_output") && (transcripts.get(termB) ?? []).some((event) => event.kind === "pty_output"));

      // transcript 归属零交叉：sessionId、turnId、pty 标记互不渗透；sequence 各自严格单调
      for (const [id, otherTurnId] of [[chatA, sentB.json.turnId], [chatB, sentA.json.turnId]] as const) {
        const events = transcripts.get(id)!;
        expect(events.every((event) => event.sessionId === id)).toBe(true);
        expect(events.some((event) => event.metadata?.turnId === otherTurnId)).toBe(false);
        expect(events.every((event, index) => index === 0 || event.sequence > events[index - 1].sequence)).toBe(true);
      }
      const termEventsA = transcripts.get(termA)!;
      const termEventsB = transcripts.get(termB)!;
      expect(termEventsA.every((event) => event.sessionId === termA)).toBe(true);
      expect(termEventsB.every((event) => event.sessionId === termB)).toBe(true);
      expect(termEventsA.some((event) => event.kind === "pty_output" && event.raw.includes("pty-a:ls-alpha"))).toBe(true);
      expect(termEventsA.some((event) => event.raw.includes("pty-b") || event.raw.includes("ls-beta"))).toBe(false);
      expect(termEventsB.some((event) => event.kind === "pty_output" && event.raw.includes("pty-b:ls-beta"))).toBe(true);
      expect(termEventsB.some((event) => event.raw.includes("pty-a") || event.raw.includes("ls-alpha"))).toBe(false);

      // WS 事件帧无串台：每路订阅收到的 transcript-event 全部属于自己的会话
      await waitFor(() => (wsFrames.get(chatA) ?? []).some((frame) => frame.type === "transcript-event" && frame.event.metadata?.status === "turn-completed"));
      for (const id of [chatA, chatB, termA, termB]) {
        const eventFrames = (wsFrames.get(id) ?? []).filter((frame) => frame.type === "transcript-event");
        expect(eventFrames.length).toBeGreaterThan(0);
        expect(eventFrames.every((frame) => frame.event.sessionId === id)).toBe(true);
      }
    } finally {
      for (const socket of sockets) socket.close();
      await server.close();
    }
  });
});
