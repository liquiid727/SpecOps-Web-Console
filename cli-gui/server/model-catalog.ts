import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CliAdapterId } from "../shared/state.js";
import type { ProfileModelEntry, ProfileModelSource } from "../shared/capabilities.js";

/**
 * 内置模型目录（console-gaps SPEC §2.2 第 1 层）：按 adapter + 探测版本区间映射内置型号，
 * 替代 profile-adapters 内联数组。条目按序匹配，首个命中的区间生效；无区间条目为兜底。
 * codex / claude 均无 list-models 命令，目录随 CLI 版本演进人工维护。
 */
const builtinCatalog: Partial<Record<CliAdapterId, { range?: string; models: string[] }[]>> = {
  codex: [
    { range: ">=0.145.0", models: ["default", "gpt-5", "gpt-5-codex", "gpt-5.1", "gpt-5.1-codex", "gpt-5.1-codex-mini"] },
    { models: ["default", "gpt-5", "gpt-5-codex"] }
  ],
  "claude-code": [
    { range: ">=2.0.0", models: ["default", "sonnet", "opus", "haiku", "sonnet[1m]"] },
    { models: ["default", "sonnet", "opus", "haiku"] }
  ],
  // kimi/glm：模型由服务端默认，不硬塞 claude 型号
  kimi: [{ models: ["default"] }],
  glm: [{ models: ["default"] }]
};

/** Claude Code 协议家族：kimi / glm 为兼容 fork（同步时同读 ~/.claude/settings.json） */
export function isClaudeFamily(adapterId: string): boolean {
  return adapterId === "claude-code" || adapterId === "kimi" || adapterId === "glm";
}

export function builtinModelIds(adapterId: CliAdapterId, detectedVersion?: string): string[] {
  for (const entry of builtinCatalog[adapterId] ?? []) {
    if (!entry.range || versionWithinRange(detectedVersion, entry.range)) return [...entry.models];
  }
  return [];
}

/** 三层来源合并：去重优先级 builtin > synced > custom；"default" 恒排首位（console-gaps SPEC §2.5） */
export function mergeModelSources(builtin: string[], synced: string[], custom: string[]): ProfileModelEntry[] {
  const merged = new Map<string, ProfileModelSource>();
  const layers: [string[], ProfileModelSource][] = [[builtin, "builtin"], [synced, "synced"], [custom, "custom"]];
  for (const [ids, source] of layers) {
    for (const id of ids) {
      if (id && !merged.has(id)) merged.set(id, source);
    }
  }
  const entries = [...merged.entries()].map(([id, source]) => ({ id, source }));
  return [...entries.filter((entry) => entry.id === "default"), ...entries.filter((entry) => entry.id !== "default")];
}

/** codex `~/.codex/config.toml`：顶层 `model` 与 `[profiles.*].model`（容错行级解析，不引 TOML 依赖） */
export function parseCodexConfigModels(source: string): string[] {
  const models: string[] = [];
  let section = "";
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }
    const valueMatch = line.match(/^model\s*=\s*"([^"]+)"\s*(?:#.*)?$/) ?? line.match(/^model\s*=\s*'([^']+)'\s*(?:#.*)?$/);
    if (!valueMatch) continue;
    if (section === "" || section.startsWith("profiles.")) models.push(valueMatch[1]);
  }
  return [...new Set(models)];
}

/** claude 家族 `~/.claude/settings.json` 的 `model`；坏 JSON / 缺字段容错为空 */
export function parseClaudeSettingsModels(source: string): string[] {
  try {
    const parsed = JSON.parse(source) as { model?: unknown };
    return typeof parsed?.model === "string" && parsed.model.trim() ? [parsed.model.trim()] : [];
  } catch {
    return [];
  }
}

/** 本机 CLI 配置同步（SPEC §2.2 第 2 层）：只读、配置缺失/解析失败一律返回 []（不报错） */
export async function readSyncedModels(adapterId: CliAdapterId, options: { homeDirectory?: string } = {}): Promise<string[]> {
  const home = options.homeDirectory ?? os.homedir();
  try {
    if (adapterId === "codex") return parseCodexConfigModels(await fs.readFile(path.join(home, ".codex", "config.toml"), "utf8"));
    if (isClaudeFamily(adapterId)) return parseClaudeSettingsModels(await fs.readFile(path.join(home, ".claude", "settings.json"), "utf8"));
  } catch {
    // 文件缺失或不可读：同步结果为空即可
  }
  return [];
}

/** 简单 semver 范围匹配：空格分隔的 >=|>|<=|<|= 比较器；无范围 = 不限制 */
export function versionWithinRange(version: string | undefined, range: string | undefined): boolean {
  if (!range) return true;
  if (!version) return false;
  const actual = parseVersion(version);
  if (!actual) return false;
  for (const clause of range.trim().split(/\s+/)) {
    const match = clause.match(/^(>=|<=|>|<|=)?(\d+(?:\.\d+){0,2})$/);
    if (!match) return false;
    const expected = parseVersion(match[2]);
    if (!expected) return false;
    const comparison = compareVersions(actual, expected);
    const operator = match[1] ?? "=";
    if (operator === ">=" && comparison < 0) return false;
    if (operator === "<=" && comparison > 0) return false;
    if (operator === ">" && comparison <= 0) return false;
    if (operator === "<" && comparison >= 0) return false;
    if (operator === "=" && comparison !== 0) return false;
  }
  return true;
}

function parseVersion(value: string): number[] | undefined {
  const parts = value.trim().split(".").map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isInteger(part) || part < 0)) return undefined;
  while (parts.length < 3) parts.push(0);
  return parts;
}

function compareVersions(a: number[], b: number[]): number {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}
