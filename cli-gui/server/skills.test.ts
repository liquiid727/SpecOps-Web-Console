// @vitest-environment node
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listSkills, parseSkillFrontmatter, readSkillContent } from "./skills.js";

const temporaryDirectories: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skills-"));
  temporaryDirectories.push(root);
  return root;
}

async function writeSkill(root: string, base: string, name: string, content: string) {
  const directory = path.join(root, base, "skills", name);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "SKILL.md"), content, "utf8");
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("parseSkillFrontmatter", () => {
  it("reads top-level name and description with quote stripping", () => {
    const parsed = parseSkillFrontmatter('---\nname: "My Skill"\ndescription: does things\nextra: ignored\n---\n# Body');
    expect(parsed).toEqual({ name: "My Skill", description: "does things" });
  });

  it("returns empty for content without frontmatter or with unterminated blocks", () => {
    expect(parseSkillFrontmatter("# Just markdown")).toEqual({});
    expect(parseSkillFrontmatter("---\nname: partial")).toEqual({ name: "partial" });
    expect(parseSkillFrontmatter("")).toEqual({});
  });
});

describe("listSkills", () => {
  it("scans claude and codex skill directories one level deep with frontmatter fallback", async () => {
    const home = await makeRoot();
    await writeSkill(home, ".claude", "alpha", "---\nname: Alpha Skill\ndescription: first\n---\nbody");
    await writeSkill(home, ".codex", "raw-dir", "# no frontmatter here");
    const skills = await listSkills("system", { homeDirectory: home });
    expect(skills).toEqual([
      { id: "claude:alpha", name: "Alpha Skill", description: "first", source: "claude", scope: "system", path: "~/.claude/skills/alpha" },
      { id: "codex:raw-dir", name: "raw-dir", description: "", source: "codex", scope: "system", path: "~/.codex/skills/raw-dir" }
    ]);
  });

  it("scans workspace scope under the workspace path", async () => {
    const workspace = await makeRoot();
    await writeSkill(workspace, ".claude", "local", "---\nname: Local\n---\n");
    const skills = await listSkills("workspace", { workspacePath: workspace });
    expect(skills).toEqual([{ id: "claude:local", name: "Local", description: "", source: "claude", scope: "workspace", path: ".claude/skills/local" }]);
  });

  it("returns empty for missing roots and skips directories without SKILL.md", async () => {
    const home = await makeRoot();
    await fs.mkdir(path.join(home, ".claude", "skills", "empty"), { recursive: true });
    expect(await listSkills("system", { homeDirectory: home })).toEqual([]);
  });

  it("rejects symlinked skills that escape the skills root", async () => {
    const home = await makeRoot();
    const outside = path.join(home, "outside");
    await fs.mkdir(outside, { recursive: true });
    await fs.writeFile(path.join(outside, "SKILL.md"), "---\nname: Escaped\n---\n", "utf8");
    await fs.mkdir(path.join(home, ".claude", "skills"), { recursive: true });
    await fs.symlink(outside, path.join(home, ".claude", "skills", "escape"));
    expect(await listSkills("system", { homeDirectory: home })).toEqual([]);
  });
});

describe("readSkillContent", () => {
  it("returns content only for ids that hit the rescan result", async () => {
    const home = await makeRoot();
    await writeSkill(home, ".claude", "alpha", "---\nname: Alpha\n---\nHello body");
    const content = await readSkillContent("system", "claude:alpha", { homeDirectory: home });
    expect(content).toEqual({ content: "---\nname: Alpha\n---\nHello body", truncated: false });
    expect(await readSkillContent("system", "claude:missing", { homeDirectory: home })).toBeUndefined();
    expect(await readSkillContent("system", "codex:alpha", { homeDirectory: home })).toBeUndefined();
    expect(await readSkillContent("system", "claude:../alpha", { homeDirectory: home })).toBeUndefined();
  });

  it("truncates bodies beyond 256KiB", async () => {
    const home = await makeRoot();
    await writeSkill(home, ".codex", "big", `---\nname: Big\n---\n${"x".repeat(300 * 1024)}`);
    const content = await readSkillContent("system", "codex:big", { homeDirectory: home });
    expect(content?.truncated).toBe(true);
    expect(Buffer.byteLength(content?.content ?? "")).toBe(256 * 1024);
  });
});
