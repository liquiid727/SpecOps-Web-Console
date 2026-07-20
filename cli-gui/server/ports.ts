import type http from "node:http";
import type { AppStateV2, FilePreview, FileTreePage, GitDiffResponse, GitStatusResponse, LanguageSummaryResponse, TranscriptEvent, TranscriptEventKind, TranscriptEventMetadataValue, TranscriptEventSource, TranscriptPage, Workspace } from "../shared/types.js";
import type { WebSocket } from "ws";

export interface StateRepository {
  load(): Promise<AppStateV2>;
  save(state: AppStateV2): Promise<void>;
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
  }): Promise<TranscriptEvent>;
  list(sessionId: string, options?: { afterSequence?: number; limit?: number }): Promise<TranscriptPage>;
  latest(sessionId: string): Promise<TranscriptEvent | undefined>;
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

export interface FileStat {
  isDirectory(): boolean;
  isFile?(): boolean;
  size?: number;
}

export interface DirectoryEntry {
  name: string;
  type: "file" | "directory";
}

export interface FileSystem {
  stat(path: string): Promise<FileStat>;
  access(path: string): Promise<void>;
  readFile(path: string): Promise<Buffer>;
  realpath(path: string): Promise<string>;
  readdir(path: string): Promise<DirectoryEntry[]>;
}

export interface GitInspector {
  readonly available: boolean;
  status(workspacePath: string): Promise<GitStatusResponse>;
  diff(workspacePath: string, scope: "unstaged" | "staged"): Promise<GitDiffResponse>;
}

export interface DirectoryPicker {
  readonly available: boolean;
  pick(): Promise<{ cancelled: true } | { cancelled: false; path: string }>;
}

export interface ProfileAdapterRegistry {
  readonly availableAdapterIds: readonly string[];
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
