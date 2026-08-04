// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppStateEnvelopeV2, AppStateEnvelopeV8, AppStateV2, AppStateV3 } from "../shared/types.js";
import { createJsonStateRepository, StateRepositoryError } from "./store.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function makeDataDirectory(prefix: string) {
  const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  roots.push(dataDirectory);
  return dataDirectory;
}

function buildV2Envelope(workspacePath: string): AppStateEnvelopeV2 {
  const state: AppStateV2 = {
    workspaces: [{ id: "workspace-1", name: "Workspace", path: workspacePath, createdAt: "2026-01-01T00:00:00Z", lastOpenedAt: "2026-01-02T00:00:00Z" }],
    profiles: [
      { id: "profile-codex", name: "Codex CLI", command: "codex", args: ["--foo"], adapterId: "codex", createdAt: "2026-01-01T00:00:00Z" },
      { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], adapterId: "claude-code", adapterVersionRange: ">=1", createdAt: "2026-01-01T00:00:00Z" }
    ],
    sessions: [
      {
        id: "session-1", workspaceId: "workspace-1", profileId: "profile-codex", name: "Root session",
        runtimeStatus: "stopped", organizationStatus: "active", pinned: true, manualOrder: 1000,
        launchConfig: { permission: "on-request", mode: "workspace-write", model: "gpt-5" },
        createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-03T00:00:00Z", exitCode: 7, revision: 4
      },
      {
        id: "session-2", workspaceId: "workspace-1", profileId: "profile-claude", name: "Fork session",
        runtimeStatus: "stopped", organizationStatus: "completed", pinned: false, manualOrder: 2000,
        launchConfig: { permission: null, mode: null, model: null },
        parentSessionId: "session-1", forkEventId: "event-9", forkSequence: 9, forkedAt: "2026-01-02T00:00:00Z",
        createdAt: "2026-01-02T00:00:00Z", lastActiveAt: "2026-01-02T12:00:00Z", completedAt: "2026-01-02T12:00:00Z", revision: 2
      }
    ]
  };
  return { schemaVersion: 2, state };
}

describe("JSON state repository lifecycle", () => {
  it("owns an isolated queue and drains the latest snapshot", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-");
    const repository = createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-01-01T00:00:00Z" } });
    const state: AppStateV3 = { workspaces: [], profiles: [], sessions: [] };

    const first = repository.save(state);
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", kind: "local-folder", createdAt: "2026-01-01T00:00:00Z" });
    const second = repository.save(state);
    state.workspaces[0].name = "Mutated after save";
    await Promise.all([first, second, repository.drain()]);

    const written = JSON.parse(await fs.readFile(path.join(dataDirectory, "state.json"), "utf8")) as AppStateEnvelopeV8;
    expect(written.schemaVersion).toBe(8);
    expect(written.state.workspaces[0].name).toBe("Workspace");
  });

  it("migrates a legacy v1 state only after canonical validation and preserves a backup", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-migration-");
    const workspacePath = await fs.mkdtemp(path.join(dataDirectory, "workspace-"));
    const legacy = {
      workspaces: [{ id: "workspace-1", name: "Workspace", path: workspacePath, createdAt: "2026-01-01T00:00:00Z" }],
      profiles: [{ id: "profile-1", name: "CLI", command: "cli", args: [], createdAt: "2026-01-01T00:00:00Z" }],
      sessions: [{ id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Session", status: "running", createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z", exitCode: 7 }]
    };
    const statePath = path.join(dataDirectory, "state.json");
    await fs.writeFile(statePath, JSON.stringify(legacy), "utf8");

    const state = await createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-01-02T00:00:00Z" } }).load();
    expect(state.sessions[0]).toMatchObject({ id: "session-1", interactionMode: "terminal", runtimeStatus: "stopped", exitCode: 7, organizationStatus: "active", revision: 1 });
    expect(state.workspaces[0].kind).toBe("local-folder");
    expect(JSON.parse(await fs.readFile(statePath, "utf8")).schemaVersion).toBe(8);
    expect(JSON.parse(await fs.readFile(`${statePath}.v1.bak`, "utf8")).sessions[0].id).toBe("session-1");
  });

  it("leaves corrupt input untouched and performs no writes in readonly mode", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-corrupt-");
    const statePath = path.join(dataDirectory, "state.json");
    await fs.writeFile(statePath, "{not-json", "utf8");
    const repository = createJsonStateRepository({ dataDirectory, readonly: true, clock: { now: () => "2026-01-01T00:00:00Z" } });
    await expect(repository.load()).rejects.toMatchObject<StateRepositoryError>({ code: "STATE_CORRUPT" });
    expect(await fs.readFile(statePath, "utf8")).toBe("{not-json");

    const emptyDirectory = path.join(dataDirectory, "readonly-empty");
    const readonlyEmpty = createJsonStateRepository({ dataDirectory: emptyDirectory, readonly: true, clock: { now: () => "2026-01-01T00:00:00Z" } });
    const state = await readonlyEmpty.load();
    expect(state.sessions).toEqual([]);
    await expect(fs.access(emptyDirectory)).rejects.toThrow();
  });
});

describe("schema v2/v3 -> v4 migration", () => {
  it("migrates a realistic v2 envelope without losing legacy fields and writes state.json.v2.bak once", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-v2v3-");
    const workspacePath = await fs.realpath(await fs.mkdtemp(path.join(dataDirectory, "workspace-")));
    const envelope = buildV2Envelope(workspacePath);
    const statePath = path.join(dataDirectory, "state.json");
    const original = JSON.stringify(envelope, null, 2);
    await fs.writeFile(statePath, original, "utf8");

    const repository = createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-02-01T00:00:00Z" } });
    const state = await repository.load();

    // 零丢失门禁：实体计数与字段值逐项相等（test-spec §3.4）。
    expect(state.workspaces).toHaveLength(1);
    expect(state.profiles).toHaveLength(2);
    expect(state.sessions).toHaveLength(2);
    expect(state.workspaces[0]).toEqual({ ...envelope.state.workspaces[0], path: workspacePath, kind: "local-folder" });
    expect(state.profiles).toEqual(envelope.state.profiles);
    expect(state.sessions[0]).toMatchObject({ ...envelope.state.sessions[0], interactionMode: "terminal", backendId: "codex" });
    expect(state.sessions[1]).toMatchObject({ ...envelope.state.sessions[1], interactionMode: "terminal", backendId: "claude" });

    // 写回后 envelope 升级为 v4，且源版本备份 state.json.v2.bak 保留原始内容。
    await repository.drain();
    const written = JSON.parse(await fs.readFile(statePath, "utf8")) as AppStateEnvelopeV8;
    expect(written.schemaVersion).toBe(8);
    expect(await fs.readFile(`${statePath}.v2.bak`, "utf8")).toBe(original);

    // 重复加载：已是 v4，备份不被覆盖。
    await fs.writeFile(`${statePath}.v2.bak`, "sentinel", "utf8");
    const reloaded = await createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-02-02T00:00:00Z" } }).load();
    expect(reloaded).toEqual(state);
    expect(await fs.readFile(`${statePath}.v2.bak`, "utf8")).toBe("sentinel");
  });

  it("keeps chat context for chat sessions and strips it from terminal sessions (I-3)", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-chatctx-");
    const workspacePath = await fs.realpath(await fs.mkdtemp(path.join(dataDirectory, "workspace-")));
    const envelope = buildV2Envelope(workspacePath) as unknown as { schemaVersion: number; state: { sessions: Record<string, unknown>[] } };
    envelope.schemaVersion = 3;
    envelope.state.sessions[0].interactionMode = "chat";
    envelope.state.sessions[0].chatContext = { resumeToken: "thread-1", activeModel: "gpt-5", lastTurnCompletedAt: "2026-01-03T00:00:00Z" };
    envelope.state.sessions[1].interactionMode = "terminal";
    envelope.state.sessions[1].chatContext = { resumeToken: "should-be-stripped" };
    const statePath = path.join(dataDirectory, "state.json");
    await fs.writeFile(statePath, JSON.stringify(envelope), "utf8");

    const state = await createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-02-01T00:00:00Z" } }).load();
    expect(state.sessions[0].chatContext).toEqual({ resumeToken: "thread-1", activeModel: "gpt-5", lastTurnCompletedAt: "2026-01-03T00:00:00Z" });
    expect(state.sessions[0].backendId).toBe("codex");
    expect(state.sessions[0].backendSessionRef).toEqual({
      backendId: "codex",
      nativeSessionId: "thread-1",
      transport: "json-stream",
      migrationMetadata: { sourceSchemaVersion: 3 }
    });
    expect(state.sessions[0].runtimeStatus).toBe("stopped");
    expect(state.sessions[1].chatContext).toBeUndefined();
  });

  it("backs up v3 exactly and retains direct legacy backend fields plus unknown session data", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-v3v4-");
    const workspacePath = await fs.realpath(await fs.mkdtemp(path.join(dataDirectory, "workspace-")));
    const envelope = buildV2Envelope(workspacePath) as unknown as { schemaVersion: 3; state: { sessions: Record<string, unknown>[] } };
    envelope.schemaVersion = 3;
    envelope.state.sessions[0].interactionMode = "chat";
    envelope.state.sessions[0].adapterId = "claude-code";
    envelope.state.sessions[0].resumeToken = "native-session-7";
    envelope.state.sessions[0].vendorCursor = { page: 7, opaque: "cursor" };
    const statePath = path.join(dataDirectory, "state.json");
    const original = JSON.stringify(envelope, null, 2);
    await fs.writeFile(statePath, original, "utf8");

    const state = await createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-02-01T00:00:00Z" } }).load();

    expect(state.sessions[0].backendId).toBe("claude");
    expect(state.sessions[0].backendSessionRef).toEqual({
      backendId: "claude",
      nativeSessionId: "native-session-7",
      transport: "json-stream",
      migrationMetadata: {
        sourceSchemaVersion: 3,
        unknownFields: { vendorCursor: { page: 7, opaque: "cursor" } }
      }
    });
    expect(await fs.readFile(`${statePath}.v3.bak`, "utf8")).toBe(original);
    expect((JSON.parse(await fs.readFile(statePath, "utf8")) as AppStateEnvelopeV8).schemaVersion).toBe(8);
  });

  it.each([
    ["invalid interactionMode", (state: { sessions: Record<string, unknown>[] }) => { state.sessions[0].interactionMode = "voice"; }],
    ["forged workspace kind", (state: { workspaces: Record<string, unknown>[] }) => { state.workspaces[0].kind = "ssh-remote"; }],
    ["malformed chatContext", (state: { sessions: Record<string, unknown>[] }) => { state.sessions[0].interactionMode = "chat"; state.sessions[0].chatContext = { resumeToken: 42 }; }],
    ["mismatched backend identity", (state: { sessions: Record<string, unknown>[] }) => {
      state.sessions[0].backendId = "codex";
      state.sessions[0].backendSessionRef = { backendId: "claude", transport: "json-stream" };
    }]
  ])("fails migration on %s and leaves the source untouched", async (_label, mutate) => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-invalid-");
    const workspacePath = await fs.realpath(await fs.mkdtemp(path.join(dataDirectory, "workspace-")));
    const envelope = buildV2Envelope(workspacePath) as unknown as { state: never };
    mutate(envelope.state);
    const statePath = path.join(dataDirectory, "state.json");
    const original = JSON.stringify(envelope);
    await fs.writeFile(statePath, original, "utf8");

    const repository = createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-02-01T00:00:00Z" } });
    await expect(repository.load()).rejects.toMatchObject<StateRepositoryError>({ code: "STATE_MIGRATION_FAILED" });
    expect(await fs.readFile(statePath, "utf8")).toBe(original);
    await expect(fs.access(`${statePath}.v2.bak`)).rejects.toThrow();
  });

  it("rejects unknown future schema versions without touching the source", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-future-");
    const statePath = path.join(dataDirectory, "state.json");
    const original = JSON.stringify({ schemaVersion: 9, state: { workspaces: [], profiles: [], sessions: [] } });
    await fs.writeFile(statePath, original, "utf8");

    const repository = createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-02-01T00:00:00Z" } });
    await expect(repository.load()).rejects.toMatchObject<StateRepositoryError>({ code: "STATE_MIGRATION_FAILED" });
    expect(await fs.readFile(statePath, "utf8")).toBe(original);
  });

  it("migrates in memory only under readonly mode", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-readonly-");
    const workspacePath = await fs.realpath(await fs.mkdtemp(path.join(dataDirectory, "workspace-")));
    const envelope = buildV2Envelope(workspacePath);
    const statePath = path.join(dataDirectory, "state.json");
    const original = JSON.stringify(envelope);
    await fs.writeFile(statePath, original, "utf8");

    const repository = createJsonStateRepository({ dataDirectory, readonly: true, clock: { now: () => "2026-02-01T00:00:00Z" } });
    const state = await repository.load();
    expect(state.sessions[0].interactionMode).toBe("terminal");
    expect(state.workspaces[0].kind).toBe("local-folder");
    expect(await fs.readFile(statePath, "utf8")).toBe(original);
    await expect(fs.access(`${statePath}.v2.bak`)).rejects.toThrow();
  });
});

describe("schema v5-v8 model routing migrations", () => {
  it("migrates v5 provider env names to opaque env refs and drops malformed entries", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-v5-");
    const workspacePath = await fs.realpath(await fs.mkdtemp(path.join(dataDirectory, "workspace-")));
    const envelope = buildV2Envelope(workspacePath) as unknown as { schemaVersion: number; state: Record<string, unknown> };
    envelope.schemaVersion = 5;
    envelope.state.providers = [
      { id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", credentialRef: "PROVIDER_KEY", models: ["model-1"] },
      { id: "broken", protocol: "openai-compatible" }
    ];
    const statePath = path.join(dataDirectory, "state.json");
    const original = JSON.stringify(envelope, null, 2);
    await fs.writeFile(statePath, original, "utf8");

    const repository = createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-03-01T00:00:00Z" } });
    const state = await repository.load();

    expect(state.providers).toHaveLength(1);
    expect(state.providers?.[0]).toMatchObject({ id: "provider-1", credentialRef: "env:PROVIDER_KEY", models: ["model-1"], enabled: true });
    expect((JSON.parse(await fs.readFile(statePath, "utf8")) as AppStateEnvelopeV8).schemaVersion).toBe(8);
    expect(await fs.readFile(`${statePath}.v5.bak`, "utf8")).toBe(original);
  });

  it("adds deployment defaults from v6 and preserves archived history", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-v6-");
    const workspacePath = await fs.realpath(await fs.mkdtemp(path.join(dataDirectory, "workspace-")));
    const envelope = buildV2Envelope(workspacePath) as unknown as { schemaVersion: number; state: Record<string, unknown> };
    envelope.schemaVersion = 6;
    envelope.state.providers = [{ id: "provider-1", name: "Primary", protocol: "openai-compatible", baseUrl: "https://provider.example/v1", credentialRef: "env:PROVIDER_KEY", models: ["model-1"] }];
    envelope.state.modelDeployments = [
      { id: "deployment-1", name: "Archived", providerId: "provider-1", profileId: "profile-codex", modelId: "model-1", enabled: false, archivedAt: "2026-02-01T00:00:00Z" },
      { id: "broken", name: "Missing model" }
    ];
    const statePath = path.join(dataDirectory, "state.json");
    await fs.writeFile(statePath, JSON.stringify(envelope), "utf8");

    const state = await createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-03-01T00:00:00Z" } }).load();
    expect(state.modelDeployments).toEqual([expect.objectContaining({ id: "deployment-1", enabled: false, archivedAt: "2026-02-01T00:00:00Z" })]);
    await expect(fs.access(`${statePath}.v6.bak`)).resolves.toBeUndefined();
  });

  it("normalizes v7 route bindings and rejects routes outside the 1-8 candidate contract", async () => {
    const dataDirectory = await makeDataDirectory("cli-gui-state-v7-");
    const workspacePath = await fs.realpath(await fs.mkdtemp(path.join(dataDirectory, "workspace-")));
    const envelope = buildV2Envelope(workspacePath) as unknown as { schemaVersion: number; state: Record<string, unknown> };
    envelope.schemaVersion = 7;
    envelope.state.modelRoutes = [
      { id: "route-1", name: "Primary", candidateDeploymentIds: ["deployment-1", "deployment-2"], automaticTechnicalFallback: true },
      { id: "route-broken", name: "Too many", candidateDeploymentIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] }
    ];
    envelope.state.workspaceModelRouteBindings = [{ workspaceId: "workspace-1", routeId: "route-1" }, { workspaceId: "missing" }];
    const statePath = path.join(dataDirectory, "state.json");
    await fs.writeFile(statePath, JSON.stringify(envelope), "utf8");

    const state = await createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-03-01T00:00:00Z" } }).load();
    expect(state.modelRoutes).toEqual([expect.objectContaining({ id: "route-1", enabled: true, candidateDeploymentIds: ["deployment-1", "deployment-2"] })]);
    expect(state.workspaceModelRouteBindings).toEqual([{ workspaceId: "workspace-1", routeId: "route-1" }, { workspaceId: "missing" }]);
    await expect(fs.access(`${statePath}.v7.bak`)).resolves.toBeUndefined();
  });
});
