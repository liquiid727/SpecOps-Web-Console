import { execFile } from "node:child_process";
import type { Readable } from "node:stream";
import { promisify } from "node:util";
import type { CliProfileV2, CliProfileCapabilities, CliOptionDefinition } from "../shared/types.js";
import type { ParseContext, ParsedTurnEvent, ProfileAdapterRegistry, TurnParseResult } from "./ports.js";

const execFileAsync = promisify(execFile);

export class UnsupportedCliOptionError extends Error {
  readonly code = "CLI_OPTION_UNSUPPORTED" as const;
  constructor(readonly option: string) {
    super(`CLI option is not supported: ${option}`);
    this.name = "UnsupportedCliOptionError";
  }
}

const genericCapabilities: CliProfileCapabilities = {
  adapterId: "generic",
  compatibility: "supported",
  permissions: [],
  modes: [],
  models: [],
  supportsComposer: true,
  supportsStructuredRecognition: false,
  supportsHeadlessTurns: false,
  supportsResume: false,
  supportsApproval: false
};

/** 已验证 CLI 版本范围默认值（adapter-spec §5）；版本外 headless 能力关闭 */
const defaultAdapterVersionRanges: Record<string, string | undefined> = {
  codex: ">=0.145.0 <1.0.0"
};

const claudeOptions = {
  permissions: options(["default", "acceptEdits", "auto", "bypassPermissions", "manual", "dontAsk", "plan"]),
  modes: options([]),
  models: options(["default", "sonnet", "opus", "haiku"])
};

const codexOptions = {
  permissions: options(["default", "untrusted", "on-request", "never"]),
  modes: options(["default", "read-only", "workspace-write", "danger-full-access"]),
  models: options(["default", "gpt-5", "gpt-5-codex"])
};

export function createProfileAdapterRegistry(): ProfileAdapterRegistry {
  const capabilityCache = new Map<string, Promise<CliProfileCapabilities>>();

  async function capabilities(profile: CliProfileV2): Promise<CliProfileCapabilities> {
    const key = `${profile.id}:${profile.command}:${profile.adapterId}:${profile.adapterVersionRange ?? ""}`;
    const cached = capabilityCache.get(key);
    if (cached) return cached;
    const pending = detectCapabilities(profile);
    capabilityCache.set(key, pending);
    return pending;
  }

  return {
    availableAdapterIds: ["claude-code", "codex", "generic"],
    capabilities,
    async resolveLaunch(profile, config) {
      const detected = await capabilities(profile);
      const args = [...profile.args];
      if (detected.compatibility !== "supported") return { command: profile.command, args, capabilities: detected };
      const adapter = profile.adapterId;
      appendOption(args, config.permission, adapter === "claude-code" ? "--permission-mode" : adapter === "codex" ? "--ask-for-approval" : undefined, detected.permissions);
      appendOption(args, config.mode, adapter === "codex" ? "--sandbox" : undefined, detected.modes);
      appendOption(args, config.model, "--model", detected.models);
      return { command: profile.command, args, capabilities: detected };
    },
    async buildTurn(profile, config) {
      const detected = await capabilities(profile);
      // Adapter 无状态纯翻译：headless 不支持时被调用属上层缺陷（adapter-spec §3.3）
      if (!detected.supportsHeadlessTurns || profile.adapterId !== "codex") throw new HeadlessTurnUnsupportedError(profile.adapterId);
      const args = [...profile.args, "exec", "--json"];
      appendOption(args, config.model, "--model", detected.models);
      appendOption(args, config.mode, "--sandbox", detected.modes);
      appendOption(args, config.permission, "--ask-for-approval", detected.permissions);
      if (config.resumeToken) args.push("resume", config.resumeToken);
      args.push(config.prompt);
      return { command: profile.command, args };
    },
    parseEvents(profile, stream, ctx) {
      if (profile.adapterId !== "codex") throw new HeadlessTurnUnsupportedError(profile.adapterId);
      return parseCodexEvents(stream, ctx);
    }
  };
}

export class HeadlessTurnUnsupportedError extends Error {
  readonly code = "INTERACTION_MODE_MISMATCH" as const;
  constructor(adapterId: string) {
    super(`Adapter does not support headless turns: ${adapterId}`);
    this.name = "HeadlessTurnUnsupportedError";
  }
}

/** Codex `exec --json` JSONL → 规范事件；容错映射表，未识别降级 pty_output（adapter-spec §3.1、§4） */
async function* parseCodexEvents(stream: Readable, ctx: ParseContext): AsyncGenerator<ParsedTurnEvent, TurnParseResult, void> {
  const result: TurnParseResult = {};
  let buffer = "";
  for await (const chunk of stream) {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      yield* mapCodexLine(line, ctx, result);
      newline = buffer.indexOf("\n");
    }
  }
  if (buffer.length > 0) yield* mapCodexLine(buffer, ctx, result);
  return result;
}

function* mapCodexLine(line: string, ctx: ParseContext, result: TurnParseResult): Generator<ParsedTurnEvent> {
  if (!line.trim()) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    yield { kind: "pty_output", source: "profile-adapter", raw: line, metadata: { turnId: ctx.turnId } };
    return;
  }
  if (!parsed || typeof parsed !== "object" || typeof (parsed as { type?: unknown }).type !== "string") {
    yield { kind: "pty_output", source: "profile-adapter", raw: line, metadata: { turnId: ctx.turnId } };
    return;
  }
  const event = parsed as { type: string; thread_id?: unknown; session_id?: unknown; usage?: unknown; item?: unknown };
  if (event.type === "thread.started" || event.type === "session.created") {
    const token = typeof event.thread_id === "string" ? event.thread_id : typeof event.session_id === "string" ? event.session_id : undefined;
    if (token) { result.resumeToken = token; return; }
    yield { kind: "pty_output", source: "profile-adapter", raw: line, metadata: { turnId: ctx.turnId } };
    return;
  }
  if (event.type === "turn.started" || event.type === "item.started" || event.type === "item.updated") return;
  if (event.type === "turn.completed") {
    const usage = event.usage as { input_tokens?: unknown; output_tokens?: unknown } | undefined;
    if (usage && typeof usage === "object") {
      result.usage = {
        inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : undefined,
        outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : undefined
      };
    }
    return;
  }
  if (event.type === "item.completed" && event.item && typeof event.item === "object") {
    const item = event.item as { type?: unknown; text?: unknown; command?: unknown; exit_code?: unknown; tool?: unknown; server?: unknown; changes?: unknown };
    if (item.type === "agent_message" && typeof item.text === "string") {
      yield { kind: "assistant_message", source: "profile-adapter", raw: item.text, metadata: { turnId: ctx.turnId } };
      return;
    }
    if (item.type === "command_execution" && typeof item.command === "string") {
      const metadata: Record<string, string | number | boolean> = { turnId: ctx.turnId, tool: "command_execution" };
      if (typeof item.exit_code === "number") metadata.exitCode = item.exit_code;
      yield { kind: "tool_activity", source: "profile-adapter", raw: item.command, metadata };
      return;
    }
    if (item.type === "mcp_tool_call" && typeof item.tool === "string") {
      const tool = typeof item.server === "string" ? `${item.server}.${item.tool}` : item.tool;
      yield { kind: "tool_activity", source: "profile-adapter", raw: tool, metadata: { turnId: ctx.turnId, tool } };
      return;
    }
    if (item.type === "file_change" && Array.isArray(item.changes)) {
      const paths = item.changes.filter((change): change is { path: string } => Boolean(change) && typeof (change as { path?: unknown }).path === "string");
      if (paths.length) {
        for (const change of paths) yield { kind: "file_change", source: "profile-adapter", raw: change.path, metadata: { turnId: ctx.turnId, path: change.path } };
        return;
      }
    }
    yield { kind: "pty_output", source: "profile-adapter", raw: line, metadata: { turnId: ctx.turnId } };
    return;
  }
  yield { kind: "pty_output", source: "profile-adapter", raw: line, metadata: { turnId: ctx.turnId } };
}

async function detectCapabilities(profile: CliProfileV2): Promise<CliProfileCapabilities> {
  if (profile.adapterId === "generic") return { ...genericCapabilities };
  let detectedVersion: string | undefined;
  let compatibility: CliProfileCapabilities["compatibility"] = "unknown-version";
  try {
    const result = await execFileAsync(profile.command, ["--version"], { timeout: 2_000, maxBuffer: 64 * 1024, shell: false, env: process.env });
    detectedVersion = `${result.stdout} ${result.stderr}`.match(/\b\d+\.\d+(?:\.\d+)?\b/)?.[0];
    compatibility = detectedVersion ? "supported" : "unknown-version";
  } catch (error) {
    compatibility = (error as NodeJS.ErrnoException).code === "ENOENT" ? "unavailable" : "unknown-version";
  }
  const optionSet = profile.adapterId === "claude-code" ? claudeOptions : codexOptions;
  const versionRange = profile.adapterVersionRange ?? defaultAdapterVersionRanges[profile.adapterId];
  const withinVerifiedRange = compatibility === "supported" && versionWithinRange(detectedVersion, versionRange);
  // A 段：仅 codex 开启 headless；claude-code 在 issue-010 接入；approval 一律 false（adapter-spec §2.2 表）
  const headless = withinVerifiedRange && profile.adapterId === "codex";
  return {
    adapterId: profile.adapterId,
    detectedVersion,
    compatibility,
    permissions: compatibility === "supported" ? optionSet.permissions : [],
    modes: compatibility === "supported" ? optionSet.modes : [],
    models: compatibility === "supported" ? optionSet.models : [],
    supportsComposer: true,
    supportsStructuredRecognition: compatibility === "supported",
    supportsHeadlessTurns: headless,
    supportsResume: headless,
    supportsApproval: false
  };
}

/** 简单 semver 范围匹配：空格分隔的 >=|>|<=|<|= 比较器；无范围 = 不限制 */
function versionWithinRange(version: string | undefined, range: string | undefined): boolean {
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

function appendOption(args: string[], value: string | null, flag: string | undefined, definitions: CliOptionDefinition[]) {
  if (!value || value === "default") return;
  if (!flag || !definitions.some((definition) => definition.id === value)) throw new UnsupportedCliOptionError(value);
  args.push(flag, value);
}

function options(ids: string[]): CliOptionDefinition[] {
  return ids.map((id) => ({ id, labelKey: `cli.option.${id}`, requiresRestart: true }));
}
