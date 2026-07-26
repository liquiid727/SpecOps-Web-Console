// @vitest-environment node
import http from "node:http";
import { describe, expect, it, vi } from "vitest";
import type { AppStateV3, GitDiffResponse, GitStatusResponse, TranscriptEvent, TranscriptPage } from "../shared/types.js";
import { createApplication } from "./application.js";
import { createServer } from "./http-server.js";
import type { Application, ApplicationDependencies, PtyProcess } from "./ports.js";

const emptyState: AppStateV3 = { workspaces: [], profiles: [], sessions: [] };

function createDependencies(overrides: Partial<ApplicationDependencies> = {}) {
  const calls: string[] = [];
  const state = structuredClone(emptyState);
  const transcripts = new Map<string, TranscriptEvent[]>();
  const process: PtyProcess = {
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    onData: vi.fn(),
    onExit: vi.fn()
  };
  const dependencies: ApplicationDependencies = {
    stateRepository: {
      load: vi.fn(async () => state),
      save: vi.fn(async () => { calls.push("save"); }),
      drain: vi.fn(async () => { calls.push("state-drain"); })
    },
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
      drain: vi.fn(async () => { calls.push("transcript-drain"); })
    },
    ptyRuntime: { spawn: vi.fn(() => process), shutdown: vi.fn(async () => { calls.push("pty-shutdown"); }) },
    filesystem: {
      stat: vi.fn(async () => ({ isDirectory: () => true })),
      access: vi.fn(async () => undefined),
      readFile: vi.fn(async () => Buffer.from("")),
      realpath: vi.fn(async (target: string) => target),
      readdir: vi.fn(async () => [])
    },
    gitInspector: {
      available: false,
      status: vi.fn(async (): Promise<GitStatusResponse> => ({ repository: false, clean: true, entries: [], truncated: false })),
      diff: vi.fn(async (_workspacePath, scope): Promise<GitDiffResponse> => ({ scope, files: [], truncated: false, originalBytes: 0, shownLines: 0 }))
    },
    directoryPicker: { available: false, pick: vi.fn(async () => ({ cancelled: true })) },
    profileAdapters: { availableAdapterIds: ["generic"] },
    clock: { now: vi.fn(() => "2026-01-01T00:00:00Z") },
    idGenerator: { create: vi.fn((prefix) => `${prefix}-fixed`) },
    policy: { readonly: false, processEnvironment: {} },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides
  };
  return { calls, dependencies, process, state, transcripts };
}

function post(port: number, pathname: string, body: unknown) {
  return send(port, pathname, "POST", body);
}

function patch(port: number, pathname: string, body: unknown) {
  return send(port, pathname, "PATCH", body);
}

function get(port: number, pathname: string) {
  return send(port, pathname, "GET");
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

function request(port: number, pathname: string) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path: pathname }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
    }).on("error", reject);
  });
}

describe("application composition", () => {
  it("constructs from injected dependencies and does not listen", async () => {
    const { dependencies } = createDependencies();
    const application = await createApplication(dependencies);

    expect(dependencies.stateRepository.load).toHaveBeenCalledOnce();
    expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
    expect(dependencies.filesystem.readFile).not.toHaveBeenCalled();
    await application.close();
  });

  it("exposes a JSON health endpoint outside the static fallback", async () => {
    const { dependencies } = createDependencies({ policy: { readonly: true, processEnvironment: {} } });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    try {
      const health = await get(address.port, "/health");

      expect(health.status).toBe(200);
      expect(health.json).toEqual({ status: "ok", service: "session-manager", readonly: true, timestamp: "2026-01-01T00:00:00Z" });
      expect(dependencies.filesystem.readFile).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("renews expired picker intents through state and rejects stale intents clearly", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    let sequence = 0;
    const picker = { available: true, pick: vi.fn(async () => ({ cancelled: true as const })) };
    const { dependencies } = createDependencies({
      directoryPicker: picker,
      idGenerator: { create: vi.fn((prefix) => `${prefix}-${++sequence}`) },
      policy: { readonly: false, processEnvironment: {}, pickerIntentTtlMs: 60_000 }
    });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    try {
      const initial = await get(address.port, "/api/state");
      vi.advanceTimersByTime(60_001);
      const refreshed = await get(address.port, "/api/state");

      expect(refreshed.json.pickerIntentToken).not.toBe(initial.json.pickerIntentToken);
      const stale = await post(address.port, "/api/workspaces/pick", { intentToken: initial.json.pickerIntentToken });
      expect(stale.status).toBe(403);
      expect(stale.json.error.code).toBe("PICKER_INTENT_INVALID");

      const cancelled = await post(address.port, "/api/workspaces/pick", { intentToken: refreshed.json.pickerIntentToken });
      expect(cancelled.status).toBe(200);
      expect(cancelled.json.cancelled).toBe(true);
      expect(picker.pick).toHaveBeenCalledOnce();
    } finally {
      await server.close();
      vi.useRealTimers();
    }
  });

  it("stops active PTYs and drains persistence during idempotent shutdown", async () => {
    const { calls, dependencies, state } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    state.sessions.push({ id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Session", interactionMode: "terminal", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1000, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    await new Promise<void>((resolve, reject) => {
      const payload = Buffer.from(JSON.stringify({ confirmed: true }));
      const req = http.request({ host: address.host, port: address.port, path: "/api/sessions/session-1/start", method: "POST", headers: { "content-type": "application/json", "content-length": payload.length } }, (response) => {
        response.resume();
        response.on("end", () => response.statusCode === 200 ? resolve() : reject(new Error(`unexpected start status ${response.statusCode}`)));
      });
      req.on("error", reject);
      req.end(payload);
    });
    expect(dependencies.ptyRuntime.spawn).toHaveBeenCalledOnce();
    expect(state.sessions[0].runtimeStatus).toBe("running");
    await Promise.all([server.close(), server.close()]);

    expect(dependencies.ptyRuntime.shutdown).toHaveBeenCalledOnce();
    expect(dependencies.stateRepository.drain).toHaveBeenCalledOnce();
    expect(dependencies.transcriptRepository.drain).toHaveBeenCalledOnce();
    expect(state.sessions[0].runtimeStatus).toBe("stopped");
    expect(calls).toContain("save");
    expect(calls.indexOf("save")).toBeLessThan(calls.indexOf("state-drain"));
  });

  it("applies session lifecycle metadata with optimistic revisions", async () => {
    const { dependencies, state } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    state.sessions.push({ id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Session", interactionMode: "terminal", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1000, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    const renamed = await patch(address.port, "/api/sessions/session-1", { expectedRevision: 1, name: "Renamed" });
    expect(renamed.status).toBe(200);
    expect(renamed.json).toMatchObject({ name: "Renamed", revision: 2, runtimeStatus: "stopped", organizationStatus: "active" });

    const conflict = await post(address.port, "/api/sessions/session-1/pin", { expectedRevision: 1, pinned: true });
    expect(conflict.status).toBe(409);
    expect(conflict.json.error.code).toBe("SESSION_REVISION_CONFLICT");

    const pinned = await post(address.port, "/api/sessions/session-1/pin", { expectedRevision: 2, pinned: true });
    expect(pinned.json).toMatchObject({ pinned: true, revision: 3 });
    const completed = await post(address.port, "/api/sessions/session-1/complete", { expectedRevision: 3 });
    expect(completed.json).toMatchObject({ organizationStatus: "completed", revision: 4 });
    const restored = await post(address.port, "/api/sessions/session-1/restore", { expectedRevision: 4 });
    expect(restored.json).toMatchObject({ organizationStatus: "active", revision: 5 });
    await server.close();
  });

  it("persists composer submissions and replays transcripts", async () => {
    const { dependencies, process, state } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    state.sessions.push({ id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Session", interactionMode: "terminal", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1000, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    const sent = await post(address.port, "/api/sessions/session-1/messages", { clientMessageId: "client-1", content: "hello", startIfStopped: true, confirmedStart: true });
    expect(sent.status).toBe(202);
    expect(sent.json).toMatchObject({ duplicate: false, event: { kind: "user_input", raw: "hello", clientMessageId: "client-1" }, runtimeStatus: "running" });
    expect(process.write).toHaveBeenCalledWith("hello\r");

    const duplicate = await post(address.port, "/api/sessions/session-1/messages", { clientMessageId: "client-1", content: "hello", startIfStopped: true, confirmedStart: true });
    expect(duplicate.json).toMatchObject({ duplicate: true, event: { clientMessageId: "client-1" } });
    expect(process.write).toHaveBeenCalledTimes(1);

    const replay = await get(address.port, "/api/sessions/session-1/transcript");
    const inputEvents = replay.json.events.filter((event: { kind: string }) => event.kind === "user_input");
    expect(inputEvents).toHaveLength(1);
    expect(inputEvents[0]).toMatchObject({ kind: "user_input", raw: "hello" });
    await server.close();
  });

  it("coalesces high-frequency PTY output into one transcript event", async () => {
    const { dependencies, process, state, transcripts } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    state.sessions.push({ id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Session", interactionMode: "terminal", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1000, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    try {
      await post(address.port, "/api/sessions/session-1/start", { confirmed: true });
      const onData = vi.mocked(process.onData).mock.calls[0]?.[0];
      expect(onData).toBeDefined();
      onData?.("\u001b[2Jfirst");
      onData?.(" second\r\n");
      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputEvents = (transcripts.get("session-1") ?? []).filter((event) => event.kind === "pty_output");
      expect(outputEvents).toHaveLength(1);
      expect(outputEvents[0].raw).toBe("\u001b[2Jfirst second\r\n");
    } finally {
      await server.close();
    }
  });

  it("separates stopped creation from confirmed start and serializes duplicate starts", async () => {
    const { dependencies, state } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    const stopped = await post(address.port, "/api/sessions", { name: "Stopped", workspaceId: "workspace-1", profileId: "profile-1", start: false, confirmed: false });
    expect(stopped.status).toBe(201);
    expect(stopped.json.session.runtimeStatus).toBe("stopped");
    expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();

    const rejected = await post(address.port, "/api/sessions", { name: "Unconfirmed", workspaceId: "workspace-1", profileId: "profile-1", start: true, confirmed: false });
    expect(rejected.status).toBe(400);
    expect(state.sessions).toHaveLength(1);

    const sessionId = stopped.json.session.id as string;
    const starts = await Promise.all([
      post(address.port, `/api/sessions/${sessionId}/start`, { confirmed: true }),
      post(address.port, `/api/sessions/${sessionId}/start`, { confirmed: true })
    ]);
    expect(starts.every((result) => result.status === 200)).toBe(true);
    expect(dependencies.ptyRuntime.spawn).toHaveBeenCalledOnce();
    await server.close();
  });

  it("lists and previews workspace files with canonical containment", async () => {
    const { dependencies, state } = createDependencies({
      filesystem: {
        stat: vi.fn(async (target: string) => ({ isDirectory: () => !target.endsWith("README.md") })),
        access: vi.fn(async () => undefined),
        readFile: vi.fn(async () => Buffer.from("# Hello")),
        realpath: vi.fn(async (target: string) => target),
        readdir: vi.fn(async () => [{ name: "README.md", type: "file" }])
      }
    });
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    const files = await get(address.port, "/api/workspaces/workspace-1/files");
    expect(files.status).toBe(200);
    expect(files.json.entries).toEqual([{ name: "README.md", path: "README.md", type: "file" }]);

    const preview = await get(address.port, "/api/workspaces/workspace-1/preview?path=README.md");
    expect(preview.json).toMatchObject({ path: "README.md", kind: "text", content: "# Hello", truncated: false });

    const escape = await get(address.port, "/api/workspaces/workspace-1/preview?path=../secret.txt");
    expect(escape.status).toBe(400);
    expect(escape.json.error.code).toBe("WORKSPACE_PATH_ESCAPE");
    await server.close();
  });

  it("exposes read-only language and git inspection APIs", async () => {
    const status: GitStatusResponse = { repository: true, branch: "feature", clean: false, entries: [{ path: "a.ts", staged: "unmodified", unstaged: "modified", conflicted: false }], truncated: false };
    const diff: GitDiffResponse = { scope: "unstaged", files: [{ oldPath: "a.ts", newPath: "a.ts", status: "modified", hunks: [{ header: "@@ -1 +1 @@", lines: [{ kind: "addition", text: "+new", newLine: 1 }] }] }], truncated: false, originalBytes: 32, shownLines: 1 };
    const { dependencies, state } = createDependencies({
      filesystem: {
        stat: vi.fn(async (target: string) => ({ isDirectory: () => !target.endsWith("a.ts") && !target.endsWith("b.md") })),
        access: vi.fn(async () => undefined),
        readFile: vi.fn(async (target: string) => Buffer.from(target.endsWith(".ts") ? "const a = 1;" : "# doc")),
        realpath: vi.fn(async (target: string) => target),
        readdir: vi.fn(async () => [{ name: "a.ts", type: "file" }, { name: "b.md", type: "file" }])
      },
      gitInspector: { available: true, status: vi.fn(async () => status), diff: vi.fn(async () => diff) }
    });
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    expect((await get(address.port, "/api/workspaces/workspace-1/languages")).json.entries).toMatchObject([{ language: "TypeScript", files: 1 }, { language: "Markdown", files: 1 }]);
    expect((await get(address.port, "/api/workspaces/workspace-1/git/status")).json).toMatchObject({ repository: true, branch: "feature", clean: false });
    expect((await get(address.port, "/api/workspaces/workspace-1/git/diff?scope=unstaged")).json).toMatchObject({ scope: "unstaged", shownLines: 1 });
    await server.close();
  });
});

describe("HTTP server lifecycle", () => {
  it("binds only on listen, delegates requests, and closes the application", async () => {
    const application: Application = {
      handleHttp: vi.fn(async (_request, response) => {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end("ok");
      }),
      handleWebSocket: vi.fn(),
      close: vi.fn(async () => undefined)
    };
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, requestIdFactory: () => "request-test" });
    const address = await server.listen();
    const response = await request(address.port, "/health");

    expect(address.host).toBe("127.0.0.1");
    expect(address.port).toBeGreaterThan(0);
    expect(response).toEqual({ status: 200, body: "ok" });
    expect(application.handleHttp).toHaveBeenCalledOnce();
    await server.close();
    expect(application.close).toHaveBeenCalledOnce();
  });
});
