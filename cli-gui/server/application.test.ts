// @vitest-environment node
import http from "node:http";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AppStateV3, GitDiffResponse, GitStatusResponse, TranscriptEvent, TranscriptPage } from "../shared/types.js";
import type { ExecutionAttempt, ExecutionTask } from "../shared/execution-attempt.js";
import { createApplication } from "./application.js";
import { createAgentBackendRegistry, type BackendTurnExecutor } from "./agent-backends.js";
import { createJsonExecutionRepository } from "./execution-store.js";
import { createServer } from "./http-server.js";
import type { Application, ApplicationDependencies, PtyProcess } from "./ports.js";
import { createMemorySecretStore, SecretStoreError } from "./secret-store.js";
import { createJsonStateRepository } from "./store.js";

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
          component: input.component,
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
    // Keep application tests independent from the developer's real CLI config;
    // auto-sync behavior is covered explicitly with a dedicated reader below.
    modelSyncReader: vi.fn(async (profile) => profile.syncedModels ?? []),
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

function put(port: number, pathname: string, body: unknown) {
  return send(port, pathname, "PUT", body);
}

function del(port: number, pathname: string) {
  return send(port, pathname, "DELETE", {});
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

function sendWithHeaders(port: number, pathname: string, method: string, body: unknown, headers: Record<string, string>) {
  return new Promise<{ status: number; json: any }>((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const req = http.request({ host: "127.0.0.1", port, path: pathname, method, headers: { "content-type": "application/json", "content-length": payload.length, ...headers } }, (response) => {
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
    expect(sent.json).toMatchObject({ duplicate: false, event: { kind: "user_message", raw: "hello", clientMessageId: "client-1" }, runtimeStatus: "running" });
    expect(process.write).toHaveBeenCalledWith("\x1b[200~hello\x1b[201~\r");

    const duplicate = await post(address.port, "/api/sessions/session-1/messages", { clientMessageId: "client-1", content: "hello", startIfStopped: true, confirmedStart: true });
    expect(duplicate.json).toMatchObject({ duplicate: true, event: { clientMessageId: "client-1" } });
    expect(process.write).toHaveBeenCalledTimes(1);

    const replay = await get(address.port, "/api/sessions/session-1/transcript");
    const inputEvents = replay.json.events.filter((event: { kind: string }) => event.kind === "user_message");
    expect(inputEvents).toHaveLength(1);
    expect(inputEvents[0]).toMatchObject({ kind: "user_message", raw: "hello" });
    await server.close();
  });

  it("serves a non-fork transcript page directly from the repository", async () => {
    const { dependencies, state } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    state.sessions.push({ id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Session", interactionMode: "chat", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1000, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" });
    const event: TranscriptEvent = { id: "event-11", sessionId: "session-1", sequence: 11, occurredAt: "2026-01-01T00:00:00Z", kind: "user_message", source: "test", raw: "page", rawBytes: 4, truncated: false };
    vi.mocked(dependencies.transcriptRepository.list).mockResolvedValue({ events: [event], hasMore: true, nextAfterSequence: 11, visibleStartSequence: 1, retentionTruncated: false });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    const response = await get(address.port, "/api/sessions/session-1/transcript?afterSequence=10&limit=1");
    expect(response.status).toBe(200);
    expect(response.json).toMatchObject({ events: [event], hasMore: true, nextAfterSequence: 11 });
    expect(dependencies.transcriptRepository.list).toHaveBeenCalledWith("session-1", { afterSequence: 10, limit: 1 });
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

describe("issue 094 legacy session compatibility", () => {
  it("starts a no-route terminal with the legacy model and no deployment identity", async () => {
    const capabilities = {
      adapterId: "generic" as const,
      compatibility: "supported" as const,
      permissions: [], modes: [], models: [],
      supportsComposer: false, supportsStructuredRecognition: false,
      supportsHeadlessTurns: false, supportsResume: false,
      supportsApproval: false, supportsPromptEnhancement: false
    };
    const profileProbe = vi.fn(async () => capabilities);
    const resolveLaunch = vi.fn(async (profile: AppStateV3["profiles"][number], config: { permission: string | null; mode: string | null; model: string | null }) => ({
      command: profile.command,
      args: [...profile.args, ...(config.model ? ["--model", config.model] : [])],
      capabilities
    }));
    const { dependencies, state } = createDependencies({
      profileAdapters: { availableAdapterIds: ["generic"], capabilities: profileProbe, resolveLaunch },
      policy: { readonly: false, processEnvironment: { LEGACY_ENV_CANARY: "legacy-env" } }
    });
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-legacy", name: "Legacy CLI", command: "legacy-cli", args: ["--plain"], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    try {
      const created = await post(address.port, "/api/sessions", {
        name: "Legacy terminal", workspaceId: "workspace-1", profileId: "profile-legacy",
        interactionMode: "terminal", launchConfig: { permission: null, mode: null, model: "legacy-model" },
        start: true, confirmed: true
      });
      expect(created.status).toBe(201);
      const spawn = vi.mocked(dependencies.ptyRuntime.spawn).mock.calls.at(-1)?.[0];
      expect(spawn?.args).toEqual(["--plain", "--model", "legacy-model"]);
      expect(spawn?.env).toMatchObject({ LEGACY_ENV_CANARY: "legacy-env" });
      expect(Object.keys(spawn?.env ?? {})).not.toContain("SPECOS_DEPLOYMENT_ID");
      expect(JSON.stringify({ args: spawn?.args, env: spawn?.env })).not.toContain("deployment");

      const resolved = await post(address.port, `/api/sessions/${created.json.id}/model-route/resolve`, {});
      expect(resolved.status).toBe(200);
      expect(resolved.json.resolvedRoute).toMatchObject({
        kind: "legacy-profile-model",
        legacyResolution: { profileId: "profile-legacy", modelId: "legacy-model", source: "launch-config" },
        candidates: [], executableCandidates: [], canSend: true
      });
      expect(resolved.json.resolvedRoute).not.toHaveProperty("selectedDeploymentId");
      expect(profileProbe).not.toHaveBeenCalled();
      expect(state.modelDeployments).toEqual([]);
    } finally {
      await server.close();
    }
  });

  it("returns PROFILE_NOT_FOUND when an existing legacy session has a dangling profile", async () => {
    const { dependencies, state } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.sessions.push({
      id: "dangling-profile-session", workspaceId: "workspace-1", profileId: "profile-deleted", name: "Dangling profile",
      interactionMode: "terminal", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1,
      launchConfig: { permission: null, mode: null, model: null }, revision: 1,
      createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z"
    });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    try {
      const started = await post(address.port, "/api/sessions/dangling-profile-session/start", { confirmed: true });
      expect(started.status).toBe(404);
      expect(started.json.error).toMatchObject({ code: "PROFILE_NOT_FOUND" });
      expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("returns WORKSPACE_NOT_FOUND when an existing legacy session has a dangling workspace", async () => {
    const { dependencies, state } = createDependencies();
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    state.sessions.push({
      id: "dangling-workspace-session", workspaceId: "workspace-deleted", profileId: "profile-1", name: "Dangling workspace",
      interactionMode: "terminal", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1,
      launchConfig: { permission: null, mode: null, model: null }, revision: 1,
      createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z"
    });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    try {
      const started = await post(address.port, "/api/sessions/dangling-workspace-session/start", { confirmed: true });
      expect(started.status).toBe(404);
      expect(started.json.error).toMatchObject({ code: "WORKSPACE_NOT_FOUND" });
      expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("forks legacy chat and terminal sessions without copying resume tokens", async () => {
    const { dependencies, state } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    state.providers = [{ id: "provider-1", name: "Provider", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", models: [], enabled: true, createdAt: "2026-01-01T00:00:00Z" }];
    state.modelRoutes = [{ id: "route-1", name: "Route", enabled: true, candidateDeploymentIds: ["deployment-1"], automaticTechnicalFallback: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }];
    state.sessions.push({
      id: "session-chat", workspaceId: "workspace-1", profileId: "profile-1", providerId: "provider-1", modelRouteId: "route-1", name: "Chat",
      interactionMode: "chat", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1,
      launchConfig: { permission: null, mode: null, model: "launch-model" },
      chatContext: { activeModel: "active-model", resumeToken: "chat-resume" },
      backendSessionRef: { backendId: "backend-1", nativeSessionId: "native-chat", transport: "json-stream", resumeData: { cursor: "chat" } },
      revision: 4, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z"
    });
    state.sessions.push({
      id: "session-terminal", workspaceId: "workspace-1", profileId: "profile-1", providerId: "provider-1", modelRouteId: "route-1", name: "Terminal",
      interactionMode: "terminal", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 2,
      launchConfig: { permission: null, mode: null, model: "launch-model" },
      terminalContext: { resumeToken: "terminal-resume" },
      backendSessionRef: { backendId: "backend-1", nativeSessionId: "native-terminal", transport: "pty", resumeData: { cursor: "terminal" } },
      revision: 7, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z"
    });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    try {
      const chatFork = await post(address.port, "/api/sessions/session-chat/fork", { expectedRevision: 4 });
      const terminalFork = await post(address.port, "/api/sessions/session-terminal/fork", { expectedRevision: 7 });
      expect(chatFork.status).toBe(201);
      expect(terminalFork.status).toBe(201);
      expect(chatFork.json.session).toMatchObject({ profileId: "profile-1", providerId: "provider-1", modelRouteId: "route-1", backendSessionRef: { backendId: "backend-1", nativeSessionId: "native-chat", transport: "json-stream" }, chatContext: { activeModel: "active-model" } });
      expect(chatFork.json.session.chatContext).not.toHaveProperty("resumeToken");
      expect(chatFork.json.session.terminalContext).toBeUndefined();
      expect(terminalFork.json.session).toMatchObject({ profileId: "profile-1", providerId: "provider-1", modelRouteId: "route-1", backendSessionRef: { backendId: "backend-1", nativeSessionId: "native-terminal", transport: "pty" } });
      expect(terminalFork.json.session.chatContext).toBeUndefined();
      expect(terminalFork.json.session.terminalContext).toBeUndefined();
    } finally {
      await server.close();
    }
  });
});

describe("profile model catalog APIs (console-gaps SPEC §2)", () => {
  const supportedCapabilities = vi.fn(async () => ({
    adapterId: "codex" as const,
    compatibility: "supported" as const,
    detectedVersion: "0.145.0",
    permissions: [],
    modes: [],
    models: [],
    supportsComposer: true,
    supportsStructuredRecognition: false,
    supportsHeadlessTurns: false,
    supportsResume: false,
    supportsApproval: false,
    supportsPromptEnhancement: false
  }));

  function pushCodexProfile(state: AppStateV3, extra: Partial<AppStateV3["profiles"][number]> = {}) {
    state.profiles.push({ id: "profile-1", name: "Codex", command: "codex", args: [], adapterId: "codex", createdAt: "2026-01-01T00:00:00Z", ...extra });
  }

  async function boot(overrides: Partial<ApplicationDependencies> = {}) {
    const context = createDependencies({ profileAdapters: { availableAdapterIds: ["codex"], capabilities: supportedCapabilities }, ...overrides });
    const application = await createApplication(context.dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: context.dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();
    return { ...context, server, address };
  }

  it("routes a chat turn through the backend seam with provider launch credentials isolated", async () => {
    const token = "secret-provider-token";
    const launchTurns: Array<{ launchArgs?: readonly string[]; launchEnv?: Readonly<Record<string, string>>; resume?: { nativeSessionId?: string } }> = [];
    const executor: BackendTurnExecutor = {
      run: vi.fn(async ({ session, turn }) => {
        launchTurns.push({ launchArgs: turn.launchArgs, launchEnv: turn.launchEnv, resume: session.resume });
        return {
          events: (async function* () {
            yield { type: "response.output_text.delta", delta: { text: "safe reply" } };
            yield { type: "turn.completed" };
          })(),
          result: Promise.resolve({ status: "completed" as const }),
          cancel: vi.fn(async () => undefined)
        };
      })
    };
    const secretStore = createMemorySecretStore();
    const resolveSpy = vi.spyOn(secretStore, "resolve");
    const { server, address, state, transcripts, dependencies } = await boot({
      profileAdapters: {
        availableAdapterIds: ["codex"],
        capabilities: vi.fn(async () => ({ adapterId: "codex" as const, compatibility: "supported" as const, permissions: [], modes: [], models: [], supportsComposer: true, supportsStructuredRecognition: false, supportsHeadlessTurns: true, supportsResume: true, supportsApproval: false, supportsPromptEnhancement: false }))
      },
      secretStore,
      agentBackends: createAgentBackendRegistry(
        {
          availableAdapterIds: ["codex"],
          capabilities: vi.fn(async () => ({ adapterId: "codex" as const, compatibility: "supported" as const, permissions: [], modes: [], models: [], supportsComposer: true, supportsStructuredRecognition: false, supportsHeadlessTurns: true, supportsResume: true, supportsApproval: false, supportsPromptEnhancement: false }))
        },
        executor
      )
    });
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    pushCodexProfile(state, { customModels: [] });
    state.providers = [{ id: "provider-1", name: "OpenAI Compatible", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", models: [], supportedEngineIds: [], enabled: true, createdAt: "2026-01-01T00:00:00Z" }];

    try {
      state.providers[0].credentialRef = await secretStore.put({ providerId: "provider-1" }, token);
      state.sessions.push({ id: "session-chat", workspaceId: "workspace-1", profileId: "profile-1", providerId: "provider-1", name: "Chat", interactionMode: "chat", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1000, launchConfig: { permission: null, mode: null, model: null }, chatContext: { resumeToken: "resume-thread" }, backendSessionRef: { backendId: "codex", nativeSessionId: "resume-thread", transport: "json-stream" }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" });

      const sent = await post(address.port, "/api/sessions/session-chat/messages", { clientMessageId: "client-chat", content: "hello", startIfStopped: true, confirmedStart: true });
      expect(sent.status).toBe(202);
      for (let i = 0; i < 100 && launchTurns.length === 0; i++) await new Promise((resolve) => setTimeout(resolve, 5));

      expect(launchTurns).toHaveLength(1);
      expect(launchTurns[0].launchArgs).toEqual(expect.arrayContaining(["model_provider=provider-1", "model_providers.provider-1.api_key_env=SPECOS_PROVIDER_PROVIDER_1_KEY"]));
      expect(launchTurns[0].launchEnv).toEqual({ SPECOS_PROVIDER_PROVIDER_1_KEY: token });
      expect(resolveSpy).toHaveBeenCalledTimes(2);
      expect(resolveSpy).toHaveBeenCalledWith(state.providers[0].credentialRef);
      expect(launchTurns[0].resume).toMatchObject({ nativeSessionId: "resume-thread" });
      expect(JSON.stringify(sent.json)).not.toContain(token);
      expect(JSON.stringify(state)).not.toContain(token);
      expect(JSON.stringify(dependencies.logger)).not.toContain(token);
      expect(state.sessions[0]).toMatchObject({ runtimeStatus: "running", backendId: "codex" });
    } finally {
      await server.close();
    }
  });

  it("merges builtin, synced, and custom sources with source labels and default first", async () => {
    const { server, address, state } = await boot();
    pushCodexProfile(state, { syncedModels: ["gpt-5", "o4-mini"], customModels: ["my-model"] });

    try {
      const models = await get(address.port, "/api/profiles/profile-1/models");
      expect(models.status).toBe(200);
      expect(models.json.models[0]).toEqual({ id: "default", source: "builtin" });
      expect(models.json.models).toContainEqual({ id: "gpt-5", source: "builtin" });
      expect(models.json.models).toContainEqual({ id: "o4-mini", source: "synced" });
      expect(models.json.models).toContainEqual({ id: "my-model", source: "custom" });

      const missing = await get(address.port, "/api/profiles/absent/models");
      expect(missing.status).toBe(404);
      expect(missing.json.error.code).toBe("PROFILE_NOT_FOUND");
    } finally {
      await server.close();
    }
  });

  it("omits builtin models when the CLI is not detected as supported", async () => {
    const { server, address, state } = await boot({ profileAdapters: { availableAdapterIds: ["codex"] } });
    pushCodexProfile(state, { syncedModels: ["o4-mini"], customModels: ["my-model"] });

    try {
      const models = await get(address.port, "/api/profiles/profile-1/models");
      expect(models.json.models).toEqual([{ id: "o4-mini", source: "synced" }, { id: "my-model", source: "custom" }]);
    } finally {
      await server.close();
    }
  });

  it("syncs local CLI config models through the injected reader and persists them", async () => {
    const modelSyncReader = vi.fn(async () => ["gpt-5.1-from-config"]);
    const { server, address, state, dependencies } = await boot({ modelSyncReader });
    pushCodexProfile(state);

    try {
      const synced = await post(address.port, "/api/profiles/profile-1/models/sync", {});
      expect(synced.status).toBe(200);
      expect(synced.json.synced).toEqual(["gpt-5.1-from-config"]);
      expect(synced.json.models).toContainEqual({ id: "gpt-5.1-from-config", source: "synced" });
      expect(state.profiles[0].syncedModels).toEqual(["gpt-5.1-from-config"]);
      expect(dependencies.stateRepository.save).toHaveBeenCalled();
      expect(modelSyncReader).toHaveBeenCalledOnce();
    } finally {
      await server.close();
    }
  });

  it("automatically syncs models before capability detection and gates reads by TTL", async () => {
    let now = "2026-01-01T00:00:00Z";
    const modelSyncReader = vi.fn(async () => ["gpt-5.6-luna"]);
    const capabilities = vi.fn(async (profile: AppStateV3["profiles"][number]) => ({
      ...(await supportedCapabilities()),
      models: (profile.syncedModels ?? []).map((id) => ({ id, labelKey: id, requiresRestart: true }))
    }));
    const { server, address, state, dependencies } = await boot({
      clock: { now: vi.fn(() => now) },
      modelSyncReader,
      profileAdapters: { availableAdapterIds: ["codex"], capabilities }
    });
    pushCodexProfile(state, { syncedModels: ["cached-model"] });

    try {
      const first = await get(address.port, "/api/profiles/profile-1/capabilities");
      expect(first.status).toBe(200);
      expect(first.json.models).toContainEqual({ id: "gpt-5.6-luna", labelKey: "gpt-5.6-luna", requiresRestart: true });
      expect(modelSyncReader).toHaveBeenCalledOnce();
      expect(state.profiles[0].syncedModels).toEqual(["gpt-5.6-luna"]);

      await get(address.port, "/api/profiles/profile-1/capabilities");
      expect(modelSyncReader).toHaveBeenCalledOnce();

      now = "2026-01-01T00:06:00Z";
      await get(address.port, "/api/profiles/profile-1/capabilities");
      expect(modelSyncReader).toHaveBeenCalledTimes(2);
      expect(dependencies.stateRepository.save).toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("keeps the previous synced models when automatic configuration reading fails", async () => {
    const modelSyncReader = vi.fn(async () => { throw new Error("config unavailable"); });
    const capabilities = vi.fn(async (profile: AppStateV3["profiles"][number]) => ({
      ...(await supportedCapabilities()),
      models: (profile.syncedModels ?? []).map((id) => ({ id, labelKey: id, requiresRestart: true }))
    }));
    const { server, address, state, dependencies } = await boot({
      modelSyncReader,
      profileAdapters: { availableAdapterIds: ["codex"], capabilities }
    });
    pushCodexProfile(state, { syncedModels: ["cached-model"] });

    try {
      const response = await get(address.port, "/api/profiles/profile-1/capabilities");
      expect(response.status).toBe(200);
      expect(response.json.models).toContainEqual({ id: "cached-model", labelKey: "cached-model", requiresRestart: true });
      expect(state.profiles[0].syncedModels).toEqual(["cached-model"]);
      expect(dependencies.logger.warn).toHaveBeenCalledWith("Automatic model sync failed", expect.any(Object));
    } finally {
      await server.close();
    }
  });

  it("validates custom model imports and removes them again", async () => {
    const { server, address, state } = await boot();
    pushCodexProfile(state);

    try {
      const missingField = await post(address.port, "/api/profiles/profile-1/models/custom", {});
      expect(missingField.status).toBe(400);

      const tooLong = await post(address.port, "/api/profiles/profile-1/models/custom", { model: "x".repeat(129) });
      expect(tooLong.status).toBe(400);
      expect(tooLong.json.error.code).toBe("VALIDATION_FAILED");

      const duplicate = await post(address.port, "/api/profiles/profile-1/models/custom", { model: "gpt-5" });
      expect(duplicate.status).toBe(400);
      expect(duplicate.json.error.code).toBe("VALIDATION_FAILED");

      const created = await post(address.port, "/api/profiles/profile-1/models/custom", { model: " my-model " });
      expect(created.status).toBe(201);
      expect(created.json.models).toContainEqual({ id: "my-model", source: "custom" });
      expect(state.profiles[0].customModels).toEqual(["my-model"]);

      const removedMissing = await send(address.port, "/api/profiles/profile-1/models/custom/absent", "DELETE", {});
      expect(removedMissing.status).toBe(404);

      const removed = await send(address.port, `/api/profiles/profile-1/models/custom/${encodeURIComponent("my-model")}`, "DELETE", {});
      expect(removed.status).toBe(200);
      expect(removed.json.models).not.toContainEqual({ id: "my-model", source: "custom" });
      expect(state.profiles[0].customModels).toBeUndefined();
    } finally {
      await server.close();
    }
  });

  it("rejects model mutations in readonly mode while keeping reads open", async () => {
    const { server, address, state } = await boot({ policy: { readonly: true, processEnvironment: {} } });
    pushCodexProfile(state);

    try {
      expect((await get(address.port, "/api/profiles/profile-1/models")).status).toBe(200);
      const sync = await post(address.port, "/api/profiles/profile-1/models/sync", {});
      expect(sync.status).toBe(403);
      expect(sync.json.error.code).toBe("READONLY_MODE");
      expect((await post(address.port, "/api/profiles/profile-1/models/custom", { model: "m" })).status).toBe(403);
      expect((await send(address.port, "/api/profiles/profile-1/models/custom/m", "DELETE", {})).status).toBe(403);
    } finally {
      await server.close();
    }
  });

  it("keeps provider credentials secret-free while exposing compatible provider models", async () => {
    const secretStore = createMemorySecretStore();
    const { server, address, state } = await boot({ secretStore });
    pushCodexProfile(state);
    const canary = "provider-secret-canary";

    try {
      const created = await post(address.port, "/api/providers", {
        id: "provider-1",
        name: "Primary",
        protocol: "openai-compatible",
        baseUrl: "https://provider.example/v1",
        models: ["provider-model", "gpt-5"]
      });
      expect(created.status).toBe(201);
      expect(JSON.stringify(created.json)).not.toContain(canary);
      expect(created.json.provider).not.toHaveProperty("credentialRef");

      const credential = await send(address.port, "/api/providers/provider-1/credential", "PUT", { secret: canary });
      expect(credential.status).toBe(200);
      expect(JSON.stringify(credential.json)).not.toContain(canary);

      const providers = await get(address.port, "/api/providers");
      expect(providers.json.providers[0]).toMatchObject({ id: "provider-1", configured: true, credentialStatus: "configured" });
      expect(providers.json.providers[0]).not.toHaveProperty("credentialRef");
      expect(JSON.stringify(providers.json)).not.toContain(canary);
      expect(JSON.stringify(state)).not.toContain(canary);

      const capabilities = await get(address.port, "/api/profiles/profile-1/capabilities");
      expect(capabilities.json.modelGroups).toEqual([expect.objectContaining({ providerId: "provider-1", models: [expect.objectContaining({ id: "provider-model" })] })]);
      const models = await get(address.port, "/api/profiles/profile-1/models");
      expect(models.json.models).toContainEqual({ id: "provider-model", source: "synced" });
      expect(models.json.models).toContainEqual({ id: "gpt-5", source: "builtin" });
    } finally {
      await server.close();
    }
  });

  it("covers the current provider CRUD API matrix and readonly contract", async () => {
    const { server, address } = await boot();
    try {
      expect((await get(address.port, "/api/providers")).status).toBe(200);
      const created = await post(address.port, "/api/providers", { id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", credentialRef: "env:PROVIDER_KEY", models: ["model-1"] });
      expect(created.status).toBe(201);
      expect((await post(address.port, "/api/providers", { id: "provider-1", name: "Duplicate", protocol: "openai-compatible", baseUrl: "https://provider.example/v1" })).json.error.details.field).toBe("id");
      for (const [body, code, field] of [
        [{ id: "bad-protocol", name: "Bad", protocol: "unknown", baseUrl: "https://provider.example/v1" }, "VALIDATION_FAILED", "protocol"],
        [{ id: "bad-url", name: "Bad", protocol: "openai-compatible", baseUrl: "ftp://provider.example/v1" }, "PROVIDER_ENDPOINT_INVALID", "baseUrl"],
        [{ id: "bad-ref", name: "Bad", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", credentialRef: "not-a-secret-ref" }, "VALIDATION_FAILED", "credentialRef"]
      ] as const) {
        const response = await post(address.port, "/api/providers", body);
        expect(response.status).toBe(400);
        expect(response.json.error).toMatchObject({ code, details: { field } });
      }
      expect((await patch(address.port, "/api/providers/provider-1", { name: "Renamed", baseUrl: "http://localhost:4311" })).status).toBe(200);
      const idChange = await patch(address.port, "/api/providers/provider-1", { id: "provider-2" });
      expect(idChange.status).toBe(400);
      expect(idChange.json.error.details.field).toBe("id");
      expect((await patch(address.port, "/api/providers/missing", { name: "Missing" })).status).toBe(404);
      expect((await send(address.port, "/api/providers/provider-1", "DELETE", {})).status).toBe(200);
      expect((await send(address.port, "/api/providers/provider-1", "DELETE", {})).status).toBe(404);
      expect((await get(address.port, "/api/providers/provider-1/unknown")).status).toBe(404);
    } finally {
      await server.close();
    }

    const readonly = await boot({ policy: { readonly: true, processEnvironment: {} } });
    try {
      expect((await get(readonly.address.port, "/api/providers")).status).toBe(200);
      for (const response of [
        await post(readonly.address.port, "/api/providers", { id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1" }),
        await patch(readonly.address.port, "/api/providers/provider-1", { name: "Changed" }),
        await send(readonly.address.port, "/api/providers/provider-1", "DELETE", {})
      ]) {
        expect(response.status).toBe(403);
        expect(response.json.error.code).toBe("READONLY_MODE");
      }
    } finally {
      await readonly.server.close();
    }
  });

  it("preserves provider state when credential storage put or remove fails", async () => {
    const provider = { id: "provider-1", name: "Primary", protocol: "openai-compatible" as const, baseUrl: "https://provider.example/v1", credentialRef: "keychain:old-ref" as const, models: [], enabled: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
    const failingStore = {
      ...createMemorySecretStore(),
      put: vi.fn(async () => { throw new SecretStoreError("SECRET_WRITE_FAILED", "injected write failure"); }),
      remove: vi.fn(async () => { throw new SecretStoreError("SECRET_DELETE_FAILED", "injected delete failure"); })
    };
    const { server, address, state, dependencies } = await boot({ secretStore: failingStore });
    state.providers.push(structuredClone(provider));
    try {
      const before = structuredClone(state.providers[0]);
      const put = await send(address.port, "/api/providers/provider-1/credential", "PUT", { secret: "not-recorded" });
      expect(put.status).toBe(503);
      expect(put.json.error.code).toBe("SECRET_WRITE_FAILED");
      expect(state.providers[0]).toEqual(before);
      expect(dependencies.stateRepository.save).not.toHaveBeenCalled();

      const remove = await send(address.port, "/api/providers/provider-1/credential", "DELETE", {});
      expect(remove.status).toBe(503);
      expect(remove.json.error.code).toBe("SECRET_DELETE_FAILED");
      expect(state.providers[0]).toEqual(before);
      expect(JSON.stringify(state)).not.toContain("not-recorded");
    } finally {
      await server.close();
    }
  });

  it("blocks provider deletion through active deployments and route bindings", async () => {
    const { server, address, state } = await boot();
    const now = "2026-01-01T00:00:00Z";
    state.providers.push({ id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", models: [], enabled: true, createdAt: now, updatedAt: now });
    state.modelDeployments = [{ id: "deployment-1", name: "Primary model", providerId: "provider-1", profileId: "profile-1", modelId: "model-1", enabled: true, createdAt: now, updatedAt: now }];
    state.modelRoutes = [{ id: "route-1", name: "Primary route", enabled: true, candidateDeploymentIds: ["deployment-1"], automaticTechnicalFallback: false, createdAt: now, updatedAt: now }];
    state.globalModelRouteId = "route-1";
    try {
      const response = await send(address.port, "/api/providers/provider-1", "DELETE", {});
      expect(response.status).toBe(409);
      expect(response.json.error.code).toBe("PROVIDER_IN_USE");
      expect(state.providers).toHaveLength(1);
    } finally {
      await server.close();
    }
  });

  it("serializes credential mutations and rolls back state-save failures", async () => {
    const secretStore = createMemorySecretStore();
    const oldRef = await secretStore.put({ providerId: "provider-1" }, "old-secret");
    const remove = vi.spyOn(secretStore, "remove");
    const { server, address, state, dependencies } = await boot({ secretStore });
    const save = vi.mocked(dependencies.stateRepository.save);
    const now = "2026-01-01T00:00:00Z";
    state.providers.push({ id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", models: [], enabled: true, credentialRef: oldRef, createdAt: now, updatedAt: now });
    try {
      const results = await Promise.all([
        send(address.port, "/api/providers/provider-1/credential", "PUT", { secret: "first-secret" }),
        send(address.port, "/api/providers/provider-1/credential", "PUT", { secret: "second-secret" })
      ]);
      expect(results.map((result) => result.status)).toEqual([200, 200]);
      const finalRef = state.providers[0].credentialRef;
      expect(finalRef).toMatch(/^keychain:/);
      expect(remove).toHaveBeenCalledWith(oldRef);
      await expect(secretStore.status(finalRef!)).resolves.toBe("configured");

      save.mockRejectedValueOnce(new Error("injected state failure"));
      const before = structuredClone(state.providers[0]);
      const failedPut = await send(address.port, "/api/providers/provider-1/credential", "PUT", { secret: "rollback-secret" });
      expect(failedPut.status).toBe(500);
      expect(state.providers[0]).toEqual(before);
      expect(dependencies.logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("Credential rollback cleanup failed"), expect.anything());

      save.mockRejectedValueOnce(new Error("injected delete state failure"));
      const failedDelete = await send(address.port, "/api/providers/provider-1/credential", "DELETE", {});
      expect(failedDelete.status).toBe(500);
      expect(state.providers[0]).toEqual(before);

      const mixed = await Promise.all([
        send(address.port, "/api/providers/provider-1/credential", "DELETE", {}),
        send(address.port, "/api/providers/provider-1/credential", "PUT", { secret: "mixed-secret" })
      ]);
      expect(mixed.map((result) => result.status)).toEqual([200, 200]);
      const mixedRef = state.providers[0].credentialRef;
      if (mixedRef) await expect(secretStore.status(mixedRef)).resolves.toBe("configured");
      else await expect(get(address.port, "/api/providers")).resolves.toMatchObject({ json: { providers: [expect.objectContaining({ credentialStatus: "missing" })] } });
    } finally {
      await server.close();
    }
  });

  it("enforces readonly, CSRF, and request body-size gates without mutating state", async () => {
    const readonly = await boot({ policy: { readonly: true, processEnvironment: {} } });
    try {
      const denied = await post(readonly.address.port, "/api/providers", { id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1" });
      expect(denied.status).toBe(403);
      expect(denied.json.error.code).toBe("READONLY_MODE");
      expect(readonly.state.providers).toEqual([]);
    } finally {
      await readonly.server.close();
    }

    const csrf = await boot();
    await csrf.server.close();
    const application = await createApplication(csrf.dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: csrf.dependencies.logger, requestIdFactory: () => "request-test", csrfCapability: "capability-test" });
    const address = await server.listen();
    try {
      const missing = await post(address.port, "/api/providers", { id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1" });
      expect(missing.status).toBe(403);
      expect(missing.json.error.code).toBe("ORIGIN_NOT_ALLOWED");
      const accepted = await sendWithHeaders(address.port, "/api/providers", "POST", { id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1" }, { origin: `http://127.0.0.1:${address.port}`, "x-specos-csrf-capability": "capability-test" });
      expect(accepted.status).toBe(201);
      const oversized = await sendWithHeaders(address.port, "/api/providers/provider-1", "PATCH", { name: "x".repeat(1_048_577) }, { origin: `http://127.0.0.1:${address.port}`, "x-specos-csrf-capability": "capability-test" });
      expect(oversized.status).toBe(413);
      expect(oversized.json.error.code).toBe("PAYLOAD_TOO_LARGE");
    } finally {
      await server.close();
    }
  });

  it("rolls back a replacement when the old credential cannot be removed", async () => {
    const secretStore = createMemorySecretStore();
    const oldRef = await secretStore.put({ providerId: "provider-1" }, "old-secret");
    const remove = vi.spyOn(secretStore, "remove");
    remove.mockRejectedValueOnce(new SecretStoreError("SECRET_DELETE_FAILED", "injected old credential cleanup failure"));
    const { server, address, state, dependencies } = await boot({ secretStore });
    const now = "2026-01-01T00:00:00Z";
    state.providers.push({ id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", models: [], enabled: true, credentialRef: oldRef, createdAt: now, updatedAt: now });
    try {
      const response = await send(address.port, "/api/providers/provider-1/credential", "PUT", { secret: "replacement-secret" });
      expect(response.status).toBe(503);
      expect(response.json.error.code).toBe("SECRET_DELETE_FAILED");
      expect(state.providers[0].credentialRef).toBe(oldRef);
      await expect(secretStore.status(oldRef)).resolves.toBe("configured");
      const newRef = remove.mock.calls[1]?.[0];
      expect(newRef).toMatch(/^keychain:/);
      await expect(secretStore.status(newRef!)).resolves.toBe("missing");
      expect(dependencies.stateRepository.save).toHaveBeenCalledTimes(2);
    } finally {
      await server.close();
    }
  });

  it("injects provider credentials only at spawn time and preserves providerId across forks", async () => {
    const secretStore = createMemorySecretStore();
    let sequence = 0;
    const { server, address, state, dependencies } = await boot({
      secretStore,
      idGenerator: { create: vi.fn((prefix) => `${prefix}-${++sequence}`) }
    });
    pushCodexProfile(state);
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    const canary = "provider-spawn-canary";

    try {
      await post(address.port, "/api/providers", { id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1" });
      await send(address.port, "/api/providers/provider-1/credential", "PUT", { secret: canary });
      const created = await post(address.port, "/api/sessions", { name: "Provider session", workspaceId: "workspace-1", profileId: "profile-1", providerId: "provider-1", interactionMode: "terminal", start: true, confirmed: true });

      expect(created.status).toBe(201);
      const spawn = vi.mocked(dependencies.ptyRuntime.spawn).mock.calls[0]?.[0];
      expect(spawn?.args).toContain("model_provider=provider-1");
      expect(spawn?.env).toMatchObject({ SPECOS_PROVIDER_PROVIDER_1_KEY: canary });
      expect(JSON.stringify(created.json)).not.toContain(canary);
      expect(JSON.stringify(state)).not.toContain(canary);

      const revision = created.json.session.revision as number;
      const forked = await post(address.port, `/api/sessions/${created.json.session.id}/fork`, { expectedRevision: revision });
      expect(forked.status).toBe(201);
      expect(forked.json.session.providerId).toBe("provider-1");
    } finally {
      await server.close();
    }
  });

  it("blocks a provider session with a missing environment credential before PTY spawn", async () => {
    const { server, address, state, dependencies } = await boot();
    pushCodexProfile(state);
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });

    try {
      await post(address.port, "/api/providers", { id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", credentialRef: "MISSING_PROVIDER_KEY" });
      const created = await post(address.port, "/api/sessions", { name: "Stopped provider session", workspaceId: "workspace-1", profileId: "profile-1", providerId: "provider-1", interactionMode: "terminal", start: false, confirmed: false });
      const started = await post(address.port, `/api/sessions/${created.json.session.id}/start`, { confirmed: true });

      expect(started.status).toBe(400);
      expect(started.json.error.code).toBe("PROVIDER_CREDENTIAL_MISSING");
      expect(started.json.error.message).toContain("MISSING_PROVIDER_KEY");
      expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("maps anthropic-compatible providers into Claude PTY environment without leaking credentials", async () => {
    const secretStore = createMemorySecretStore();
    const { server, address, state, dependencies } = await boot({ secretStore });
    state.profiles.push({ id: "claude-profile", name: "Claude", command: "claude", args: ["--print"], adapterId: "claude-code", createdAt: "2026-01-01T00:00:00Z" });
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    const token = "anthropic-token-canary";

    try {
      await post(address.port, "/api/providers", { id: "anthropic", name: "Anthropic", protocol: "anthropic-compatible", baseUrl: "https://anthropic.example/v1", models: ["claude-model"] });
      await send(address.port, "/api/providers/anthropic/credential", "PUT", { secret: token });
      const created = await post(address.port, "/api/sessions", { name: "Claude", workspaceId: "workspace-1", profileId: "claude-profile", providerId: "anthropic", interactionMode: "terminal", start: true, confirmed: true });

      expect(created.status).toBe(201);
      const spawn = vi.mocked(dependencies.ptyRuntime.spawn).mock.calls[0]?.[0];
      expect(spawn?.env).toMatchObject({ ANTHROPIC_BASE_URL: "https://anthropic.example/v1", ANTHROPIC_AUTH_TOKEN: token });
      expect(spawn?.args).toEqual(["--print"]);
      expect(JSON.stringify(created.json)).not.toContain(token);
      expect(JSON.stringify(state)).not.toContain(token);
      expect(JSON.stringify(dependencies.logger)).not.toContain(token);
    } finally {
      await server.close();
    }
  });

  it("isolates provider launch args and env across concurrent sessions", async () => {
    const secretStore = createMemorySecretStore();
    let sequence = 0;
    const { server, address, state, dependencies } = await boot({ secretStore, idGenerator: { create: vi.fn((prefix) => `${prefix}-${++sequence}`) } });
    pushCodexProfile(state, { args: ["--profile", "base"] });
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });

    try {
      for (const [id, secret] of [["one", "token-one"], ["two", "token-two"]] as const) {
        await post(address.port, "/api/providers", { id, name: id, protocol: "openai-compatible", baseUrl: `https://${id}.example/v1` });
        await send(address.port, `/api/providers/${id}/credential`, "PUT", { secret });
      }
      const responses = await Promise.all(["one", "two"].map((providerId) => post(address.port, "/api/sessions", { name: providerId, workspaceId: "workspace-1", profileId: "profile-1", providerId, interactionMode: "terminal", start: true, confirmed: true })));
      expect(new Set(responses.map((response) => response.json.session.id)).size).toBe(2);
      const launches = vi.mocked(dependencies.ptyRuntime.spawn).mock.calls.map(([launch]) => launch);
      expect(launches).toHaveLength(2);
      expect(launches.map((launch) => launch.args.find((arg) => arg.startsWith("model_provider=")))).toEqual(expect.arrayContaining(["model_provider=one", "model_provider=two"]));
      expect(launches.map((launch) => Object.keys(launch.env).find((key) => key.includes("PROVIDER_ONE") || key.includes("PROVIDER_TWO")))).toEqual(expect.arrayContaining(["SPECOS_PROVIDER_ONE_KEY", "SPECOS_PROVIDER_TWO_KEY"]));
    } finally {
      await server.close();
    }
  });

  it("preserves profile launch baseline when a session has no provider", async () => {
    const { server, address, state, dependencies } = await boot();
    pushCodexProfile(state, { args: ["--profile", "baseline"] });
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });

    try {
      const created = await post(address.port, "/api/sessions", { name: "Plain", workspaceId: "workspace-1", profileId: "profile-1", interactionMode: "terminal", start: true, confirmed: true });
      const launch = vi.mocked(dependencies.ptyRuntime.spawn).mock.calls[0]?.[0];
      expect(created.status).toBe(201);
      expect(launch?.args).toEqual(["--profile", "baseline"]);
      expect(launch?.env).not.toHaveProperty("SPECOS_PROVIDER_PROFILE_1_KEY");
    } finally {
      await server.close();
    }
  });

  it("rejects incompatible provider protocols before spawning", async () => {
    const { server, address, state, dependencies } = await boot();
    pushCodexProfile(state);
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });

    try {
      await post(address.port, "/api/providers", { id: "anthropic", name: "Anthropic", protocol: "anthropic-compatible", baseUrl: "https://anthropic.example/v1" });
      const response = await post(address.port, "/api/sessions", { name: "Bad", workspaceId: "workspace-1", profileId: "profile-1", providerId: "anthropic", interactionMode: "terminal", start: true, confirmed: true });
      expect(response.status).toBe(400);
      expect(response.json.error).toMatchObject({ code: "VALIDATION_FAILED", details: { field: "providerId" } });
      expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("deduplicates compatible provider models with builtin precedence", async () => {
    const { server, address, state } = await boot();
    pushCodexProfile(state, { syncedModels: ["gpt-5"] });

    try {
      for (const [id, models] of [["provider-a", ["gpt-5", "shared-model"]], ["provider-b", ["shared-model", "provider-only"]]] as const) {
        const created = await post(address.port, "/api/providers", { id, name: id, protocol: "openai-compatible", baseUrl: `https://${id}.example/v1`, models });
        expect(created.status).toBe(201);
      }
      const models = await get(address.port, "/api/profiles/profile-1/models");
      expect(models.status).toBe(200);
      expect(models.json.models.filter((model: { id: string }) => model.id === "gpt-5")).toEqual([{ id: "gpt-5", source: "builtin" }]);
      expect(models.json.models.filter((model: { id: string }) => model.id === "shared-model")).toHaveLength(1);
      expect(models.json.models).toContainEqual({ id: "provider-only", source: "synced" });
      const capabilities = await get(address.port, "/api/profiles/profile-1/capabilities");
      expect(capabilities.json.modelGroups).toEqual(expect.arrayContaining([
        expect.objectContaining({ providerId: "provider-a", models: expect.arrayContaining([expect.objectContaining({ id: "shared-model" })]) }),
        expect.objectContaining({ providerId: "provider-b", models: expect.arrayContaining([expect.objectContaining({ id: "provider-only" })]) })
      ]));
    } finally {
      await server.close();
    }
  });
});

describe("model deployment API matrix (CLI-GUI-029 issue 093)", () => {
  const deploymentCapabilities = vi.fn(async () => ({
    adapterId: "codex" as const,
    compatibility: "supported" as const,
    permissions: [], modes: [], supportsComposer: true,
    supportsStructuredRecognition: false, supportsHeadlessTurns: false,
    supportsResume: false, supportsApproval: false, supportsPromptEnhancement: false,
    models: [{ id: "model-1", labelKey: "model-1", requiresRestart: false }]
  }));

  async function deploymentBoot(overrides: Partial<ApplicationDependencies> = {}) {
    const context = createDependencies({ profileAdapters: { availableAdapterIds: ["codex"], capabilities: deploymentCapabilities }, ...overrides });
    const application = await createApplication(context.dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: context.dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();
    return { ...context, server, address };
  }

  function pushDeploymentProfile(state: AppStateV3) {
    state.profiles.push({ id: "profile-1", name: "Codex", command: "codex", args: [], adapterId: "codex", createdAt: "2026-01-01T00:00:00Z" });
  }

  async function bootDeployment(overrides: Partial<ApplicationDependencies> = {}) {
    const secretStore = overrides.secretStore ?? createMemorySecretStore();
    const context = await deploymentBoot({
      secretStore,
      profileAdapters: { availableAdapterIds: ["codex"], capabilities: deploymentCapabilities },
      ...overrides
    });
    pushDeploymentProfile(context.state);
    context.state.providers = [{ id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", models: ["model-1"], supportedEngineIds: ["codex"], enabled: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }];
    context.state.providers[0].credentialRef = await secretStore.put({ providerId: "provider-1" }, "synthetic-credential-canary");
    return { ...context, secretStore, capabilities: deploymentCapabilities };
  }

  it("creates an eligible deployment, exposes list/detail, and rejects invalid identities and references", async () => {
    const context = await bootDeployment();
    const { address, server, state, dependencies } = context;
    try {
      const created = await post(address.port, "/api/model-deployments", { id: "deployment-1", name: "Primary model", providerId: "provider-1", profileId: "profile-1", modelId: "model-1", enabled: true });
      expect(created.status).toBe(201);
      expect(created.json.deployment).toMatchObject({ id: "deployment-1", eligibility: "eligible", exclusionCodes: [] });
      const list = await get(address.port, "/api/model-deployments");
      const detail = await get(address.port, "/api/model-deployments/deployment-1");
      expect(list.status).toBe(200);
      expect(detail.status).toBe(200);
      expect(detail.json.deployment).toMatchObject({ id: "deployment-1", providerId: "provider-1", profileId: "profile-1", modelId: "model-1" });
      for (const value of [created.json, list.json, detail.json, dependencies.logger]) {
        expect(JSON.stringify(value)).not.toContain("credentialRef");
        expect(JSON.stringify(value)).not.toContain("synthetic-credential-canary");
      }
      expect(JSON.stringify(state)).not.toContain("synthetic-credential-canary");

      const cases = [
        [{ id: "deployment-1", name: "duplicate", providerId: "provider-1", profileId: "profile-1", modelId: "model-1" }, "MODEL_DEPLOYMENT_DUPLICATE"],
        [{ id: "deployment-2", name: "tuple duplicate", providerId: "provider-1", profileId: "profile-1", modelId: "model-1" }, "MODEL_DEPLOYMENT_DUPLICATE"],
        [{ id: "deployment-3", name: "missing provider", providerId: "missing", profileId: "profile-1", modelId: "model-1" }, "PROVIDER_NOT_FOUND"],
        [{ id: "deployment-4", name: "missing profile", providerId: "provider-1", profileId: "missing", modelId: "model-1" }, "PROFILE_NOT_FOUND"],
        [{ id: "deployment-5", name: "unknown model", providerId: "provider-1", profileId: "profile-1", modelId: "unknown" }, "MODEL_DEPLOYMENT_MODEL_UNKNOWN"]
      ] as const;
      for (const [body, code] of cases) {
        const response = await post(address.port, "/api/model-deployments", body);
        expect(response.json.error.code).toBe(code);
      }

      const mismatch = await post(address.port, "/api/model-deployments", { id: "deployment-6", name: "mismatch", providerId: "provider-2", profileId: "profile-1", modelId: "model-1" });
      expect(mismatch.json.error.code).toBe("PROVIDER_NOT_FOUND");
      state.providers.push({ id: "provider-2", name: "Anthropic", protocol: "anthropic-compatible", baseUrl: "https://anthropic.example/v1", models: ["model-1"], enabled: true, createdAt: "now", updatedAt: "now" });
      const protocolMismatch = await post(address.port, "/api/model-deployments", { id: "deployment-6", name: "mismatch", providerId: "provider-2", profileId: "profile-1", modelId: "model-1" });
      expect(protocolMismatch.json.error.code).toBe("MODEL_DEPLOYMENT_INCOMPATIBLE");

      state.providers[0].credentialRef = undefined;
      const missingCredential = await patch(address.port, "/api/model-deployments/deployment-1", { enabled: true });
      expect(missingCredential.json.error.code).toBe("MODEL_DEPLOYMENT_CREDENTIAL_MISSING");
    } finally { await server.close(); }
  });

  it("updates, archives, protects, and leaves a readable deployment tombstone", async () => {
    const context = await bootDeployment();
    const { address, server, state } = context;
    try {
      await post(address.port, "/api/model-deployments", { id: "deployment-1", name: "Primary", providerId: "provider-1", profileId: "profile-1", modelId: "model-1" });
      expect((await patch(address.port, "/api/model-deployments/deployment-1", { name: "Renamed" })).json.deployment.name).toBe("Renamed");
      for (const [body, field] of [[{ name: " " }, "name"], [{ providerId: 42 }, "providerId"], [{ enabled: "true" }, "enabled"]] as const) {
        const invalid = await patch(address.port, "/api/model-deployments/deployment-1", body);
        expect(invalid.json.error).toMatchObject({ code: "VALIDATION_FAILED", details: { field } });
      }
      expect((await patch(address.port, "/api/model-deployments/deployment-1", { futureField: true })).status).toBe(200);
      expect((await patch(address.port, "/api/model-deployments/deployment-1", { id: "other" })).json.error.code).toBe("VALIDATION_FAILED");
      expect((await send(address.port, "/api/model-deployments/deployment-1", "DELETE", {})).status).toBe(200);
      const tombstone = await get(address.port, "/api/model-deployments/deployment-1");
      expect(tombstone.json.deployment).toMatchObject({ id: "deployment-1", eligibility: "archived", archivedAt: expect.any(String) });
      const reenable = await patch(address.port, "/api/model-deployments/deployment-1", { enabled: true });
      expect(reenable.json.error.code).toBe("MODEL_DEPLOYMENT_ARCHIVED");

      const now = "2026-01-01T00:00:00Z";
      state.modelDeployments = [{ id: "in-use", name: "In use", providerId: "provider-1", profileId: "profile-1", modelId: "model-1", enabled: true, createdAt: now, updatedAt: now }];
      state.modelRoutes = [{ id: "route-1", name: "Route", enabled: true, candidateDeploymentIds: ["in-use"], automaticTechnicalFallback: false, createdAt: now, updatedAt: now }];
      state.globalModelRouteId = "route-1";
      expect((await send(address.port, "/api/model-deployments/in-use", "DELETE", {})).json.error.code).toBe("MODEL_DEPLOYMENT_IN_USE");
      state.globalModelRouteId = undefined;
      state.modelRoutes[0].enabled = false;
      state.workspaceModelRouteBindings = [{ workspaceId: "workspace-1", routeId: "route-1" }];
      expect((await send(address.port, "/api/model-deployments/in-use", "DELETE", {})).status).toBe(200);
    } finally { await server.close(); }
  });

  it("archives a deployment through the API without rewriting a persisted history snapshot", async () => {
    const context = await bootDeployment();
    const { address, server, dependencies } = context;
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-issue-094-history-"));
    const repository = createJsonExecutionRepository({ dataDirectory, clock: dependencies.clock });
    const deploymentId = "deployment-094-history";
    const routeId = "route-094-history";
    const now = "2026-08-02T00:00:00.000Z";
    try {
      const created = await post(address.port, "/api/model-deployments", { id: deploymentId, name: "History primary", providerId: "provider-1", profileId: "profile-1", modelId: "model-1", enabled: true });
      expect(created.status).toBe(201);

      const frozenTask: ExecutionTask = {
        id: "task-094-history", sessionId: "session-094-history", turnId: "turn-094-history",
        input: { transcriptEventId: "event-094-history", sha256: "b".repeat(64) },
        resolvedRoute: {
          kind: "route", routeId, resolvedAt: now,
          sourceTrace: [{ field: "routeId", source: "session", value: routeId }],
          candidates: [{ deploymentId, position: 1, eligible: true, exclusionCodes: [] }],
          executableCandidates: [{ deploymentId, position: 1, eligible: true, exclusionCodes: [] }],
          selectedDeploymentId: deploymentId, canSend: true
        },
        state: "completed", revision: 1, createdAt: now, completedAt: now
      };
      const frozenAttempt: ExecutionAttempt = {
        id: "attempt-094-history", taskId: frozenTask.id, ordinal: 1, trigger: "primary",
        deployment: { deploymentId, deploymentName: "History primary", providerId: "provider-1", providerName: "Primary", profileId: "profile-1", modelId: "model-1" },
        state: "completed", revision: 1, completedAt: now, sideEffect: { state: "clean", evidenceEventIds: [] }
      };
      await repository.createTask(frozenTask);
      await repository.createAttempt(frozenAttempt);

      const archived = await send(address.port, `/api/model-deployments/${deploymentId}`, "DELETE", {});
      expect(archived.status).toBe(200);
      const tombstone = await get(address.port, `/api/model-deployments/${deploymentId}`);
      expect(tombstone.status).toBe(200);
      expect(tombstone.json.deployment).toMatchObject({ id: deploymentId, providerId: "provider-1", profileId: "profile-1", modelId: "model-1", eligibility: "archived", archivedAt: expect.any(String) });

      const freshRepository = createJsonExecutionRepository({ dataDirectory, clock: dependencies.clock });
      const recovered = await freshRepository.get(frozenTask.id);
      expect(recovered?.task.resolvedRoute).toMatchObject({ routeId, selectedDeploymentId: deploymentId, candidates: [{ deploymentId }] });
      expect(recovered?.attempts[0].deployment).toEqual(frozenAttempt.deployment);
    } finally {
      await server.close();
      await fs.rm(dataDirectory, { recursive: true, force: true });
    }
  });

  it("rejects missing credentials, unknown capability, readonly, and missing Origin/CSRF without false eligibility", async () => {
    const context = await bootDeployment({ profileAdapters: { availableAdapterIds: ["codex"], capabilities: vi.fn(async () => { throw new Error("probe unavailable"); }) } });
    const { address, server, state } = context;
    try {
      const disabled = await post(address.port, "/api/model-deployments", { id: "disabled", name: "Unknown", providerId: "provider-1", profileId: "profile-1", modelId: "model-1", enabled: false });
      expect(disabled.status).toBe(201);
      expect(disabled.json.deployment).toMatchObject({ eligibility: "disabled" });
      const enabled = await post(address.port, "/api/model-deployments", { id: "enabled", name: "Unknown", providerId: "provider-1", profileId: "profile-1", modelId: "model-1", enabled: true });
      expect(enabled.json.error.code).toBe("MODEL_DEPLOYMENT_MODEL_UNKNOWN");
      const before = structuredClone(state);
      await server.close();
      const csrfApplication = await createApplication(context.dependencies);
      const csrfServer = createServer(csrfApplication, { host: "127.0.0.1", port: 0, logger: context.dependencies.logger, requestIdFactory: () => "request-test", csrfCapability: "capability-test" });
      const csrfAddress = await csrfServer.listen();
      const missingOrigin = await post(csrfAddress.port, "/api/model-deployments", { id: "origin", name: "Origin", providerId: "provider-1", profileId: "profile-1", modelId: "model-1" });
      expect(missingOrigin.status).toBe(403);
      expect(missingOrigin.json.error.code).toBe("ORIGIN_NOT_ALLOWED");
      expect(state).toEqual(before);
      await csrfServer.close();
    } finally { await server.close().catch(() => undefined); }

    const readonly = await bootDeployment({ policy: { readonly: true, processEnvironment: {} } });
    try {
      const before = structuredClone(readonly.state);
      const response = await post(readonly.address.port, "/api/model-deployments", { id: "readonly", name: "Readonly", providerId: "provider-1", profileId: "profile-1", modelId: "model-1" });
      expect(response.status).toBe(403);
      expect(response.json.error.code).toBe("READONLY_MODE");
      expect(readonly.state).toEqual(before);
    } finally { await readonly.server.close(); }
  });

  it("serializes concurrent tuple creation and archive mutations", async () => {
    const context = await bootDeployment();
    const { address, server, state } = context;
    try {
      const [firstCreate, secondCreate] = await Promise.all([
        post(address.port, "/api/model-deployments", { id: "tuple-a", name: "Tuple A", providerId: "provider-1", profileId: "profile-1", modelId: "model-1" }),
        post(address.port, "/api/model-deployments", { id: "tuple-b", name: "Tuple B", providerId: "provider-1", profileId: "profile-1", modelId: "model-1" })
      ]);
      expect([firstCreate.status, secondCreate.status].sort()).toEqual([201, 409]);
      expect([firstCreate, secondCreate].find((result) => result.status === 409)?.json.error.code).toBe("MODEL_DEPLOYMENT_DUPLICATE");
      const createdId = firstCreate.status === 201 ? "tuple-a" : "tuple-b";

      const [firstDelete, secondDelete] = await Promise.all([
        send(address.port, `/api/model-deployments/${createdId}`, "DELETE", {}),
        send(address.port, `/api/model-deployments/${createdId}`, "DELETE", {})
      ]);
      expect([firstDelete.status, secondDelete.status].sort()).toEqual([200, 409]);
      expect([firstDelete, secondDelete].find((result) => result.status === 409)?.json.error.code).toBe("MODEL_DEPLOYMENT_ARCHIVED");
      expect(state.modelDeployments?.filter((deployment) => deployment.id === createdId)).toHaveLength(1);
      expect(state.modelDeployments?.find((deployment) => deployment.id === createdId)).toMatchObject({ archivedAt: expect.any(String), enabled: false });
    } finally { await server.close(); }
  });
});

describe("skills read-only APIs (console-gaps SPEC §7)", () => {
  async function bootWithSkills() {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), "app-skills-"));
    const skillDirectory = path.join(home, ".claude", "skills", "alpha");
    await fs.mkdir(skillDirectory, { recursive: true });
    await fs.writeFile(path.join(skillDirectory, "SKILL.md"), "---\nname: Alpha\ndescription: demo\n---\nBody text", "utf8");
    const { dependencies, state } = createDependencies({ policy: { readonly: false, processEnvironment: {}, skillsHomeDirectory: home } });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();
    return { home, state, server, address };
  }

  it("lists system skills from the configured home and serves content by scanned id", async () => {
    const { home, server, address } = await bootWithSkills();

    try {
      const list = await get(address.port, "/api/skills?scope=system");
      expect(list.status).toBe(200);
      expect(list.json.skills).toEqual([{ id: "claude:alpha", name: "Alpha", description: "demo", source: "claude", scope: "system", path: "~/.claude/skills/alpha" }]);

      const content = await get(address.port, "/api/skills/content?scope=system&id=claude%3Aalpha");
      expect(content.status).toBe(200);
      expect(content.json).toEqual({ content: "---\nname: Alpha\ndescription: demo\n---\nBody text", truncated: false });

      const missing = await get(address.port, "/api/skills/content?scope=system&id=claude%3Aabsent");
      expect(missing.status).toBe(404);
      expect(missing.json.error.code).toBe("FILE_NOT_FOUND");
    } finally {
      await server.close();
      await fs.rm(home, { recursive: true, force: true });
    }
  });

  it("validates scope and workspace parameters and rejects non-GET methods", async () => {
    const { home, state, server, address } = await bootWithSkills();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: home, kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });

    try {
      const badScope = await get(address.port, "/api/skills?scope=other");
      expect(badScope.status).toBe(400);
      expect(badScope.json.error.code).toBe("VALIDATION_FAILED");

      const missingWorkspace = await get(address.port, "/api/skills?scope=workspace");
      expect(missingWorkspace.status).toBe(400);

      const unknownWorkspace = await get(address.port, "/api/skills?scope=workspace&workspaceId=absent");
      expect(unknownWorkspace.status).toBe(404);
      expect(unknownWorkspace.json.error.code).toBe("WORKSPACE_NOT_FOUND");

      // workspace scope 扫 <workspace>/.claude/skills：本 fixture 重用 home 目录作为 workspace 根
      const workspaceSkills = await get(address.port, "/api/skills?scope=workspace&workspaceId=workspace-1");
      expect(workspaceSkills.status).toBe(200);
      expect(workspaceSkills.json.skills).toMatchObject([{ id: "claude:alpha", scope: "workspace", path: ".claude/skills/alpha" }]);

      const mutation = await post(address.port, "/api/skills", {});
      expect(mutation.status).toBe(404);
      expect(mutation.json.error.code).toBe("ROUTE_NOT_FOUND");
    } finally {
      await server.close();
      await fs.rm(home, { recursive: true, force: true });
    }
  });
});

// 润色/压缩端点（project-quest SPEC §5.7）：假 CLI 用 node -e 脚本模拟，不依赖真实 codex/claude
describe("prompt enhance endpoint (project-quest SPEC §5.7)", () => {
  const enhanceCapabilities = (supportsPromptEnhancement: boolean) => vi.fn(async () => ({
    adapterId: "codex" as const,
    compatibility: "supported" as const,
    detectedVersion: "0.145.0",
    permissions: [],
    modes: [],
    models: [],
    supportsComposer: true,
    supportsStructuredRecognition: true,
    supportsHeadlessTurns: true,
    supportsResume: true,
    supportsApproval: false,
    supportsPromptEnhancement
  }));

  async function bootEnhance(script: string, overrides: Partial<ApplicationDependencies> = {}, supportsPromptEnhancement = true) {
    const buildEnhance = vi.fn(async (_profile: unknown, config: { prompt: string }) => ({ command: process.execPath, args: ["-e", script, "--", config.prompt] }));
    const context = createDependencies({ profileAdapters: { availableAdapterIds: ["codex"], capabilities: enhanceCapabilities(supportsPromptEnhancement), buildEnhance }, ...overrides });
    context.state.profiles.push({ id: "profile-1", name: "Codex", command: "codex", args: [], adapterId: "codex", createdAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(context.dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: context.dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();
    return { ...context, server, address, buildEnhance };
  }

  it("runs the CLI once, trims stdout, and injects the locale instruction template", async () => {
    const { server, address, buildEnhance } = await bootEnhance("console.log('  Enhanced prompt.  ')");
    try {
      const response = await post(address.port, "/api/prompt/enhance", { profileId: "profile-1", action: "polish", content: "make login", locale: "zh" });
      expect(response.status).toBe(200);
      expect(response.json).toEqual({ content: "Enhanced prompt.", truncated: false });
      const prompt = buildEnhance.mock.calls[0][1].prompt;
      expect(prompt.endsWith("\n\nmake login")).toBe(true);
      expect(prompt.startsWith("将下面的任务提示词")).toBe(true);
    } finally {
      await server.close();
    }
  });

  it("maps empty CLI output to 502 ENHANCE_FAILED and keeps 32KiB input limit at 400", async () => {
    const { server, address } = await bootEnhance("process.exit(0)");
    try {
      const empty = await post(address.port, "/api/prompt/enhance", { profileId: "profile-1", action: "polish", content: "x" });
      expect(empty.status).toBe(502);
      expect(empty.json.error.code).toBe("ENHANCE_FAILED");

      const oversized = await post(address.port, "/api/prompt/enhance", { profileId: "profile-1", action: "polish", content: "y".repeat(32 * 1024 + 1) });
      expect(oversized.status).toBe(400);
      expect(oversized.json.error.code).toBe("VALIDATION_FAILED");

      const badAction = await post(address.port, "/api/prompt/enhance", { profileId: "profile-1", action: "expand", content: "x" });
      expect(badAction.status).toBe(400);
    } finally {
      await server.close();
    }
  });

  it("kills the CLI after enhanceTimeoutMs and reports 504 ENHANCE_TIMEOUT", async () => {
    const { server, address } = await bootEnhance("setTimeout(() => {}, 5000)", { policy: { readonly: false, processEnvironment: {}, enhanceTimeoutMs: 200 } });
    try {
      const response = await post(address.port, "/api/prompt/enhance", { profileId: "profile-1", action: "compress", content: "x" });
      expect(response.status).toBe(504);
      expect(response.json.error.code).toBe("ENHANCE_TIMEOUT");
    } finally {
      await server.close();
    }
  });

  it("rejects readonly mode and unsupported profiles without spawning the CLI", async () => {
    const readonlyBoot = await bootEnhance("console.log('never')", { policy: { readonly: true, processEnvironment: {} } });
    try {
      const denied = await post(readonlyBoot.address.port, "/api/prompt/enhance", { profileId: "profile-1", action: "polish", content: "x" });
      expect(denied.status).toBe(403);
      expect(denied.json.error.code).toBe("READONLY_MODE");
      expect(readonlyBoot.buildEnhance).not.toHaveBeenCalled();
    } finally {
      await readonlyBoot.server.close();
    }

    const unsupportedBoot = await bootEnhance("console.log('never')", {}, false);
    try {
      const unsupported = await post(unsupportedBoot.address.port, "/api/prompt/enhance", { profileId: "profile-1", action: "polish", content: "x" });
      expect(unsupported.status).toBe(400);
      expect(unsupported.json.error.code).toBe("ENHANCE_UNAVAILABLE");
      expect(unsupportedBoot.buildEnhance).not.toHaveBeenCalled();
    } finally {
      await unsupportedBoot.server.close();
    }
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

describe("issue 095 priority model route API", () => {
  it("persists successful Route and binding API requests through a real JSON repository", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-issue-095-persistence-"));
    const workspacePath = await fs.mkdtemp(path.join(dataDirectory, "workspace-"));
    const clock = { now: () => "2026-01-01T00:00:00Z" };
    const stateRepository = createJsonStateRepository({ dataDirectory, clock });
    const initialState: AppStateV3 = {
      workspaces: [{ id: "workspace-1", name: "Workspace", path: workspacePath, kind: "local-folder", createdAt: clock.now() }],
      profiles: [{ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: clock.now() }],
      sessions: [],
      providers: [],
      modelDeployments: [],
      modelRoutes: [],
      workspaceModelRouteBindings: []
    };
    let server: ReturnType<typeof createServer> | undefined;
    try {
      await stateRepository.save(initialState);
      await stateRepository.drain();
      const { dependencies } = createDependencies({ stateRepository });
      const application = await createApplication(dependencies);
      server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
      const address = await server.listen();

      const created = await post(address.port, "/api/model-routes", { id: "route-persisted", name: "Persisted route", candidateDeploymentIds: ["deployment-missing"] });
      expect(created.status).toBe(201);
      const updated = await patch(address.port, "/api/model-routes/route-persisted", { name: "Persisted route updated", candidateDeploymentIds: ["deployment-missing", "deployment-second-missing"] });
      expect(updated.status).toBe(200);
      expect((await put(address.port, "/api/model-routing/global", { routeId: "route-persisted" })).status).toBe(200);
      expect((await put(address.port, "/api/workspaces/workspace-1/model-route", { routeId: "route-persisted" })).status).toBe(200);
      await server.close();
      server = undefined;

      const reloaded = await createJsonStateRepository({ dataDirectory, clock }).load();
      expect(reloaded.modelRoutes).toEqual([expect.objectContaining({
        id: "route-persisted",
        name: "Persisted route updated",
        candidateDeploymentIds: ["deployment-missing", "deployment-second-missing"]
      })]);
      expect(reloaded.globalModelRouteId).toBe("route-persisted");
      expect(reloaded.workspaceModelRouteBindings).toEqual([{ workspaceId: "workspace-1", routeId: "route-persisted" }]);
    } finally {
      await server?.close();
      await fs.rm(dataDirectory, { recursive: true, force: true });
    }
  });

  it("independently covers route CRUD, validation, bindings, archive safety, rollback, and side-effect boundaries", async () => {
    const { dependencies, state } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" });
    state.sessions.push({ id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Session", interactionMode: "terminal", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1000, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" });
    state.modelRoutes = [{ id: "route-1", name: "Primary", enabled: true, candidateDeploymentIds: ["missing-deployment"], automaticTechnicalFallback: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }];
    state.workspaceModelRouteBindings = [];

    const backend = { get: vi.fn(), forProfile: vi.fn(), probe: vi.fn(), ids: ["generic"] } as unknown as NonNullable<ApplicationDependencies["agentBackends"]>;
    const persistentRuntime = { runTurn: vi.fn(), release: vi.fn(), shutdown: vi.fn(async () => undefined) } as unknown as NonNullable<ApplicationDependencies["persistentChatRuntime"]>;
    const secretStore = createMemorySecretStore({});
    const secretResolve = vi.spyOn(secretStore, "resolve");
    const secretStatus = vi.spyOn(secretStore, "status");
    dependencies.agentBackends = backend;
    dependencies.persistentChatRuntime = persistentRuntime;
    dependencies.secretStore = secretStore;
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    try {
      expect((await get(address.port, "/api/model-routes")).json.routes).toEqual(state.modelRoutes);

      const created = await post(address.port, "/api/model-routes", {
        id: "route-2", name: "Fallback", candidateDeploymentIds: ["missing-b", "missing-a"], automaticTechnicalFallback: true
      });
      expect(created.status).toBe(201);
      expect(created.json.route).toMatchObject({ id: "route-2", candidateDeploymentIds: ["missing-b", "missing-a"], automaticTechnicalFallback: true });
      expect((await get(address.port, "/api/model-routes/route-2")).json).toMatchObject({ id: "route-2" });
      const eightCandidates = await post(address.port, "/api/model-routes", { id: "route-eight", name: "Eight", candidateDeploymentIds: ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"] });
      expect(eightCandidates.status).toBe(201);
      expect(eightCandidates.json.route.candidateDeploymentIds).toEqual(["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"]);

      expect((await post(address.port, "/api/model-routes", { id: "route-1", name: "Duplicate", candidateDeploymentIds: ["missing"] })).json.error.code).toBe("MODEL_ROUTE_DUPLICATE");
      for (const [index, candidateDeploymentIds] of [[], ["duplicate", "duplicate"], ["1", "2", "3", "4", "5", "6", "7", "8", "9"], [7]] as Array<[number, unknown[]]>) {
        const invalid = await post(address.port, "/api/model-routes", { id: `invalid-${index}`, name: "Invalid", candidateDeploymentIds });
        expect(invalid.status).toBe(400);
        expect(invalid.json.error.code).toBe("MODEL_ROUTE_INVALID");
      }
      expect((await post(address.port, "/api/model-routes", { id: "route-invalid-name", name: " ", candidateDeploymentIds: ["missing"] })).json.error.code).toBe("MODEL_ROUTE_INVALID");
      expect((await post(address.port, "/api/model-routes", { id: 7, name: "Invalid", candidateDeploymentIds: ["missing"] })).json.error.code).toBe("MODEL_ROUTE_INVALID");

      const patched = await patch(address.port, "/api/model-routes/route-2", { name: "Updated", candidateDeploymentIds: ["missing-a"], enabled: false });
      expect(patched.status).toBe(200);
      expect(patched.json.route).toMatchObject({ id: "route-2", name: "Updated", enabled: false, candidateDeploymentIds: ["missing-a"] });
      for (const body of [{ name: " " }, { unknown: true }, { enabled: "yes" }, { candidateDeploymentIds: ["same", "same"] }]) {
        const invalid = await patch(address.port, "/api/model-routes/route-1", body);
        expect(invalid.status).toBe(400);
        expect(invalid.json.error.code).toBe("MODEL_ROUTE_INVALID");
      }
      expect((await get(address.port, "/api/model-routes/missing")).json.error.code).toBe("MODEL_ROUTE_NOT_FOUND");
      expect((await patch(address.port, "/api/model-routes/missing", { name: "Missing" })).json.error.code).toBe("MODEL_ROUTE_NOT_FOUND");
      expect((await del(address.port, "/api/model-routes/missing")).json.error.code).toBe("MODEL_ROUTE_NOT_FOUND");

      expect((await put(address.port, "/api/model-routing/global", { routeId: "missing" })).json.error.code).toBe("ROUTE_BINDING_INVALID");
      expect((await put(address.port, "/api/model-routing/global", { routeId: 7 })).json.error.code).toBe("ROUTE_BINDING_INVALID");
      expect((await put(address.port, "/api/model-routing/global", {})).json.error.code).toBe("ROUTE_BINDING_INVALID");
      expect((await put(address.port, "/api/model-routing/global", { routeId: "route-1" })).status).toBe(200);
      expect((await del(address.port, "/api/model-routes/route-1")).json.error.code).toBe("MODEL_ROUTE_IN_USE");
      expect((await put(address.port, "/api/model-routing/global", { routeId: null })).json).toEqual({ routeId: undefined });

      expect((await put(address.port, "/api/workspaces/missing/model-route", { routeId: "route-1" })).json.error.code).toBe("WORKSPACE_NOT_FOUND");
      expect((await put(address.port, "/api/workspaces/workspace-1/model-route", { routeId: "missing" })).json.error.code).toBe("ROUTE_BINDING_INVALID");
      expect((await put(address.port, "/api/workspaces/workspace-1/model-route", { routeId: "route-1" })).status).toBe(200);
      expect((await del(address.port, "/api/model-routes/route-1")).json.error.code).toBe("MODEL_ROUTE_IN_USE");
      expect((await put(address.port, "/api/workspaces/workspace-1/model-route", { routeId: null })).json).toMatchObject({ workspaceId: "workspace-1" });

      expect((await patch(address.port, "/api/sessions/session-1", { expectedRevision: 1, modelRouteId: "route-1" })).status).toBe(200);
      expect((await del(address.port, "/api/model-routes/route-1")).json.error.code).toBe("MODEL_ROUTE_IN_USE");
      expect((await patch(address.port, "/api/sessions/session-1", { expectedRevision: 2, modelRouteId: null })).status).toBe(200);

      expect((await del(address.port, "/api/model-routes/route-2")).status).toBe(200);
      const archivedAgain = await del(address.port, "/api/model-routes/route-2");
      expect(archivedAgain.status).toBe(409);
      expect(archivedAgain.json.error.code).toBe("MODEL_ROUTE_INVALID");
      expect((await put(address.port, "/api/model-routing/global", { routeId: "route-2" })).json.error.code).toBe("ROUTE_BINDING_INVALID");

      const save = vi.mocked(dependencies.stateRepository.save);
      save.mockRejectedValueOnce(new Error("route post save failure"));
      const postFailure = await post(address.port, "/api/model-routes", { id: "route-post-failure", name: "Rollback", candidateDeploymentIds: ["missing"] });
      expect(postFailure.status).toBe(500);
      expect(state.modelRoutes?.some((route) => route.id === "route-post-failure")).toBe(false);

      save.mockResolvedValue(undefined);
      const rollbackRoute = await post(address.port, "/api/model-routes", { id: "route-rollback", name: "Rollback", candidateDeploymentIds: ["missing"] });
      expect(rollbackRoute.status).toBe(201);
      const routeBeforePatchFailure = structuredClone(state.modelRoutes?.find((route) => route.id === "route-rollback"));
      save.mockRejectedValueOnce(new Error("route patch save failure"));
      expect((await patch(address.port, "/api/model-routes/route-rollback", { name: "Changed" })).status).toBe(500);
      expect(state.modelRoutes?.find((route) => route.id === "route-rollback")).toEqual(routeBeforePatchFailure);

      save.mockRejectedValueOnce(new Error("route delete save failure"));
      expect((await del(address.port, "/api/model-routes/route-rollback")).status).toBe(500);
      expect(state.modelRoutes?.find((route) => route.id === "route-rollback")).toEqual(routeBeforePatchFailure);

      save.mockRejectedValueOnce(new Error("global binding save failure"));
      expect((await put(address.port, "/api/model-routing/global", { routeId: "route-rollback" })).status).toBe(500);
      expect(state.globalModelRouteId).toBeUndefined();

      save.mockRejectedValueOnce(new Error("workspace binding save failure"));
      expect((await put(address.port, "/api/workspaces/workspace-1/model-route", { routeId: "route-rollback" })).status).toBe(500);
      expect(state.workspaceModelRouteBindings).toEqual([]);

      expect(vi.mocked(backend.get)).not.toHaveBeenCalled();
      expect(vi.mocked(backend.forProfile)).not.toHaveBeenCalled();
      expect(vi.mocked(backend.probe)).not.toHaveBeenCalled();
      expect(vi.mocked(persistentRuntime.runTurn)).not.toHaveBeenCalled();
      expect(secretResolve).not.toHaveBeenCalled();
      expect(secretStatus).not.toHaveBeenCalled();
      expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("returns stable readonly errors for route mutations without touching persistence or runtimes", async () => {
    const { dependencies, state } = createDependencies({ policy: { readonly: true, processEnvironment: {} } });
    state.modelRoutes = [{ id: "route-1", name: "Primary", enabled: true, candidateDeploymentIds: ["missing"], automaticTechnicalFallback: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }];
    state.workspaceModelRouteBindings = [];
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    try {
      expect((await get(address.port, "/api/model-routes")).status).toBe(200);
      for (const response of [
        await post(address.port, "/api/model-routes", { id: "route-2", name: "Nope", candidateDeploymentIds: ["missing"] }),
        await patch(address.port, "/api/model-routes/route-1", { name: "Nope" }),
        await del(address.port, "/api/model-routes/route-1"),
        await put(address.port, "/api/model-routing/global", { routeId: "route-1" }),
        await put(address.port, "/api/workspaces/workspace-1/model-route", { routeId: "route-1" })
      ]) {
        expect(response.status).toBe(403);
        expect(response.json.error.code).toBe("READONLY_MODE");
      }
      expect(dependencies.stateRepository.save).not.toHaveBeenCalled();
      expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
});

describe("issue 097 route binding, preflight, and one-shot override API", () => {
  const now = "2026-01-01T00:00:00Z";
  const capabilities = {
    adapterId: "codex" as const,
    compatibility: "supported" as const,
    permissions: [],
    modes: [],
    models: [
      { id: "model-1", labelKey: "model-1", requiresRestart: false },
      { id: "model-2", labelKey: "model-2", requiresRestart: false },
      { id: "foreign-model", labelKey: "foreign-model", requiresRestart: false }
    ],
    supportsComposer: true,
    supportsStructuredRecognition: true,
    supportsHeadlessTurns: true,
    supportsResume: true,
    supportsApproval: false,
    supportsPromptEnhancement: false
  };

  function createIssue097ExecutionSpy() {
    return {
      append: vi.fn(),
      createTask: vi.fn(),
      createAttempt: vi.fn(),
      transitionTask: vi.fn(),
      transitionAttempt: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      drain: vi.fn()
    } as unknown as NonNullable<ApplicationDependencies["executionRepository"]>;
  }

  function createIssue097AgentRegistry() {
    const runTurn = vi.fn(async () => ({
      events: (async function* () { /* no fabricated transcript event; result is enough */ })(),
      result: Promise.resolve({ status: "completed" as const, nativeSessionId: "native-097" }),
      cancel: vi.fn()
    }));
    const openSession = vi.fn(async () => ({
      ref: { backendId: "codex", nativeSessionId: "native-097", transport: "json-stream" as const },
      selectedTransport: "json-stream" as const,
      runTurn,
      close: vi.fn(async () => undefined)
    }));
    const backend = {
      id: "codex",
      supportedTransports: ["json-stream"] as const,
      probe: vi.fn(async () => capabilities),
      openSession
    };
    const registry = {
      ids: ["codex"],
      get: vi.fn(() => backend),
      forProfile: vi.fn(() => backend),
      probe: vi.fn(async () => capabilities)
    } as unknown as NonNullable<ApplicationDependencies["agentBackends"]>;
    return { backend, openSession, registry, runTurn };
  }

  async function createIssue097Context(options: { interactionMode?: "chat" | "terminal"; executionRepository?: NonNullable<ApplicationDependencies["executionRepository"]>; secretCanary?: string } = {}) {
    const secretStore = createMemorySecretStore();
    const secretCanary = options.secretCanary ?? "issue-097-primary-secret";
    const primaryCredential = await secretStore.put({ providerId: "provider-097" }, secretCanary);
    const foreignCredential = await secretStore.put({ providerId: "provider-097-foreign" }, `${secretCanary}-foreign`);
    const agent = createIssue097AgentRegistry();
    const profileAdapters = {
      availableAdapterIds: ["codex"],
      capabilities: vi.fn(async () => capabilities),
      resolveLaunch: vi.fn(async (profile: AppStateV3["profiles"][number], config: { model: string | null }) => ({
        command: profile.command,
        args: config.model ? ["--model", config.model] : [],
        capabilities
      }))
    };
    const persistentChatRuntime = {
      runTurn: vi.fn(),
      release: vi.fn(),
      shutdown: vi.fn(async () => undefined)
    } as unknown as NonNullable<ApplicationDependencies["persistentChatRuntime"]>;
    const context = createDependencies({
      secretStore,
      agentBackends: agent.registry,
      executionRepository: options.executionRepository ?? createIssue097ExecutionSpy(),
      persistentChatRuntime,
      profileAdapters,
      modelSyncReader: vi.fn(async (profile) => profile.syncedModels ?? [])
    });
    context.state.workspaces.push({ id: "workspace-097", name: "Issue 097 workspace", path: "/tmp/issue-097", kind: "local-folder", createdAt: now });
    context.state.profiles.push(
      { id: "profile-097", name: "Issue 097 engine", command: "codex", args: [], adapterId: "codex", createdAt: now },
      { id: "profile-097-foreign", name: "Issue 097 foreign engine", command: "codex-foreign", args: [], adapterId: "codex", createdAt: now }
    );
    context.state.providers = [
      { id: "provider-097", name: "Issue 097 provider", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", models: ["model-1", "model-2"], supportedEngineIds: ["codex"], credentialRef: primaryCredential, enabled: true, createdAt: now, updatedAt: now },
      { id: "provider-097-foreign", name: "Issue 097 foreign provider", protocol: "openai-compatible", baseUrl: "https://foreign.example/v1", models: ["foreign-model"], supportedEngineIds: ["codex"], credentialRef: foreignCredential, enabled: true, createdAt: now, updatedAt: now }
    ];
    context.state.modelDeployments = [
      { id: "deployment-097-1", name: "Issue 097 primary", providerId: "provider-097", profileId: "profile-097", modelId: "model-1", enabled: true, createdAt: now, updatedAt: now },
      { id: "deployment-097-2", name: "Issue 097 backup", providerId: "provider-097", profileId: "profile-097", modelId: "model-2", enabled: true, createdAt: now, updatedAt: now },
      { id: "deployment-097-disabled", name: "Issue 097 disabled", providerId: "provider-097", profileId: "profile-097", modelId: "model-1", enabled: false, createdAt: now, updatedAt: now },
      { id: "deployment-097-foreign", name: "Issue 097 foreign", providerId: "provider-097-foreign", profileId: "profile-097-foreign", modelId: "foreign-model", enabled: true, createdAt: now, updatedAt: now }
    ];
    context.state.modelRoutes = [
      { id: "route-097-global", name: "Global", enabled: true, candidateDeploymentIds: ["deployment-097-1"], automaticTechnicalFallback: false, createdAt: now, updatedAt: now },
      { id: "route-097-project", name: "Project", enabled: true, candidateDeploymentIds: ["deployment-097-2"], automaticTechnicalFallback: false, createdAt: now, updatedAt: now },
      { id: "route-097-session", name: "Session", enabled: true, candidateDeploymentIds: ["deployment-097-2", "deployment-097-disabled"], automaticTechnicalFallback: false, createdAt: now, updatedAt: now },
      { id: "route-097-valid", name: "Valid", enabled: true, candidateDeploymentIds: ["deployment-097-1", "deployment-097-2"], automaticTechnicalFallback: false, createdAt: now, updatedAt: now },
      { id: "route-097-no-candidate", name: "No candidate", enabled: true, candidateDeploymentIds: ["deployment-097-missing"], automaticTechnicalFallback: false, createdAt: now, updatedAt: now },
      { id: "route-097-unsupported", name: "Unsupported", enabled: true, candidateDeploymentIds: ["deployment-097-foreign"], automaticTechnicalFallback: false, createdAt: now, updatedAt: now },
      { id: "route-097-archived", name: "Archived", enabled: false, archivedAt: "2026-01-02T00:00:00Z", candidateDeploymentIds: ["deployment-097-1"], automaticTechnicalFallback: false, createdAt: now, updatedAt: now }
    ];
    context.state.sessions.push({
      id: "session-097", workspaceId: "workspace-097", profileId: "profile-097", name: "Issue 097 chat", interactionMode: options.interactionMode ?? "chat",
      runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1,
      launchConfig: { permission: null, mode: null, model: "legacy-model" },
      modelRouteId: "route-097-valid", chatContext: { activeModel: "model-1" },
      backendSessionRef: { backendId: "codex", transport: "json-stream" }, revision: 1, createdAt: now, lastActiveAt: now
    });
    return { ...context, agent, persistentChatRuntime, profileAdapters, secretStore, secretCanary };
  }

  async function startIssue097Server(dependencies: ApplicationDependencies) {
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "issue-097-request" });
    const address = await server.listen();
    return { server, address };
  }

  async function waitForIssue097(predicate: () => Promise<boolean> | boolean, timeoutMs = 5_000) {
    const started = Date.now();
    while (!(await predicate())) {
      if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for issue 097 execution evidence.");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  it("issue 097 sets and clears Session modelRouteId with stable missing, archived, and revision errors", async () => {
    const context = await createIssue097Context();
    context.state.globalModelRouteId = undefined;
    context.state.workspaceModelRouteBindings = [];
    const { server, address } = await startIssue097Server(context.dependencies);
    const session = context.state.sessions[0];
    try {
      const set = await patch(address.port, "/api/sessions/session-097", { expectedRevision: 1, modelRouteId: "route-097-session" });
      expect(set.status).toBe(200);
      expect(set.json).toMatchObject({ id: "session-097", modelRouteId: "route-097-session", revision: 2 });

      const clear = await patch(address.port, "/api/sessions/session-097", { expectedRevision: 2, modelRouteId: null });
      expect(clear.status).toBe(200);
      expect(clear.json).toMatchObject({ id: "session-097", revision: 3 });
      expect(clear.json.modelRouteId).toBeUndefined();

      const beforeMissing = structuredClone(session);
      const missing = await patch(address.port, "/api/sessions/session-097", { expectedRevision: 3, modelRouteId: "route-097-missing" });
      expect(missing.status).toBe(400);
      expect(missing.json.error.code).toBe("ROUTE_BINDING_INVALID");
      expect(session).toEqual(beforeMissing);

      const archived = await patch(address.port, "/api/sessions/session-097", { expectedRevision: 3, modelRouteId: "route-097-archived" });
      expect(archived.status).toBe(400);
      expect(archived.json.error.code).toBe("ROUTE_BINDING_INVALID");
      expect(session).toEqual(beforeMissing);

      const conflict = await patch(address.port, "/api/sessions/session-097", { expectedRevision: 99, modelRouteId: "route-097-session" });
      expect(conflict.status).toBe(409);
      expect(conflict.json.error.code).toBe("SESSION_REVISION_CONFLICT");
      expect(session).toEqual(beforeMissing);
    } finally {
      await server.close();
    }
  });

  it("issue 097 rolls back Session binding state when persistence fails", async () => {
    const context = await createIssue097Context();
    const { server, address } = await startIssue097Server(context.dependencies);
    const before = structuredClone(context.state.sessions[0]);
    try {
      vi.mocked(context.dependencies.stateRepository.save).mockRejectedValueOnce(new Error("issue-097 session save failure"));
      const response = await patch(address.port, "/api/sessions/session-097", { expectedRevision: 1, modelRouteId: "route-097-session" });
      expect(response.status).toBe(500);
      expect(context.state.sessions[0]).toEqual(before);
    } finally {
      await server.close();
    }
  });

  it("issue 097 rejects Session route binding mutations in readonly mode without state changes", async () => {
    const context = await createIssue097Context();
    context.dependencies.policy = { readonly: true, processEnvironment: {} };
    const before = structuredClone(context.state.sessions[0]);
    const { server, address } = await startIssue097Server(context.dependencies);
    try {
      const response = await patch(address.port, "/api/sessions/session-097", { expectedRevision: 1, modelRouteId: "route-097-session" });
      expect(response.status).toBe(403);
      expect(response.json.error.code).toBe("READONLY_MODE");
      expect(context.state.sessions[0]).toEqual(before);
      expect(context.dependencies.stateRepository.save).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("issue 097 resolves global < project < session < run precedence and fixed-target failures", async () => {
    const context = await createIssue097Context();
    context.state.globalModelRouteId = "route-097-global";
    context.state.workspaceModelRouteBindings = [{ workspaceId: "workspace-097", routeId: "route-097-project" }];
    context.state.sessions[0].modelRouteId = "route-097-session";
    const { server, address } = await startIssue097Server(context.dependencies);
    try {
      const eligible = await post(address.port, "/api/sessions/session-097/model-route/resolve", { fixedDeploymentId: "deployment-097-2" });
      expect(eligible.status).toBe(200);
      expect(eligible.json.resolvedRoute).toMatchObject({ kind: "route", routeId: "route-097-session", selectedDeploymentId: "deployment-097-2", fixedDeploymentId: "deployment-097-2", canSend: true });
      expect(eligible.json.resolvedRoute.sourceTrace).toEqual([
        { field: "routeId", source: "global", value: "route-097-global" },
        { field: "routeId", source: "project", value: "route-097-project" },
        { field: "routeId", source: "session", value: "route-097-session" },
        { field: "fixedDeploymentId", source: "run", value: "deployment-097-2" }
      ]);
      expect(eligible.json.resolvedRoute.candidates).toEqual([
        expect.objectContaining({ deploymentId: "deployment-097-2", position: 1, eligible: true }),
        expect.objectContaining({ deploymentId: "deployment-097-disabled", position: 2, eligible: false })
      ]);

      for (const fixedDeploymentId of ["deployment-097-1", "deployment-097-missing", "deployment-097-disabled"]) {
        const unavailable = await post(address.port, "/api/sessions/session-097/model-route/resolve", { fixedDeploymentId });
        expect(unavailable.status).toBe(200);
        expect(unavailable.json.resolvedRoute).toMatchObject({ canSend: false, errorCode: "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE", fixedDeploymentId });
      }

      context.state.sessions[0].modelRouteId = "route-097-no-candidate";
      const noCandidate = await post(address.port, "/api/sessions/session-097/model-route/resolve", {});
      expect(noCandidate.status).toBe(200);
      expect(noCandidate.json.resolvedRoute).toMatchObject({ kind: "route", routeId: "route-097-no-candidate", canSend: false, errorCode: "ROUTE_NO_CANDIDATE" });
    } finally {
      await server.close();
    }
  });

  it("issue 097 keeps legacy no-route resolution explicit and rejects fixed legacy overrides", async () => {
    const context = await createIssue097Context();
    context.state.globalModelRouteId = undefined;
    context.state.workspaceModelRouteBindings = [];
    delete context.state.sessions[0].modelRouteId;
    context.state.sessions[0].chatContext = { activeModel: "model-2" };
    const { server, address } = await startIssue097Server(context.dependencies);
    try {
      const legacy = await post(address.port, "/api/sessions/session-097/model-route/resolve", {});
      expect(legacy.status).toBe(200);
      expect(legacy.json.resolvedRoute).toMatchObject({ kind: "legacy-profile-model", legacyResolution: { profileId: "profile-097", modelId: "model-2", source: "active-model" }, candidates: [], executableCandidates: [], canSend: true });
      expect(legacy.json.resolvedRoute).not.toHaveProperty("selectedDeploymentId");

      const fixedLegacy = await post(address.port, "/api/sessions/session-097/model-route/resolve", { fixedDeploymentId: "deployment-097-1" });
      expect(fixedLegacy.status).toBe(200);
      expect(fixedLegacy.json.resolvedRoute).toMatchObject({ kind: "legacy-profile-model", canSend: false, errorCode: "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE", fixedDeploymentId: "deployment-097-1" });
    } finally {
      await server.close();
    }
  });

  it("issue 097 fails message preflight before transcript, task, attempt, PTY, Agent, or persistent side effects", async () => {
    const context = await createIssue097Context();
    context.state.sessions.push({
      ...structuredClone(context.state.sessions[0]),
      id: "session-097-terminal", interactionMode: "terminal", modelRouteId: "route-097-no-candidate", revision: 1
    });
    const { server, address } = await startIssue097Server(context.dependencies);
    const executionRepository = context.dependencies.executionRepository!;
    try {
      const cases = [
        { sessionId: "session-097", routeId: "route-097-valid", clientMessageId: "issue-097-invalid-shape", body: { clientMessageId: "issue-097-invalid-shape", content: "invalid", routeOverride: {}, startIfStopped: true, confirmedStart: true }, status: 400, code: "MODEL_ROUTE_INVALID" },
        { sessionId: "session-097", routeId: "route-097-valid", clientMessageId: "issue-097-fixed-missing", body: { clientMessageId: "issue-097-fixed-missing", content: "fixed", routeOverride: { fixedDeploymentId: "deployment-097-missing" }, startIfStopped: true, confirmedStart: true }, status: 409, code: "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE" },
        { sessionId: "session-097", routeId: "route-097-no-candidate", clientMessageId: "issue-097-no-candidate", body: { clientMessageId: "issue-097-no-candidate", content: "none", startIfStopped: true, confirmedStart: true }, status: 409, code: "ROUTE_NO_CANDIDATE" },
        { sessionId: "session-097-terminal", routeId: "route-097-no-candidate", clientMessageId: "issue-097-terminal-no-candidate", body: { clientMessageId: "issue-097-terminal-no-candidate", content: "terminal", startIfStopped: true, confirmedStart: true }, status: 409, code: "ROUTE_NO_CANDIDATE" }
      ] as const;
      for (const testCase of cases) {
        context.state.sessions.find((session) => session.id === testCase.sessionId)!.modelRouteId = testCase.routeId;
        const response = await post(address.port, `/api/sessions/${testCase.sessionId}/messages`, testCase.body);
        expect(response.status).toBe(testCase.status);
        expect(response.json.error.code).toBe(testCase.code);
      }

      context.state.sessions[0].modelRouteId = "route-097-unsupported";
      const before = structuredClone(context.state.sessions);
      const unsupported = await post(address.port, "/api/sessions/session-097/messages", { clientMessageId: "issue-097-unsupported", content: "unsupported", startIfStopped: true, confirmedStart: true });
      expect(unsupported.status).toBe(409);
      expect(unsupported.json.error.code).toBe("ROUTE_UNSUPPORTED_ENGINE");

      expect(context.dependencies.transcriptRepository.append).not.toHaveBeenCalled();
      expect(executionRepository.createTask).not.toHaveBeenCalled();
      expect(executionRepository.createAttempt).not.toHaveBeenCalled();
      expect(context.dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
      expect(context.agent.registry.forProfile).not.toHaveBeenCalled();
      expect(context.agent.openSession).not.toHaveBeenCalled();
      expect(context.agent.runTurn).not.toHaveBeenCalled();
      expect(context.persistentChatRuntime.runTurn).not.toHaveBeenCalled();
      expect(context.dependencies.stateRepository.save).not.toHaveBeenCalled();
      expect(context.state.sessions).toEqual(before);
    } finally {
      await server.close();
    }
  });

  it("issue 097 isolates one-shot fixed deployment across success, failure, and the next request", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-issue-097-execution-"));
    const context = await createIssue097Context({ executionRepository: createJsonExecutionRepository({ dataDirectory, clock: { now: () => now } }) });
    let generatedId = 0;
    context.dependencies.idGenerator = { create: vi.fn((prefix) => `${prefix}-097-${++generatedId}`) };
    context.state.globalModelRouteId = undefined;
    context.state.workspaceModelRouteBindings = [];
    const { server, address } = await startIssue097Server(context.dependencies);
    try {
      const first = await post(address.port, "/api/sessions/session-097/messages", { clientMessageId: "issue-097-fixed-success", content: "fixed success", routeOverride: { fixedDeploymentId: "deployment-097-2" }, startIfStopped: true, confirmedStart: true });
      expect(first.status).toBe(202);
      await waitForIssue097(async () => Boolean((await context.dependencies.executionRepository!.get(first.json.taskId))?.task.state === "completed"));
      const firstSnapshot = await context.dependencies.executionRepository!.get(first.json.taskId);
      expect(firstSnapshot?.task.resolvedRoute).toMatchObject({ fixedDeploymentId: "deployment-097-2", selectedDeploymentId: "deployment-097-2" });
      expect(context.state.sessions[0]).not.toHaveProperty("fixedDeploymentId");

      const beforeFailure = structuredClone(context.state.sessions[0]);
      const failed = await post(address.port, "/api/sessions/session-097/messages", { clientMessageId: "issue-097-fixed-failure", content: "fixed failure", routeOverride: { fixedDeploymentId: "deployment-097-missing" } });
      expect(failed.status).toBe(409);
      expect(failed.json.error.code).toBe("ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE");
      expect(context.state.sessions[0]).toEqual(beforeFailure);
      expect(context.state.sessions[0]).not.toHaveProperty("fixedDeploymentId");

      const second = await post(address.port, "/api/sessions/session-097/messages", { clientMessageId: "issue-097-no-inherit", content: "no inherit" });
      expect(second.status).toBe(202);
      await waitForIssue097(async () => Boolean((await context.dependencies.executionRepository!.get(second.json.taskId))?.task.state === "completed"));
      const secondSnapshot = await context.dependencies.executionRepository!.get(second.json.taskId);
      expect(secondSnapshot?.task.resolvedRoute).toMatchObject({ selectedDeploymentId: "deployment-097-1" });
      expect(secondSnapshot?.task.resolvedRoute.fixedDeploymentId).toBeUndefined();
      expect(context.state.sessions[0]).not.toHaveProperty("fixedDeploymentId");
    } finally {
      await server.close();
      await fs.rm(dataDirectory, { recursive: true, force: true });
    }
  });

  it("issue 097 preserves legacy no-route chat behavior without a Deployment identity", async () => {
    const context = await createIssue097Context();
    context.state.modelDeployments = [];
    context.state.modelRoutes = [];
    context.state.globalModelRouteId = undefined;
    context.state.workspaceModelRouteBindings = [];
    delete context.state.sessions[0].modelRouteId;
    context.state.sessions[0].chatContext = undefined;
    const { server, address } = await startIssue097Server(context.dependencies);
    try {
      const sent = await post(address.port, "/api/sessions/session-097/messages", { clientMessageId: "issue-097-legacy", content: "legacy", startIfStopped: true, confirmedStart: true });
      expect(sent.status).toBe(202);
      expect(sent.json).not.toHaveProperty("resolvedDeployment");
      expect(context.state.sessions[0]).not.toHaveProperty("modelRouteId");
      expect(context.agent.openSession).toHaveBeenCalledOnce();
      expect(context.agent.runTurn).toHaveBeenCalledWith(expect.objectContaining({ model: "legacy-model" }));
      expect(context.dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("issue 097 starts a legacy no-route terminal with the legacy model and no route or deployment identity", async () => {
    const context = await createIssue097Context({ interactionMode: "terminal" });
    context.state.modelDeployments = [];
    context.state.modelRoutes = [];
    context.state.globalModelRouteId = undefined;
    context.state.workspaceModelRouteBindings = [];
    delete context.state.sessions[0].modelRouteId;
    context.state.sessions[0].chatContext = undefined;
    context.state.sessions[0].launchConfig = { permission: null, mode: null, model: "legacy-model" };
    context.dependencies.policy = { readonly: false, processEnvironment: { ISSUE_097_LEGACY_ENV: "legacy-env" } };
    const { server, address } = await startIssue097Server(context.dependencies);
    try {
      const started = await post(address.port, "/api/sessions/session-097/start", { confirmed: true });
      expect(started.status).toBe(200);
      expect(started.json).not.toHaveProperty("resolvedDeployment");
      expect(started.json).not.toHaveProperty("routeId");

      const spawn = vi.mocked(context.dependencies.ptyRuntime.spawn).mock.calls.at(-1)?.[0];
      expect(spawn).toMatchObject({ command: "codex", args: ["--model", "legacy-model"], env: expect.objectContaining({ ISSUE_097_LEGACY_ENV: "legacy-env" }) });
      expect(spawn?.env).not.toHaveProperty("SPECOS_DEPLOYMENT_ID");
      expect(JSON.stringify(spawn)).not.toContain("deployment-097");
      expect(context.state.sessions[0]).not.toHaveProperty("modelRouteId");
      expect(context.state.sessions[0]).not.toHaveProperty("fixedDeploymentId");
      expect(context.state.modelDeployments).toEqual([]);
      expect(context.state.modelRoutes).toEqual([]);
      expect(context.state.globalModelRouteId).toBeUndefined();
      expect(context.state.workspaceModelRouteBindings).toEqual([]);
    } finally {
      await server.close();
    }
  });

  it("issue 097 redacts provider secrets and credential refs from resolve, deployment summaries, failures, and logs", async () => {
    const secretCanary = "issue-097-secret-canary-20260805-7f3b";
    const context = await createIssue097Context({ secretCanary });
    context.state.globalModelRouteId = undefined;
    context.state.workspaceModelRouteBindings = [];
    context.state.sessions[0].modelRouteId = "route-097-valid";
    const resolveSecret = vi.spyOn(context.secretStore, "resolve");
    const statusSecret = vi.spyOn(context.secretStore, "status");
    const { server, address } = await startIssue097Server(context.dependencies);
    try {
      const resolved = await post(address.port, "/api/sessions/session-097/model-route/resolve", {});
      const preview = await post(address.port, "/api/model-routes/route-097-valid/resolve", { profileId: "profile-097", workspaceId: "workspace-097" });
      const failedPreflight = await post(address.port, "/api/sessions/session-097/messages", {
        clientMessageId: "issue-097-redaction-failure", content: "redaction failure",
        routeOverride: { fixedDeploymentId: "deployment-097-missing" }
      });

      expect(resolved.status).toBe(200);
      expect(preview.status).toBe(200);
      expect(failedPreflight.status).toBe(409);
      expect(failedPreflight.json.error.code).toBe("ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE");
      expect(statusSecret).toHaveBeenCalled();
      expect(resolveSecret).not.toHaveBeenCalled();

      const responseAndLogs = [
        resolved.json,
        preview.json,
        failedPreflight.json,
        context.dependencies.logger.info.mock.calls,
        context.dependencies.logger.warn.mock.calls,
        context.dependencies.logger.error.mock.calls
      ];
      for (const value of responseAndLogs) {
        const serialized = JSON.stringify(value);
        expect(serialized).not.toContain(secretCanary);
        expect(serialized).not.toContain("credentialRef");
      }
      for (const deployment of preview.json.deployments) {
        expect(deployment).not.toHaveProperty("credentialRef");
        expect(JSON.stringify(deployment)).not.toContain(secretCanary);
      }
      expect(JSON.stringify(resolved.json.resolvedRoute)).not.toContain(secretCanary);
      expect(JSON.stringify(context.state)).not.toContain(secretCanary);
    } finally {
      await server.close();
    }
  });

  it("issue 102 serves restart-stable history APIs after config deletion and isolates fork/delete lifecycle", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-issue-102-history-api-"));
    const repository = createJsonExecutionRepository({ dataDirectory, clock: { now: () => now } });
    const context = await createIssue097Context({ executionRepository: repository, secretCanary: "issue-102-secret-canary" });
    const task: ExecutionTask = {
      id: "task-102-history", sessionId: "session-097", turnId: "turn-102-history",
      input: { transcriptEventId: "event-102-history", sha256: "c".repeat(64) },
      resolvedRoute: {
        kind: "route", routeId: "route-097-valid", resolvedAt: now,
        sourceTrace: [{ field: "routeId", source: "session", value: "route-097-valid" }],
        candidates: [{ deploymentId: "deployment-097-1", position: 1, eligible: true, exclusionCodes: [] }],
        executableCandidates: [{ deploymentId: "deployment-097-1", position: 1, eligible: true, exclusionCodes: [] }],
        selectedDeploymentId: "deployment-097-1", canSend: true
      },
      state: "created", revision: 1, createdAt: now
    };
    const primary: ExecutionAttempt = {
      id: "attempt-102-history", taskId: task.id, ordinal: 1, trigger: "primary",
      deployment: { deploymentId: "deployment-097-1", deploymentName: "Issue 097 primary", providerId: "provider-097", providerName: "Issue 097 provider", profileId: "profile-097", modelId: "model-1" },
      state: "created", revision: 1, sideEffect: { state: "clean", evidenceEventIds: [] }
    };
    try {
      await repository.createTask(task);
      await repository.createAttempt(primary);
      await repository.transitionTask(task.id, 1, { state: "running" }, now);
      await repository.transitionAttempt(task.id, primary.id, 1, { state: "running", startedAt: now }, now);
      await repository.transitionAttempt(task.id, primary.id, 2, {
        state: "failed", completedAt: now,
        failure: { code: "PROVIDER_AUTH_FAILED", class: "authentication", message: "secret=issue-102-secret-canary", fallbackEligible: false },
        sideEffect: { state: "clean", evidenceEventIds: [] }
      }, now);
      await repository.transitionTask(task.id, 2, { state: "failed", completedAt: now }, now);

      const confirmationTask: ExecutionTask = { ...structuredClone(task), id: "task-102-awaiting", turnId: "turn-102-awaiting", state: "created", revision: 1, completedAt: undefined };
      const confirmationAttempt: ExecutionAttempt = { ...structuredClone(primary), id: "attempt-102-awaiting", taskId: confirmationTask.id, state: "created", revision: 1, completedAt: undefined };
      await repository.createTask(confirmationTask);
      await repository.createAttempt(confirmationAttempt);
      await repository.transitionTask(confirmationTask.id, 1, { state: "running" }, now);
      await repository.transitionAttempt(confirmationTask.id, confirmationAttempt.id, 1, { state: "running", startedAt: now }, now);
      await repository.transitionAttempt(confirmationTask.id, confirmationAttempt.id, 2, {
        state: "failed", completedAt: now,
        failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable", message: "side effect unknown", fallbackEligible: true },
        sideEffect: { state: "unknown", evidenceEventIds: ["event-102-side-effect"] }
      }, now);
      await repository.transitionTask(confirmationTask.id, 2, { state: "awaiting_confirmation", confirmationToken: "confirm-102", confirmationInputSha256: confirmationTask.input.sha256 }, now);

      // Construct the application with a fresh repository to exercise restart/fold,
      // then remove current route resources: history must use frozen data.
      context.dependencies.executionRepository = createJsonExecutionRepository({ dataDirectory, clock: { now: () => now } });
      context.state.providers = [];
      context.state.modelDeployments = [];
      context.state.modelRoutes = [];
      const { server, address } = await startIssue097Server(context.dependencies);
      try {
        const restartConfirm = await post(address.port, `/api/execution-tasks/${confirmationTask.id}/confirm-retry`, {
          expectedRevision: 3, confirmationToken: "confirm-102", inputSha256: confirmationTask.input.sha256
        });
        expect(restartConfirm.status).toBe(409);
        expect(restartConfirm.json.error.code).toBe("ROUTE_REPLAY_CONFIRMATION_REQUIRED");
        const page = await get(address.port, "/api/sessions/session-097/execution-tasks?limit=1");
        const detail = await get(address.port, `/api/execution-tasks/${task.id}`);
        expect(page.status).toBe(200);
        expect(detail.status).toBe(200);
        expect(page.json.tasks).toHaveLength(1);
        expect(page.json.tasks[0]).toEqual(detail.json);
        const invalidCursor = await get(address.port, "/api/sessions/session-097/execution-tasks?after=not-a-cursor");
        expect(invalidCursor.status).toBe(400);
        expect(invalidCursor.json.error).toMatchObject({ code: "VALIDATION_FAILED", details: { field: "after" } });
        expect(detail.json).toMatchObject({ task: { id: task.id, state: "failed", revision: 3, resolvedRoute: { routeId: "route-097-valid", selectedDeploymentId: "deployment-097-1" } } });
        expect(detail.json.attempts).toHaveLength(1);
        expect(JSON.stringify(detail.json)).not.toContain("issue-102-secret-canary");
        expect(JSON.stringify(context.dependencies.logger)).not.toContain("issue-102-secret-canary");

        const completed = await post(address.port, "/api/sessions/session-097/complete", { expectedRevision: 1 });
        expect(completed.status).toBe(200);
        expect((await get(address.port, `/api/execution-tasks/${task.id}`)).json).toEqual(detail.json);

        const forked = await post(address.port, "/api/sessions/session-097/fork", { expectedRevision: 2, name: "History fork" });
        expect(forked.status).toBe(201);
        const childId = forked.json.session.id as string;
        expect((await get(address.port, `/api/sessions/${childId}/execution-tasks`)).json.tasks).toEqual([]);
        expect((await get(address.port, `/api/execution-tasks/${task.id}`)).status).toBe(200);

        expect((await del(address.port, `/api/sessions/${childId}`)).status).toBe(204);
        expect((await del(address.port, "/api/sessions/session-097")).status).toBe(204);
        expect((await get(address.port, `/api/execution-tasks/${task.id}`)).json.error.code).toBe("EXECUTION_NOT_FOUND");
      } finally {
        await server.close();
      }

      const afterDelete = createJsonExecutionRepository({ dataDirectory, clock: { now: () => now } });
      await expect(afterDelete.list("session-097")).resolves.toMatchObject({ tasks: [] });
      const source = await fs.readFile(path.join(dataDirectory, "executions", `${encodeURIComponent("session-097")}.jsonl`), "utf8").catch(() => "");
      expect(source).not.toContain("issue-102-secret-canary");
    } finally {
      await fs.rm(dataDirectory, { recursive: true, force: true });
    }
  });

  it("issue 102 maps an Attempt persistence failure to a server error without changing the Task", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-issue-102-cancel-failure-"));
    const base = createJsonExecutionRepository({ dataDirectory, clock: { now: () => now } });
    const activeTask: ExecutionTask = {
      id: "task-102-cancel-failure", sessionId: "session-097", turnId: "turn-102-cancel-failure",
      input: { transcriptEventId: "event-102-cancel-failure", sha256: "d".repeat(64) },
      resolvedRoute: { kind: "route", routeId: "route-097-valid", resolvedAt: now, sourceTrace: [], candidates: [], executableCandidates: [], canSend: true },
      state: "created", revision: 1, createdAt: now
    };
    const activeAttempt: ExecutionAttempt = {
      id: "attempt-102-cancel-failure", taskId: activeTask.id, ordinal: 1, trigger: "primary",
      deployment: { deploymentId: "deployment-097-1", deploymentName: "Primary", providerId: "provider-097", providerName: "Provider", profileId: "profile-097", modelId: "model-1" },
      state: "created", revision: 1, sideEffect: { state: "clean", evidenceEventIds: [] }
    };
    try {
      await base.createTask(activeTask);
      await base.createAttempt(activeAttempt);
      await base.transitionTask(activeTask.id, 1, { state: "running" }, now);
      await base.transitionAttempt(activeTask.id, activeAttempt.id, 1, { state: "running", startedAt: now }, now);
      const failingRepository = {
        ...base,
        transitionAttempt: async (taskId: string, attemptId: string, expectedRevision: number, patch: Parameters<typeof base.transitionAttempt>[3], occurredAt: string) => {
          if (patch.state === "cancelled") throw new Error("injected attempt persistence failure");
          return base.transitionAttempt(taskId, attemptId, expectedRevision, patch, occurredAt);
        }
      } as NonNullable<ApplicationDependencies["executionRepository"]>;
      const context = await createIssue097Context({ executionRepository: failingRepository });
      const { server, address } = await startIssue097Server(context.dependencies);
      try {
        const response = await post(address.port, `/api/execution-tasks/${activeTask.id}/cancel`, { expectedRevision: 2 });
        expect(response.status).toBe(500);
        expect(response.json.error.code).toBe("EXECUTION_ATTEMPT_CANCEL_FAILED");
        expect((await base.get(activeTask.id))?.task.state).toBe("running");
      } finally {
        await server.close();
      }
    } finally {
      await fs.rm(dataDirectory, { recursive: true, force: true });
    }
  });

  it("issue 102 projects a non-secret Attempt summary into the Transcript after persistence", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-issue-102-transcript-summary-"));
    const context = await createIssue097Context({ executionRepository: createJsonExecutionRepository({ dataDirectory, clock: { now: () => now } }), secretCanary: "issue-102-transcript-secret" });
    let generatedId = 0;
    context.dependencies.idGenerator = { create: vi.fn((prefix) => `${prefix}-102-${++generatedId}`) };
    context.state.globalModelRouteId = undefined;
    context.state.workspaceModelRouteBindings = [];
    try {
      const { server, address } = await startIssue097Server(context.dependencies);
      try {
        const sent = await post(address.port, "/api/sessions/session-097/messages", {
          clientMessageId: "issue-102-summary-message", content: "summary test", startIfStopped: true, confirmedStart: true
        });
        expect(sent.status).toBe(202);
        await waitForIssue097(async () => Boolean((await context.dependencies.executionRepository!.get(sent.json.taskId))?.task.state === "completed"));
        await waitForIssue097(() => (context.transcripts.get("session-097") ?? []).some((event) => event.component?.type === "progress"));

        const summary = (context.transcripts.get("session-097") ?? []).find((event) => event.component?.type === "progress");
        expect(summary).toMatchObject({
          kind: "lifecycle",
          metadata: { taskId: sent.json.taskId, attemptId: sent.json.attemptId, attemptOrdinal: 1, attemptTrigger: "primary", attemptState: "completed", taskState: "completed" },
          component: { type: "progress", title: "Execution attempt", status: "completed", data: { taskId: sent.json.taskId, attemptId: sent.json.attemptId, ordinal: 1, trigger: "primary", state: "completed", taskState: "completed" } }
        });
        expect(JSON.stringify(summary)).not.toContain("issue-102-transcript-secret");
        expect(JSON.stringify(summary)).not.toContain("summary test");
      } finally {
        await server.close();
      }
    } finally {
      await fs.rm(dataDirectory, { recursive: true, force: true });
    }
  });
});
