// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { CliProfileV2 } from "../shared/types.js";
import { createProfileAdapterRegistry, UnsupportedCliOptionError } from "./profile-adapters.js";

const base = (adapterId: CliProfileV2["adapterId"], command: string): CliProfileV2 => ({ id: `${adapterId}-1`, name: adapterId, command, args: [], adapterId, createdAt: "2026-01-01T00:00:00Z" });

describe("profile adapters", () => {
  it("exposes a neutral generic capability contract", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(base("generic", "anything"));
    expect(capabilities).toMatchObject({ adapterId: "generic", compatibility: "supported", supportsComposer: true });
    expect(capabilities.permissions).toEqual([]);
  });

  it("degrades unavailable commands and translates only allowlisted options", async () => {
    const registry = createProfileAdapterRegistry();
    const unavailable = await registry.capabilities!(base("codex", "/path/that/does/not/exist"));
    expect(unavailable.compatibility).toBe("unavailable");
    const launch = await registry.resolveLaunch!(base("codex", process.execPath), { permission: "never", mode: "workspace-write", model: "gpt-5" });
    expect(launch.args).toEqual(["--ask-for-approval", "never", "--sandbox", "workspace-write", "--model", "gpt-5"]);
    await expect(registry.resolveLaunch!(base("codex", process.execPath), { permission: "not-supported", mode: null, model: null })).rejects.toBeInstanceOf(UnsupportedCliOptionError);
  });

  it("maps Claude settings to flags exposed by the Claude adapter", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(base("claude-code", process.execPath));
    expect(capabilities.modes).toEqual([]);
    const launch = await registry.resolveLaunch!(base("claude-code", process.execPath), { permission: "acceptEdits", mode: null, model: "sonnet" });
    expect(launch.args).toEqual(["--permission-mode", "acceptEdits", "--model", "sonnet"]);
    await expect(registry.resolveLaunch!(base("claude-code", process.execPath), { permission: null, mode: "plan", model: null })).rejects.toBeInstanceOf(UnsupportedCliOptionError);
  });
});
