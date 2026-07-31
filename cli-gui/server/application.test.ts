// @vitest-environment node
import http from "node:http";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
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
