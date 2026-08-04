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

export interface ConfiguredModelSnapshot {
  models: string[];
  /** The model the CLI will use when no explicit --model is supplied. */
  defaultModel?: string;
}

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

/** codex `~/.codex/config.toml`：顶层、`[profiles.*]` 与 `[model_providers.*]` 的 model 键。 */
export function parseCodexConfigSnapshot(source: string): ConfiguredModelSnapshot {
  const models: string[] = [];
  let defaultModel: string | undefined;
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
    const model = valueMatch[1].trim();
    if (!model) continue;
    if (section === "") {
      defaultModel ??= model;
      models.push(model);
    } else if (section.startsWith("profiles.") || section.startsWith("model_providers.")) {
      models.push(model);
    }
  }
  return { models: [...new Set(models)], ...(defaultModel ? { defaultModel } : {}) };
}

export function parseCodexConfigModels(source: string): string[] {
  return parseCodexConfigSnapshot(source).models;
}

/** claude 家族 `~/.claude/settings.json` 的 model 与 env 模型字段。 */
export function parseClaudeSettingsSnapshot(source: string, adapterId: CliAdapterId = "claude-code"): ConfiguredModelSnapshot | undefined {
  try {
    const parsed = JSON.parse(source) as { model?: unknown; env?: unknown };
    const env = parsed.env && typeof parsed.env === "object" ? parsed.env as Record<string, unknown> : {};
    const baseUrl = typeof env.ANTHROPIC_BASE_URL === "string" ? env.ANTHROPIC_BASE_URL : undefined;
    if (!matchesClaudeProvider(adapterId, baseUrl)) return { models: [] };
    const configured = [
      parsed.model,
      env.ANTHROPIC_MODEL,
      env.ANTHROPIC_SMALL_FAST_MODEL
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim());
    const models = [...new Set(configured)];
    const defaultModel = models[0];
    return { models, ...(defaultModel ? { defaultModel } : {}) };
  } catch {
    return undefined;
  }
}

/** claude 家族配置模型；坏 JSON / 缺字段容错为空。 */
export function parseClaudeSettingsModels(source: string, adapterId: CliAdapterId = "claude-code"): string[] {
  return parseClaudeSettingsSnapshot(source, adapterId)?.models ?? [];
}

/** Read the local configuration without turning a missing or malformed file into a destructive empty sync. */
export async function readConfiguredModels(adapterId: CliAdapterId, options: { homeDirectory?: string } = {}): Promise<ConfiguredModelSnapshot | undefined> {
  const home = options.homeDirectory ?? os.homedir();
  try {
    if (adapterId === "codex") return parseCodexConfigSnapshot(await fs.readFile(path.join(home, ".codex", "config.toml"), "utf8"));
    if (isClaudeFamily(adapterId)) return parseClaudeSettingsSnapshot(await fs.readFile(path.join(home, ".claude", "settings.json"), "utf8"), adapterId);
  } catch {
    // 文件缺失或不可读：自动同步保留已有缓存。
  }
  return undefined;
}

/** 本机 CLI 配置同步（SPEC §2.2 第 2 层）：只读、配置缺失/解析失败一律返回 []（不报错） */
export async function readSyncedModels(adapterId: CliAdapterId, options: { homeDirectory?: string } = {}): Promise<string[]> {
  return (await readConfiguredModels(adapterId, options))?.models ?? [];
}

function matchesClaudeProvider(adapterId: CliAdapterId, baseUrl: string | undefined): boolean {
  if (adapterId === "claude-code") return true;
  if (!baseUrl) return false;
  let hostname = baseUrl.trim().toLowerCase();
  try {
    hostname = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    // Keep a conservative string fallback for provider URLs with a missing scheme.
  }
  if (adapterId === "kimi") return hostname.includes("moonshot");
  if (adapterId === "glm") return hostname.includes("bigmodel");
  return false;
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
