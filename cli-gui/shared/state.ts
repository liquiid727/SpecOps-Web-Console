export const CURRENT_SCHEMA_VERSION = 3 as const;

export type CliAdapterId = "claude-code" | "codex" | "generic";

/** MVP01 恒为 "local-folder"；managed-workspace / ssh-remote 为预留值（domain-spec §2.2）。 */
export type WorkspaceKind = "local-folder" | "managed-workspace" | "ssh-remote";

export interface Workspace {
  id: string;
  name: string;
  path: string;
  kind: WorkspaceKind;
  createdAt: string;
  lastOpenedAt?: string;
}

export interface CliProfile {
  id: string;
  name: string;
  command: string;
  args: string[];
  adapterId: CliAdapterId;
  adapterVersionRange?: string;
  createdAt: string;
}

export type SessionRuntimeStatus = "starting" | "running" | "stopped" | "error";
export type SessionOrganizationStatus = "active" | "completed" | "archived";

/** 交互模式，创建时确定，不可变更（Fork 时继承，可改）。 */
export type SessionInteractionMode = "chat" | "terminal";

export interface SessionLaunchConfig {
  permission: string | null;
  mode: string | null;
  model: string | null;
  /** B 段：启动前受控 checkout 的分支（可选，缺失不回填）。 */
  branch?: string | null;
}

/** chat 模式的多轮上下文（terminal 模式恒为 undefined，不变式 I-3）。 */
export interface SessionChatContext {
  /** CLI 原生 resume 凭据：codex thread id / claude session id。 */
  resumeToken?: string;
  /** 当前生效模型；composer 内切换后下一轮生效并持久化。 */
  activeModel?: string;
  /** 最近一次成功轮次完成时间。 */
  lastTurnCompletedAt?: string;
}

export interface SessionRuntimeError {
  code: string;
  message: string;
  occurredAt: string;
}

export interface Session {
  id: string;
  workspaceId: string;
  profileId: string;
  name: string;
  interactionMode: SessionInteractionMode;
  runtimeStatus: SessionRuntimeStatus;
  organizationStatus: SessionOrganizationStatus;
  pinned: boolean;
  manualOrder: number;
  launchConfig: SessionLaunchConfig;
  chatContext?: SessionChatContext;
  parentSessionId?: string;
  forkEventId?: string;
  forkSequence?: number;
  forkedAt?: string;
  createdAt: string;
  lastActiveAt: string;
  completedAt?: string;
  archivedAt?: string;
  exitCode?: number;
  error?: SessionRuntimeError;
  revision: number;
}

export interface AppStateV3 {
  workspaces: Workspace[];
  profiles: CliProfile[];
  sessions: Session[];
}

export interface AppStateEnvelopeV3 {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  state: AppStateV3;
}

// ---------------------------------------------------------------------------
// Legacy schema-v2 shapes（仅迁移输入使用；对应磁盘上的 v2 envelope）。
// ---------------------------------------------------------------------------

export type WorkspaceV2 = Omit<Workspace, "kind">;

export type SessionV2 = Omit<Session, "interactionMode" | "chatContext">;

export interface AppStateV2 {
  workspaces: WorkspaceV2[];
  profiles: CliProfile[];
  sessions: SessionV2[];
}

export interface AppStateEnvelopeV2 {
  schemaVersion: 2;
  state: AppStateV2;
}
