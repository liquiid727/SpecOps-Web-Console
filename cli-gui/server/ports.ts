import type http from "node:http";
import type { Readable } from "node:stream";
import type { AppStateV3, CliProfileV3, CliProfileCapabilities, CapabilityDetectionResult, FilePreview, FileTreePage, GitDiffResponse, GitStatusResponse, LanguageSummaryResponse, SessionRuntimeStatus, TranscriptEvent, TranscriptEventKind, TranscriptEventMetadataValue, TranscriptEventSource, TranscriptPage, Workspace } from "../shared/types.js";
import type { WebSocket } from "ws";

export interface StateRepository {
  load(): Promise<AppStateV3>;
  save(state: AppStateV3): Promise<void>;
  drain(): Promise<void>;
}

export interface TranscriptRepository {
  append(input: {
    sessionId: string;
    occurredAt: string;
    kind: TranscriptEventKind;
    source: TranscriptEventSource;
    raw: string;
    metadata?: Record<string, TranscriptEventMetadataValue>;
    clientMessageId?: string;
    sequenceOffset?: number;
    retentionFloorSequence?: number;
  }): Promise<TranscriptEvent>;
  list(sessionId: string, options?: { afterSequence?: number; limit?: number }): Promise<TranscriptPage>;
  latest(sessionId: string): Promise<TranscriptEvent | undefined>;
  findByClientMessageId?(sessionId: string, clientMessageId: string): Promise<TranscriptEvent | undefined>;
  delete(sessionId: string): Promise<void>;
  drain(): Promise<void>;
}

export interface PtyProcess {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData(listener: (data: string) => void): void;
  onExit(listener: (event: { exitCode: number }) => void): void;
}

export interface PtySpawnOptions {
  command: string;
  args: string[];
  cwd: string;
  cols: number;
  rows: number;
  env: Record<string, string>;
  name: string;
}

export interface PtyRuntime {
  spawn(options: PtySpawnOptions): PtyProcess;
  shutdown(): Promise<void>;
}

export interface AppendEventInput {
  occurredAt: string;
  kind: TranscriptEventKind;
  source: TranscriptEventSource;
  raw: string;
  metadata?: Record<string, TranscriptEventMetadataValue>;
  clientMessageId?: string;
}

/** 回调依赖注入：transcript 写入与 state 持久化留在 Session Manager（runtime-orchestrator-spec §2.2） */
export interface OrchestratorCallbacks {
  appendEvent(sessionId: string, input: AppendEventInput): Promise<TranscriptEvent | undefined>;
  onRuntimeStatus(sessionId: string, status: SessionRuntimeStatus, extra?: { exitCode?: number; resumeToken?: string; errorMessage?: string }): Promise<void>;
  onActivity(sessionId: string): void;
  hasSession(sessionId: string): boolean;
  /** 轮次即时状态提示（api-spec §4.2 turn-status 帧）；可选，不影响事件回放完整性 */
  onTurnStatus?(sessionId: string, turnId: string, status: "running" | "waiting_approval" | "completed" | "failed" | "cancelled"): void;
  /** 轮次文本增量提示帧（同 turn-status 临时帧语义：不落盘、断线不补发） */
  onTurnDelta?(sessionId: string, turnId: string, delta: string): void;
}

export interface PreparedLaunch {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

export interface TurnInput {
  turnId: string;
  prompt: string;
  clientMessageId?: string;
  model?: string;
  resumeToken?: string;
  /** CLI 语义注入（Adapter buildTurn 的应用侧包装）：Orchestrator 不理解任何 CLI 语义 */
  buildCommand(): Promise<PreparedLaunch>;
  /** CLI 语义注入（Adapter parseEvents 的应用侧包装）：stdout → 规范事件流；hooks 承载文本增量 */
  parseOutput(stdout: Readable, hooks?: TurnStreamHooks): AsyncGenerator<ParsedTurnEvent, TurnParseResult, void>;
  /** headless 审批应答格式（Adapter 声明，D-8）；存在时 Orchestrator 保持 stdin 开放并启用 waiting_approval 挂起路径 */
  buildApprovalResponse?(approvalId: string, decision: "allow" | "deny"): string;
  /** 常驻运行时路径（streaming-spec FR-2）：抛 PersistentRuntimeUnavailableError 时同轮回落 spawn 路径 */
  runPersistent?(handlers: PersistentTurnHandlers): PersistentTurnHandle;
}

/** 轮次流式增量回调（临时通道，不落 transcript） */
export interface TurnStreamHooks {
  onDelta?(delta: string): void;
}

export interface PersistentTurnHandlers {
  onEvent(event: ParsedTurnEvent): Promise<void>;
  onDelta(delta: string): void;
}

export interface PersistentTurnHandle {
  /** 轮次结束的解析结论（与 spawn 路径 TurnParseResult 同构）；失败/进程崩溃时 reject */
  result: Promise<TurnParseResult>;
  /** 取消/超时：终止承载本轮的常驻进程 */
  kill(): void;
}

/** 常驻运行时启动前不可用信号：Orchestrator 捕获后同轮回落 spawn 路径（streaming-spec FR-5） */
export class PersistentRuntimeUnavailableError extends Error {
  readonly code = "PERSISTENT_RUNTIME_UNAVAILABLE" as const;
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PersistentRuntimeUnavailableError";
  }
}

export interface PersistentChatTurnRequest {
  turnId: string;
  prompt: string;
  cwd: string;
  env: Record<string, string>;
  command: string;
  model: string | null;
  sandboxMode: string | null;
  approvalPolicy: string | null;
  resumeToken?: string;
}

/** 每会话常驻 chat 运行时（streaming-spec §3.3）；生产组装为 codex mcp-server 实现 */
export interface PersistentChatRuntime {
  runTurn(sessionId: string, turn: PersistentChatTurnRequest, handlers: PersistentTurnHandlers): PersistentTurnHandle;
  /** 会话 stop/delete：终止对应进程（幂等） */
  release(sessionId: string): void;
  /** 服务关停：终止全部进程 */
  shutdown(): Promise<void>;
}

/** 执行控制层 port（runtime-orchestrator-spec §2.1）；不理解任何 CLI 语义 */
export interface RuntimeOrchestrator {
  /** 幂等 start：并发调用收敛到单一启动操作；prepare 在启动锁内执行且最多一次 */
  start(sessionId: string, prepare: () => Promise<PreparedLaunch>, terminal?: { cols?: number; rows?: number }): Promise<void>;
  /** 幂等 stop：无 Worker 时 no-op；返回是否有 Worker 被停止 */
  stop(sessionId: string): Promise<boolean>;
  /** 仅 chat 模式：提交一轮；违反互斥抛 TURN_IN_PROGRESS；返回已落盘的 user_message 事件（api-spec §2.2 响应需要） */
  submitTurn(sessionId: string, input: TurnInput): Promise<{ turnId: string; event: TranscriptEvent }>;
  cancelTurn(sessionId: string, turnId: string): Promise<void>;
  respondApproval(sessionId: string, approvalId: string, decision: "allow" | "deny"): Promise<void>;
  isRunning(sessionId: string): boolean;
  writeTerminal(sessionId: string, data: string): void;
  resizeTerminal(sessionId: string, cols: unknown, rows: unknown): void;
  attachTerminalClient(sessionId: string, client: WebSocket): void;
  detachTerminalClient(sessionId: string, client: WebSocket): void;
  runningCount(): number;
  /** 关停窗口内先行屏蔽 PTY 回调（现有 closing 语义保持） */
  beginShutdown(): void;
  /** 停全部 Worker + flush transcript 队列；返回曾持有 Worker 的 sessionId */
  shutdown(): Promise<string[]>;
}

export interface FileStat {
  isDirectory(): boolean;
  isFile?(): boolean;
  size?: number;
}

export interface DirectoryEntry {
  name: string;
  type: "file" | "directory";
  isSymlink?: boolean;
}

export interface FileSystem {
  stat(path: string): Promise<FileStat>;
  access(path: string): Promise<void>;
  readFile(path: string): Promise<Buffer>;
  readFileBounded?(path: string, maxBytes: number): Promise<{ buffer: Buffer; size: number }>;
  realpath(path: string): Promise<string>;
  readdir(path: string): Promise<DirectoryEntry[]>;
}

export interface GitInspector {
  readonly available: boolean;
  status(workspacePath: string): Promise<GitStatusResponse>;
  diff(workspacePath: string, scope: "unstaged" | "staged"): Promise<GitDiffResponse>;
  listVisibleFiles?(workspacePath: string): Promise<string[]>;
}

export class GitInspectorError extends Error {
  constructor(readonly code: "GIT_UNAVAILABLE" | "GIT_TIMEOUT" | "NOT_A_GIT_REPOSITORY", message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GitInspectorError";
  }
}

export interface DirectoryPicker {
  readonly available: boolean;
  pick(): Promise<{ cancelled: true } | { cancelled: false; path: string }>;
}

export interface ProfileAdapterRegistry {
  readonly availableAdapterIds: readonly string[];
  capabilities?(profile: CliProfileV3): Promise<CapabilityDetectionResult>;
  /** resumeToken：terminal 模式原生恢复（codex `resume <id>` / claude 家族 `--resume <id>`），generic 忽略 */
  resolveLaunch?(profile: CliProfileV3, config: { permission: string | null; mode: string | null; model: string | null; resumeToken?: string }): Promise<{ command: string; args: string[]; capabilities: CapabilityDetectionResult }>;
  /** 组装 headless 单轮 argv（chat 模式），含原生 resume（adapter-spec §2.1） */
  buildTurn?(profile: CliProfileV3, config: TurnConfig): Promise<CommandSpec>;
  /** 将单轮子进程 stdout 解析为规范事件流；迭代完成后 return TurnParseResult；hooks 承载文本增量（streaming-spec FR-8） */
  parseEvents?(profile: CliProfileV3, stream: Readable, ctx: ParseContext, hooks?: TurnStreamHooks): AsyncGenerator<ParsedTurnEvent, TurnParseResult, void>;
  /** headless 审批应答的 stdin 写入格式（B 段，D-8）；仅 capability supportsApproval 为 true 的 profile 接线 */
  buildApprovalResponse?(profile: CliProfileV3, approvalId: string, decision: "allow" | "deny"): string;
  /** 组装润色/压缩一次性 argv（project-quest SPEC §5.7：codex exec / claude -p，参数数组）；不支持的 adapter 抛错 */
  buildEnhance?(profile: CliProfileV3, config: { prompt: string }): Promise<CommandSpec>;
}

export interface TurnConfig {
  workspacePath: string;
  prompt: string;
  permission: string | null;
  mode: string | null;
  model: string | null;
  resumeToken?: string;
}

export interface CommandSpec {
  command: string;
  /** argv 数组——安全基线：禁止 shell 字符串拼接 */
  args: string[];
  env?: Record<string, string>;
}

export interface ParseContext {
  /** 注入每个产出事件的 metadata.turnId */
  turnId: string;
}

/** parseEvents 产出：TranscriptEvent 的内容部分，id/sessionId/sequence 由落盘时补齐 */
export interface ParsedTurnEvent {
  kind: TranscriptEventKind;
  source: TranscriptEventSource;
  raw: string;
  metadata?: Record<string, string | number | boolean>;
}

/** 轮次结束后由 Orchestrator 读取的解析结论 */
export interface TurnParseResult {
  resumeToken?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface Clock {
  now(): string;
}

export interface IdGenerator {
  create(prefix: string): string;
}

export interface RuntimePolicy {
  readonly: boolean;
  processEnvironment: Readonly<Record<string, string | undefined>>;
  csrfCapability?: string;
  pickerIntentTtlMs?: number;
  /** 可选：skills system scope 扫描根（缺省 os.homedir()；测试注入假目录，console-gaps SPEC §7） */
  skillsHomeDirectory?: string;
  /** 可选：润色一次性调用超时（缺省 30s；测试注入短超时，project-quest SPEC §5.7） */
  enhanceTimeoutMs?: number;
}

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface ApplicationDependencies {
  stateRepository: StateRepository;
  transcriptRepository: TranscriptRepository;
  ptyRuntime: PtyRuntime;
  filesystem: FileSystem;
  gitInspector: GitInspector;
  directoryPicker: DirectoryPicker;
  profileAdapters: ProfileAdapterRegistry;
  /** 可选：terminal 原生 resume 的 token 归因发现（缺省扫描 CLI 本地会话目录；测试可注入假实现） */
  terminalResumeDiscovery?: (input: { adapterId: string; cwd: string; sinceMs: number; env?: Readonly<Record<string, string | undefined>> }) => Promise<string | undefined>;
  /** 可选：模型同步读取本机 CLI 配置（缺省读 ~/.codex/config.toml 与 ~/.claude/settings.json；测试可注入假实现，console-gaps SPEC §2.2） */
  modelSyncReader?: (profile: import("../shared/types.js").CliProfileV2) => Promise<string[]>;
  /** 可选：codex 常驻 chat 运行时（缺省时 chat 轮次全部走 spawn 冷路径） */
  persistentChatRuntime?: PersistentChatRuntime;
  clock: Clock;
  idGenerator: IdGenerator;
  policy: RuntimePolicy;
  logger: Logger;
}

export interface Application {
  handleHttp(request: http.IncomingMessage, response: http.ServerResponse, url: URL): Promise<void>;
  handleWebSocket(client: WebSocket, request: http.IncomingMessage, url: URL): void;
  close(): Promise<void>;
}
