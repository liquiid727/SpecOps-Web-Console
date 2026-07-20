// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppStateEnvelopeV2, AppStateV2 } from "../shared/types.js";
import { createJsonStateRepository } from "./store.js";

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
});
