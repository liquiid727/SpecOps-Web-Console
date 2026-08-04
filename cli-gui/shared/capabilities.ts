import type { CliAdapterId } from "./state.js";

export type AgentEngineId = "codex" | "claude";
export type AgentTransportKind = "native-sdk" | "acp" | "json-stream" | "pty";

export interface EngineRemediation {
  kind: "install-guide" | "authenticate" | "update" | "retry-probe" | "open-setup-terminal";
  code: "ENGINE_NOT_INSTALLED" | "ENGINE_AUTH_REQUIRED" | "ENGINE_VERSION_UNSUPPORTED" | "ENGINE_PROBE_TIMEOUT" | "ENGINE_PROBE_UNKNOWN";
  label: string;
  url?: string;
}

/** Product-facing health for a runnable Agent Engine. */
export interface EngineReadiness {
  engineId: AgentEngineId;
  profileId: string;
  installation: "available" | "missing";
  authentication: "ready" | "required" | "unknown";
  compatibility: "supported" | "unsupported" | "unknown";
  version?: string;
  selectedTransport?: AgentTransportKind;
  capabilities?: CliProfileCapabilities;
  remediation?: EngineRemediation;
}

export interface CliOptionDefinition {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  requiresRestart: boolean;
}

export interface ProviderModelGroup {
  providerId: string;
  providerName: string;
  models: CliOptionDefinition[];
}

export interface CliProfileCapabilities {
  adapterId: CliAdapterId;
  detectedVersion?: string;
  compatibility: "supported" | "unknown-version" | "unavailable";
  permissions: CliOptionDefinition[];
  modes: CliOptionDefinition[];
  models: CliOptionDefinition[];
  /** Optional display grouping for models contributed by compatible providers. */
  modelGroups?: ProviderModelGroup[];
  /** Model resolved from the CLI configuration when no explicit model is selected. */
  defaultModel?: string;
  supportsComposer: boolean;
  supportsStructuredRecognition: boolean;
  /** 是否支持 headless 单轮执行（决定可否创建 chat 会话，adapter-spec §2.2） */
  supportsHeadlessTurns: boolean;
  /** 是否支持原生多轮 resume（chat 多轮上下文的前提） */
  supportsResume: boolean;
  /** 是否支持 headless 审批协议（D-8；false 时权限不足→轮次失败+指引） */
  supportsApproval: boolean;
  /** 是否支持提示词润色/压缩一次性调用（project-quest SPEC §5.7：codex/claude 家族 true、generic false） */
  supportsPromptEnhancement: boolean;
  /** GUI 渲染能力分级（dual-mode 设计 §8.2）：full=完整 GUI 可用，partial=实验性可切但降级提示，unsupported=仅终端 */
  guiMode: "full" | "partial" | "unsupported";
}

/** 服务端创建会话时，若 chat 降级为 terminal，附带的公开降级原因（便于前端精准提示与排查） */
export type DowngradeReason =
  | "capability-detect-failed"
  | "version-out-of-range"
  | "command-missing"
  | "unknown-version"
  | "adapter-unsupported";

/** CLI 能力探测诊断（内部；含 DowngradeReason 未覆盖的细节，主要用于日志） */
export type CapabilityDetectionFailure =
  | "command-missing"
  | "version-unparseable"
  | "version-out-of-range"
  | "adapter-unsupported"
  | "probe-timeout"
  | "unknown";

/** 探测结果：CliProfileCapabilities + 诊断字段（adapter-spec §5） */
export interface CapabilityDetectionResult extends CliProfileCapabilities {
  /** 探测失败原因（仅用于日志与 downgradeReason 透传） */
  detectionFailure?: CapabilityDetectionFailure;
  /** 探测到的 CLI 版本字符串（如 "0.145.0"） */
  detectedVersion?: string;
  /** 用于判定 headless 的版本范围（如 ">=0.145.0 <1.0.0"） */
  versionRange?: string;
}

/** 合并模型列表的来源层（console-gaps SPEC §2）：内置目录 / 本机 CLI 配置同步 / 手动导入 */
export type ProfileModelSource = "builtin" | "synced" | "custom";

export interface ProfileModelEntry {
  id: string;
  source: ProfileModelSource;
}

/** `GET/POST /api/profiles/:id/models*` 响应：sync 额外回报本次同步发现的 id */
export interface ProfileModelsResponse {
  models: ProfileModelEntry[];
  synced?: string[];
}

export type GitFileStatus = "unmodified" | "added" | "deleted" | "modified" | "renamed" | "copied" | "untracked" | "ignored" | "conflicted";
export type WorkspaceVisibilitySource = "git" | "fallback-exclusions";

export interface FileTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  gitStatus?: GitFileStatus;
}

export interface FileTreePage {
  path: string;
  entries: FileTreeEntry[];
  nextCursor?: string;
  omittedCount: number;
  visibilitySource: WorkspaceVisibilitySource;
}

export interface FilePreview {
  path: string;
  kind: "text" | "binary" | "oversized";
  size: number;
  encoding?: "utf-8";
  content?: string;
  truncated: boolean;
  shownBytes: number;
}

export interface LanguageSummaryEntry {
  language: string;
  files: number;
  bytes: number;
  share: number;
}

export interface LanguageSummaryResponse {
  entries: LanguageSummaryEntry[];
  partial: boolean;
  partialReason?: "file-limit" | "byte-limit" | "time-limit";
  visibilitySource: WorkspaceVisibilitySource;
}

export interface GitStatusEntry {
  path: string;
  previousPath?: string;
  staged: GitFileStatus;
  unstaged: GitFileStatus;
  conflicted: boolean;
}

export interface GitStatusResponse {
  repository: boolean;
  branch?: string;
  detachedHead?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  clean: boolean;
  entries: GitStatusEntry[];
  truncated: boolean;
}

export interface DiffLine {
  kind: "context" | "addition" | "deletion" | "meta";
  text: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath?: string;
  newPath?: string;
  status: "added" | "deleted" | "modified" | "renamed" | "binary" | "conflicted";
  hunks: DiffHunk[];
}

export interface GitDiffResponse {
  scope: "unstaged" | "staged";
  files: DiffFile[];
  truncated: boolean;
  originalBytes: number;
  shownLines: number;
}
