import { execFile } from "node:child_process";
import { delimiter, sep } from "node:path";
import type { Readable } from "node:stream";
import { promisify } from "node:util";
import type { CliProfileV2, CliProfileCapabilities, CapabilityDetectionResult, CapabilityDetectionFailure, DowngradeReason } from "../shared/types.js";
import type { CliOptionDefinition } from "../shared/capabilities.js";
import type { Logger, ParseContext, ParsedTurnEvent, ProfileAdapterRegistry, TurnParseResult, TurnStreamHooks } from "./ports.js";
import { builtinModelIds, isClaudeFamily, mergeModelSources, versionWithinRange } from "./model-catalog.js";

// 向后兼容：isClaudeFamily 随模型目录下沉到 model-catalog，原导出点保留
export { isClaudeFamily };

const execFileAsync = promisify(execFile);

/**
 * npm run 会把每一级祖先目录的 node_modules/.bin 前置到 PATH，可能让同名的陈旧本地包
 * （如残留的旧版 codex）遮蔽全局安装的 CLI；探测与启动 CLI 前剔除这些注入项（issue：新建会话降级报错）。
 */
export function sanitizeCliEnvironment(environment: Readonly<Record<string, string | undefined>>): Record<string, string | undefined> {
  const path = environment.PATH;
  if (!path) return { ...environment };
  const npmInjected = (entry: string) => entry.endsWith(`${sep}node_modules${sep}.bin`) || entry.includes(`${sep}node-gyp-bin`);
  return { ...environment, PATH: path.split(delimiter).filter((entry) => !npmInjected(entry)).join(delimiter) };
}

/** CLI 版本范围环境变量覆盖：`SPECOS_CLI_VERSION_OVERRIDE=codex@0.50.0,claude-code@2.0.30` */
function loadEnvVersionOverride(): Record<string, string> {
  const raw = process.env.SPECOS_CLI_VERSION_OVERRIDE;
  if (!raw) return {};
  const map: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [adapterId, range] = pair.split("@").map((value) => value.trim());
    if (adapterId && range) map[adapterId] = range;
  }
  return map;
}

/** 内部诊断 → 前端公开降级原因（api-spec §2.6 降级透传） */
export function mapDetectionFailureToDowngradeReason(failure: CapabilityDetectionFailure | undefined): DowngradeReason | undefined {
  switch (failure) {
    case "command-missing":
      return "command-missing";
    case "version-out-of-range":
      return "version-out-of-range";
    case "adapter-unsupported":
      return "adapter-unsupported";
    case "version-unparseable":
      return "unknown-version";
    case "unknown":
      return "capability-detect-failed";
    default:
      return undefined;
  }
}

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
  supportsApproval: false,
  supportsPromptEnhancement: false
};

/** 已验证 CLI 版本范围默认值（adapter-spec §5）；版本外 headless 能力关闭。kimi/glm 无默认区间：探测到版本即通过 */
const defaultAdapterVersionRanges: Record<string, string | undefined> = {
  codex: ">=0.145.0 <1.0.0",
  "claude-code": ">=2.0.0 <3.0.0"
};

/** Claude Code 协议家族：kimi / glm 为兼容 fork，复用 stream-json / --resume / --permission-mode 链路（isClaudeFamily 见 model-catalog） */
const claudeOptions = {
  permissions: options(["default", "acceptEdits", "auto", "bypassPermissions", "manual", "dontAsk", "plan"]),
  modes: options([])
};

const codexOptions = {
  permissions: options(["default", "untrusted", "on-request", "never"]),
  modes: options(["default", "read-only", "workspace-write", "danger-full-access"])
};

/** kimi/glm：权限旗同 claude（fork 保留 --permission-mode）；模型目录见 model-catalog */
const claudeCompatibleOptions = {
  permissions: claudeOptions.permissions,
  modes: options([])
};

export function createProfileAdapterRegistry(options: { logger?: Logger } = {}): ProfileAdapterRegistry {
  const logger = options.logger;
  const envVersionOverride = loadEnvVersionOverride();
  const capabilityCache = new Map<string, Promise<CliProfileCapabilities>>();

  async function capabilities(profile: CliProfileV2): Promise<CapabilityDetectionResult> {
    // 同步/导入会改变合并模型列表：将两层来源纳入缓存键，变更后自动重新探测（console-gaps SPEC §2.5）
    const modelKey = `${(profile.syncedModels ?? []).join("|")}:${(profile.customModels ?? []).join("|")}`;
    const key = `${profile.id}:${profile.command}:${profile.adapterId}:${profile.adapterVersionRange ?? ""}:${modelKey}`;
    const cached = capabilityCache.get(key);
    if (cached) return cached;
    const pending = detectCapabilities(profile, { logger, envVersionOverride });
    capabilityCache.set(key, pending);
    return pending;
  }

  return {
    availableAdapterIds: ["claude-code", "codex", "kimi", "glm", "generic"],
    capabilities,
    async resolveLaunch(profile, config) {
      const detected = await capabilities(profile);
      const args = [...profile.args];
      if (detected.compatibility !== "supported") return { command: profile.command, args, capabilities: detected };
      const adapter = profile.adapterId;
      appendOption(args, config.permission, isClaudeFamily(adapter) ? "--permission-mode" : adapter === "codex" ? "--ask-for-approval" : undefined, detected.permissions);
      appendOption(args, config.mode, adapter === "codex" ? "--sandbox" : undefined, detected.modes);
      appendOption(args, config.model, "--model", detected.models);
      // terminal 模式原生 resume：codex 以 `resume <id>` 子命令前置；claude 家族追加 --resume；generic 忽略
      if (config.resumeToken && detected.supportsResume) {
        if (adapter === "codex") args.splice(profile.args.length, 0, "resume", config.resumeToken);
        else if (isClaudeFamily(adapter)) args.push("--resume", config.resumeToken);
      }
      return { command: profile.command, args, capabilities: detected };
    },
    async buildTurn(profile, config) {
      const detected = await capabilities(profile);
      // Adapter 无状态纯翻译：headless 不支持时被调用属上层缺陷（adapter-spec §3.3）
      if (!detected.supportsHeadlessTurns) throw new HeadlessTurnUnsupportedError(profile.adapterId);
      if (isClaudeFamily(profile.adapterId)) {
        // claude -p --output-format stream-json --verbose --include-partial-messages（adapter-spec §3.2；增量帧 streaming-spec FR-8）
        const args = [...profile.args, "-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages"];
        appendOption(args, config.permission, "--permission-mode", detected.permissions);
        appendOption(args, config.mode, undefined, detected.modes);
        appendOption(args, config.model, "--model", detected.models);
        if (config.resumeToken) args.push("--resume", config.resumeToken);
        args.push(config.prompt);
        return { command: profile.command, args };
      }
      if (profile.adapterId !== "codex") throw new HeadlessTurnUnsupportedError(profile.adapterId);
      const args = [...profile.args, "exec", "--json"];
      appendOption(args, config.model, "--model", detected.models);
      appendOption(args, config.mode, "--sandbox", detected.modes);
      appendOption(args, config.permission, "--ask-for-approval", detected.permissions);
      if (config.resumeToken) args.push("resume", config.resumeToken);
      args.push(config.prompt);
      return { command: profile.command, args };
    },
    parseEvents(profile, stream, ctx, hooks) {
      if (profile.adapterId === "codex") return parseCodexEvents(stream, ctx);
      if (isClaudeFamily(profile.adapterId)) return parseClaudeEvents(stream, ctx, hooks);
      throw new HeadlessTurnUnsupportedError(profile.adapterId);
    },
    async buildEnhance(profile, config) {
      const detected = await capabilities(profile);
      // 上层应先校验 supportsPromptEnhancement；这里拒绝属防御性兑底（project-quest SPEC §5.7）
      if (!detected.supportsPromptEnhancement) throw new EnhanceUnsupportedError(profile.adapterId);
      if (profile.adapterId === "codex") return { command: profile.command, args: [...profile.args, "exec", "--skip-git-repo-check", config.prompt] };
      if (isClaudeFamily(profile.adapterId)) return { command: profile.command, args: [...profile.args, "-p", config.prompt] };
      throw new EnhanceUnsupportedError(profile.adapterId);
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

export class EnhanceUnsupportedError extends Error {
  readonly code = "ENHANCE_UNAVAILABLE" as const;
  constructor(adapterId: string) {
    super(`Adapter does not support prompt enhancement: ${adapterId}`);
    this.name = "EnhanceUnsupportedError";
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

/** Claude `-p --output-format stream-json` JSONL → 规范事件；容错映射表，未识别降级 pty_output（adapter-spec §3.2、§4） */
async function* parseClaudeEvents(stream: Readable, ctx: ParseContext, hooks?: TurnStreamHooks): AsyncGenerator<ParsedTurnEvent, TurnParseResult, void> {
  const result: TurnParseResult = {};
  let buffer = "";
  for await (const chunk of stream) {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      yield* mapClaudeLine(line, ctx, result, hooks);
      newline = buffer.indexOf("\n");
    }
  }
  if (buffer.length > 0) yield* mapClaudeLine(buffer, ctx, result, hooks);
  return result;
}

function* mapClaudeLine(line: string, ctx: ParseContext, result: TurnParseResult, hooks?: TurnStreamHooks): Generator<ParsedTurnEvent> {
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
  const event = parsed as { type: string; session_id?: unknown; message?: unknown; usage?: unknown; event?: unknown };
  // session_id 多帧重复出现：取最后一个（adapter-spec §6）
  if (typeof event.session_id === "string" && event.session_id) result.resumeToken = event.session_id;
  // --include-partial-messages 的增量帧：text_delta → hooks；其余子型静默忽略（已知高频帧不降级，streaming-spec §3.6）
  if (event.type === "stream_event") {
    const inner = event.event as { type?: unknown; delta?: { type?: unknown; text?: unknown } } | undefined;
    if (inner?.type === "content_block_delta" && inner.delta?.type === "text_delta" && typeof inner.delta.text === "string") {
      hooks?.onDelta?.(inner.delta.text);
    }
    return;
  }
  if (event.type === "system") {
    // init 等系统帧：提取 session_id 后不产出事件；无 session_id 的未知系统帧降级
    if (typeof event.session_id === "string" && event.session_id) return;
    yield { kind: "pty_output", source: "profile-adapter", raw: line, metadata: { turnId: ctx.turnId } };
    return;
  }
  // user 帧为 tool_result 回显：tool_use 已产 tool_activity，且 Adapter 不得产出 user_message（adapter-spec §4）
  if (event.type === "user") return;
  if (event.type === "assistant" && event.message && typeof event.message === "object") {
    const content = (event.message as { content?: unknown }).content;
    if (Array.isArray(content)) {
      let emitted = false;
      for (const item of content) {
        const block = item as { type?: unknown; text?: unknown; name?: unknown };
        if (block?.type === "text" && typeof block.text === "string") {
          emitted = true;
          yield { kind: "assistant_message", source: "profile-adapter", raw: block.text, metadata: { turnId: ctx.turnId } };
        } else if (block?.type === "tool_use" && typeof block.name === "string") {
          emitted = true;
          yield { kind: "tool_activity", source: "profile-adapter", raw: block.name, metadata: { turnId: ctx.turnId, tool: block.name } };
        }
      }
      if (emitted) return;
    }
    yield { kind: "pty_output", source: "profile-adapter", raw: line, metadata: { turnId: ctx.turnId } };
    return;
  }
  if (event.type === "result") {
    const usage = event.usage as { input_tokens?: unknown; output_tokens?: unknown } | undefined;
    if (usage && typeof usage === "object") {
      result.usage = {
        inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : undefined,
        outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : undefined
      };
    }
    return;
  }
  yield { kind: "pty_output", source: "profile-adapter", raw: line, metadata: { turnId: ctx.turnId } };
}

async function detectCapabilities(profile: CliProfileV2, options: { logger?: Logger; envVersionOverride?: Record<string, string> } = {}): Promise<CapabilityDetectionResult> {
  if (profile.adapterId === "generic") return { ...genericCapabilities, detectionFailure: "adapter-unsupported" };
  let detectedVersion: string | undefined;
  let compatibility: CliProfileCapabilities["compatibility"] = "unknown-version";
  let detectionFailure: CapabilityDetectionFailure = "unknown";
  try {
    const result = await execFileAsync(profile.command, ["--version"], { timeout: 2_000, maxBuffer: 64 * 1024, shell: false, env: sanitizeCliEnvironment(process.env) });
    detectedVersion = `${result.stdout} ${result.stderr}`.match(/\b\d+\.\d+(?:\.\d+)?\b/)?.[0];
    compatibility = detectedVersion ? "supported" : "unknown-version";
    if (!detectedVersion) detectionFailure = "version-unparseable";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    compatibility = code === "ENOENT" ? "unavailable" : "unknown-version";
    detectionFailure = code === "ENOENT" ? "command-missing" : "unknown";
  }
  const optionSet = profile.adapterId === "claude-code" ? claudeOptions : isClaudeFamily(profile.adapterId) ? claudeCompatibleOptions : codexOptions;
  // 模型列表：内置目录（按探测版本）∪ syncedModels ∪ customModels，去重且 default 首位（console-gaps SPEC §2.5）
  const mergedModels: CliOptionDefinition[] = mergeModelSources(builtinModelIds(profile.adapterId, detectedVersion), profile.syncedModels ?? [], profile.customModels ?? []).map((entry) => ({ id: entry.id, labelKey: `cli.option.${entry.id}`, requiresRestart: true }));
  // 优先级：profile 自身的 adapterVersionRange > 环境变量 > 默认区间
  const versionRange = profile.adapterVersionRange ?? options.envVersionOverride?.[profile.adapterId] ?? defaultAdapterVersionRanges[profile.adapterId];
  const withinVerifiedRange = compatibility === "supported" && versionWithinRange(detectedVersion, versionRange);
  if (compatibility === "supported" && !withinVerifiedRange) detectionFailure = "version-out-of-range";
  // codex（A 段）与 claude 家族（claude-code B 段 issue-010；kimi/glm 兼容 fork）开启 headless；approval 一律 false（adapter-spec §2.2 表）
  const headless = withinVerifiedRange && (profile.adapterId === "codex" || isClaudeFamily(profile.adapterId));
  // 结构化日志：复现「CLI 不通」一类问题时第一手信息（issue-009 follow-up）
  options.logger?.info("CLI capability detection", {
    profileId: profile.id,
    adapterId: profile.adapterId,
    command: profile.command,
    detectedVersion,
    versionRange,
    compatibility,
    supportsHeadlessTurns: headless,
    detectionFailure
  });
  return {
    adapterId: profile.adapterId,
    detectedVersion,
    compatibility,
    permissions: compatibility === "supported" ? optionSet.permissions : [],
    modes: compatibility === "supported" ? optionSet.modes : [],
    models: compatibility === "supported" ? mergedModels : [],
    supportsComposer: true,
    supportsStructuredRecognition: compatibility === "supported",
    supportsHeadlessTurns: headless,
    supportsResume: headless,
    supportsApproval: false,
    // 润色与 headless 同门槛：需 CLI 在验证版本区间内且为 codex/claude 家族（generic 恒 false）
    supportsPromptEnhancement: headless,
    detectionFailure,
    versionRange
  };
}

/** 简单 semver 范围匹配已下沉至 model-catalog（versionWithinRange），与内置模型目录共用 */

function appendOption(args: string[], value: string | null, flag: string | undefined, definitions: CliOptionDefinition[]) {
  if (!value || value === "default") return;
  if (!flag || !definitions.some((definition) => definition.id === value)) throw new UnsupportedCliOptionError(value);
  args.push(flag, value);
}

function options(ids: string[]): CliOptionDefinition[] {
  return ids.map((id) => ({ id, labelKey: `cli.option.${id}`, requiresRestart: true }));
}
