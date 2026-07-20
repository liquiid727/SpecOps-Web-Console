// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppStateEnvelopeV2, AppStateV2 } from "../shared/types.js";
import { createJsonStateRepository, StateRepositoryError } from "./store.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("JSON state repository lifecycle", () => {
  it("owns an isolated queue and drains the latest snapshot", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-state-"));
    roots.push(dataDirectory);
    const repository = createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-01-01T00:00:00Z" } });
    const state: AppStateV2 = { workspaces: [], profiles: [], sessions: [] };

    const first = repository.save(state);
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", createdAt: "2026-01-01T00:00:00Z" });
    const second = repository.save(state);
    state.workspaces[0].name = "Mutated after save";
    await Promise.all([first, second, repository.drain()]);

    const written = JSON.parse(await fs.readFile(path.join(dataDirectory, "state.json"), "utf8")) as AppStateEnvelopeV2;
    expect(written.schemaVersion).toBe(2);
    expect(written.state.workspaces[0].name).toBe("Workspace");
  });

  it("migrates a legacy state only after canonical validation and preserves a backup", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-state-migration-"));
    roots.push(dataDirectory);
    const workspacePath = await fs.mkdtemp(path.join(dataDirectory, "workspace-"));
    const legacy = {
      workspaces: [{ id: "workspace-1", name: "Workspace", path: workspacePath, createdAt: "2026-01-01T00:00:00Z" }],
      profiles: [{ id: "profile-1", name: "CLI", command: "cli", args: [], createdAt: "2026-01-01T00:00:00Z" }],
      sessions: [{ id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Session", status: "running", createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z", exitCode: 7 }]
    };
    const statePath = path.join(dataDirectory, "state.json");
    await fs.writeFile(statePath, JSON.stringify(legacy), "utf8");

    const state = await createJsonStateRepository({ dataDirectory, clock: { now: () => "2026-01-02T00:00:00Z" } }).load();
    expect(state.sessions[0]).toMatchObject({ id: "session-1", runtimeStatus: "stopped", exitCode: 7, organizationStatus: "active", revision: 1 });
    expect(JSON.parse(await fs.readFile(statePath, "utf8")).schemaVersion).toBe(2);
    expect(JSON.parse(await fs.readFile(`${statePath}.v1.bak`, "utf8")).sessions[0].id).toBe("session-1");
  });

  it("leaves corrupt input untouched and performs no writes in readonly mode", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-state-corrupt-"));
    roots.push(dataDirectory);
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
