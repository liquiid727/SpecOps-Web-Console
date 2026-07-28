import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SkillContentResponse, SkillScope, SkillSource, SkillSummary } from "../shared/api.js";

/** SKILL.md 正文预览上限（console-gaps SPEC §7.3）：超出部分截断 */
const SKILL_CONTENT_LIMIT = 256 * 1024;

export interface SkillScanOptions {
  /** system scope 的扫描根（缺省 os.homedir()；测试注入假目录） */
  homeDirectory?: string;
  /** workspace scope 的工作区根目录 */
  workspacePath?: string;
}

interface SkillRoot {
  source: SkillSource;
  base: string;
  display: string;
}

function skillRoots(scope: SkillScope, options: SkillScanOptions): SkillRoot[] {
  if (scope === "system") {
    const home = options.homeDirectory ?? os.homedir();
    return [
      { source: "claude", base: path.join(home, ".claude", "skills"), display: "~/.claude/skills" },
      { source: "codex", base: path.join(home, ".codex", "skills"), display: "~/.codex/skills" }
    ];
  }
  const workspace = options.workspacePath ?? "";
  return [
    { source: "claude", base: path.join(workspace, ".claude", "skills"), display: ".claude/skills" },
    { source: "codex", base: path.join(workspace, ".codex", "skills"), display: ".codex/skills" }
  ];
}

/** 轻量 frontmatter 解析（仅顶层 `key: value`，不新增 YAML 依赖）；无 frontmatter 返回空对象 */
export function parseSkillFrontmatter(source: string): { name?: string; description?: string } {
  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return {};
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") break;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    fields[match[1].toLowerCase()] = stripQuotes(match[2].trim());
  }
  return { name: fields.name || undefined, description: fields.description || undefined };
}

function stripQuotes(value: string): string {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) return value.slice(1, -1);
  return value;
}

/** realpath 收敛校验：symlink 解析后必须仍在技能根目录内，越界一律拒绝（对齐 workspace preview 约束） */
async function containedRealpath(base: string, target: string): Promise<string | undefined> {
  try {
    const resolvedBase = await fs.realpath(base);
    const resolvedTarget = await fs.realpath(target);
    return resolvedTarget.startsWith(resolvedBase + path.sep) ? resolvedTarget : undefined;
  } catch {
    return undefined;
  }
}

/** 一层子目录扫描（`<root>/<dir>/SKILL.md`）；目录缺失静默返回空；name 回退目录名 */
export async function listSkills(scope: SkillScope, options: SkillScanOptions = {}): Promise<SkillSummary[]> {
  const skills: SkillSummary[] = [];
  for (const root of skillRoots(scope, options)) {
    let entries;
    try {
      entries = await fs.readdir(root.base, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const resolved = await containedRealpath(root.base, path.join(root.base, entry.name, "SKILL.md"));
      if (!resolved) continue;
      let raw: string;
      try {
        raw = await fs.readFile(resolved, "utf8");
      } catch {
        continue;
      }
      const frontmatter = parseSkillFrontmatter(raw);
      skills.push({
        id: `${root.source}:${entry.name}`,
        name: frontmatter.name ?? entry.name,
        description: frontmatter.description ?? "",
        source: root.source,
        scope,
        path: `${root.display}/${entry.name}`
      });
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/** 正文预览：id 必须命中重扫结果（无路径穿越面）；未命中/越界返回 undefined（由调用方转 404） */
export async function readSkillContent(scope: SkillScope, id: string, options: SkillScanOptions = {}): Promise<SkillContentResponse | undefined> {
  const skills = await listSkills(scope, options);
  if (!skills.some((skill) => skill.id === id)) return undefined;
  const separator = id.indexOf(":");
  const source = id.slice(0, separator);
  const directoryName = id.slice(separator + 1);
  const root = skillRoots(scope, options).find((item) => item.source === source);
  if (!root) return undefined;
  const resolved = await containedRealpath(root.base, path.join(root.base, directoryName, "SKILL.md"));
  if (!resolved) return undefined;
  try {
    const buffer = await fs.readFile(resolved);
    const truncated = buffer.byteLength > SKILL_CONTENT_LIMIT;
    return { content: buffer.subarray(0, SKILL_CONTENT_LIMIT).toString("utf8"), truncated };
  } catch {
    return undefined;
  }
}
