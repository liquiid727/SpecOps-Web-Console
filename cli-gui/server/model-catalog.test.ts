// @vitest-environment node
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { builtinModelIds, isClaudeFamily, mergeModelSources, parseClaudeSettingsModels, parseCodexConfigModels, readSyncedModels, versionWithinRange } from "./model-catalog.js";

const temporaryDirectories: string[] = [];

async function makeHome(files: Record<string, string> = {}) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "model-catalog-"));
  temporaryDirectories.push(home);
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(home, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
  }
  return home;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("builtin model catalog (console-gaps SPEC §2.2)", () => {
  it("maps codex versions to the matching catalog entry", () => {
    expect(builtinModelIds("codex", "0.145.0")).toEqual(["default", "gpt-5", "gpt-5-codex", "gpt-5.1", "gpt-5.1-codex", "gpt-5.1-codex-mini"]);
    expect(builtinModelIds("codex", "0.100.0")).toEqual(["default", "gpt-5", "gpt-5-codex"]);
    expect(builtinModelIds("codex", undefined)).toEqual(["default", "gpt-5", "gpt-5-codex"]);
  });

  it("maps claude versions and keeps the fork adapters minimal", () => {
    expect(builtinModelIds("claude-code", "2.1.0")).toContain("sonnet[1m]");
    expect(builtinModelIds("claude-code", "1.0.0")).toEqual(["default", "sonnet", "opus", "haiku"]);
    expect(builtinModelIds("kimi", "9.9.9")).toEqual(["default"]);
    expect(builtinModelIds("glm", undefined)).toEqual(["default"]);
    expect(builtinModelIds("generic", "1.0.0")).toEqual([]);
  });

  it("identifies the claude protocol family", () => {
    expect(isClaudeFamily("claude-code")).toBe(true);
    expect(isClaudeFamily("kimi")).toBe(true);
    expect(isClaudeFamily("glm")).toBe(true);
    expect(isClaudeFamily("codex")).toBe(false);
  });

  it("matches semver ranges with compound clauses", () => {
    expect(versionWithinRange("2.5.0", ">=2.0.0")).toBe(true);
    expect(versionWithinRange("1.9.9", ">=2.0.0")).toBe(false);
    expect(versionWithinRange("2.5.0", ">=2.0.0 <3.0.0")).toBe(true);
    expect(versionWithinRange(undefined, ">=2.0.0")).toBe(false);
    expect(versionWithinRange("2.5.0", undefined)).toBe(true);
    expect(versionWithinRange("not-a-version", ">=2.0.0")).toBe(false);
  });
});

describe("mergeModelSources (console-gaps SPEC §2.5)", () => {
  it("deduplicates with builtin > synced > custom priority and keeps default first", () => {
    const merged = mergeModelSources(["default", "gpt-5"], ["gpt-5", "o4-mini"], ["o4-mini", "default", "my-model"]);
    expect(merged).toEqual([
      { id: "default", source: "builtin" },
      { id: "gpt-5", source: "builtin" },
      { id: "o4-mini", source: "synced" },
      { id: "my-model", source: "custom" }
    ]);
  });

  it("moves a non-builtin default to the front and skips empty ids", () => {
    const merged = mergeModelSources([], ["gpt-5", ""], ["default"]);
    expect(merged).toEqual([
      { id: "default", source: "custom" },
      { id: "gpt-5", source: "synced" }
    ]);
  });
});

describe("codex config.toml parsing", () => {
  it("collects the top-level model and profile-scoped models", () => {
    const source = [
      "# comment",
      "model = \"gpt-5.1-codex\"",
      "[profiles.fast]",
      "model = 'gpt-5.1-codex-mini' # inline note",
      "[mcp_servers.example]",
      "model = \"should-be-ignored\"",
      "[profiles.slow]",
      "model = \"gpt-5.1-codex\""
    ].join("\n");
    expect(parseCodexConfigModels(source)).toEqual(["gpt-5.1-codex", "gpt-5.1-codex-mini"]);
  });

  it("returns nothing for malformed or unrelated content", () => {
    expect(parseCodexConfigModels("model=missing quotes\nrandom junk")).toEqual([]);
    expect(parseCodexConfigModels("")).toEqual([]);
  });
});

describe("claude settings.json parsing", () => {
  it("reads the model field and trims it", () => {
    expect(parseClaudeSettingsModels(JSON.stringify({ model: " opus " }))).toEqual(["opus"]);
  });

  it("tolerates bad JSON and missing or non-string fields", () => {
    expect(parseClaudeSettingsModels("{not json")).toEqual([]);
    expect(parseClaudeSettingsModels(JSON.stringify({}))).toEqual([]);
    expect(parseClaudeSettingsModels(JSON.stringify({ model: 42 }))).toEqual([]);
    expect(parseClaudeSettingsModels(JSON.stringify({ model: "  " }))).toEqual([]);
  });
});

describe("readSyncedModels", () => {
  it("reads codex models from ~/.codex/config.toml", async () => {
    const home = await makeHome({ ".codex/config.toml": "model = \"gpt-5.1\"\n[profiles.mini]\nmodel = \"gpt-5.1-codex-mini\"\n" });
    expect(await readSyncedModels("codex", { homeDirectory: home })).toEqual(["gpt-5.1", "gpt-5.1-codex-mini"]);
  });

  it("reads claude-family models from ~/.claude/settings.json", async () => {
    const home = await makeHome({ ".claude/settings.json": JSON.stringify({ model: "opus" }) });
    expect(await readSyncedModels("claude-code", { homeDirectory: home })).toEqual(["opus"]);
    expect(await readSyncedModels("kimi", { homeDirectory: home })).toEqual(["opus"]);
  });

  it("returns an empty list for missing files, bad content, and unsupported adapters", async () => {
    const empty = await makeHome();
    expect(await readSyncedModels("codex", { homeDirectory: empty })).toEqual([]);
    const broken = await makeHome({ ".claude/settings.json": "{broken" });
    expect(await readSyncedModels("glm", { homeDirectory: broken })).toEqual([]);
    expect(await readSyncedModels("generic", { homeDirectory: empty })).toEqual([]);
  });
});
