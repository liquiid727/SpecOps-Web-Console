import type http from "node:http";
import type { AppStateV3, CliProfileV3, CliProfileCapabilities, FilePreview, FileTreePage, GitDiffResponse, GitStatusResponse, LanguageSummaryResponse, SessionRuntimeStatus, TranscriptEvent, TranscriptEventKind, TranscriptEventMetadataValue, TranscriptEventSource, TranscriptPage, Workspace } from "../shared/types.js";
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
  onRuntimeStatus(sessionId: string, status: SessionRuntimeStatus, extra?: { exitCode?: number; resumeToken?: string }): Promise<void>;
  onActivity(sessionId: string): void;
  hasSession(sessionId: string): boolean;
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
  model?: string;
  resumeToken?: string;
}

/** 执行控制层 port（runtime-orchestrator-spec §2.1）；不理解任何 CLI 语义 */
export interface RuntimeOrchestrator {
  /** 幂等 start：并发调用收敛到单一启动操作；prepare 在启动锁内执行且最多一次 */
  start(sessionId: string, prepare: () => Promise<PreparedLaunch>, terminal?: { cols?: number; rows?: number }): Promise<void>;
  /** 幂等 stop：无 Worker 时 no-op；返回是否有 Worker 被停止 */
  stop(sessionId: string): Promise<boolean>;
  /** 仅 chat 模式：提交一轮；违反互斥抛 TURN_IN_PROGRESS（issue-005 实现） */
  submitTurn(sessionId: string, input: TurnInput): Promise<{ turnId: string }>;
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
  capabilities?(profile: CliProfileV3): Promise<CliProfileCapabilities>;
  resolveLaunch?(profile: CliProfileV3, config: { permission: string | null; mode: string | null; model: string | null }): Promise<{ command: string; args: string[]; capabilities: CliProfileCapabilities }>;
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
