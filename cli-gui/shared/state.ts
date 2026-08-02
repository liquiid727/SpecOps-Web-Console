import type { ModelProviderConfig } from "./model-provider.js";
import type { ModelDeploymentConfig } from "./model-deployment.js";
import type { PriorityModelRoute, WorkspaceModelRouteBinding } from "./model-route.js";

export const CURRENT_SCHEMA_VERSION = 8 as const;

/** kimi / glm 为 Claude Code 兼容 CLI（协议同 claude-code，仅命令与版本检测不同）。 */
export type CliAdapterId = "claude-code" | "codex" | "kimi" | "glm" | "generic";

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
  /** 用户导入的自定义模型 id（Settings > Models 管理；可选，缺省等价 []） */
  customModels?: string[];
  /** 最近一次模型同步发现的模型 id（缓存展示用；可选） */
  syncedModels?: string[];
  createdAt: string;
}

export type SessionRuntimeStatus = "starting" | "running" | "stopped" | "error";
export type SessionOrganizationStatus = "active" | "completed" | "archived";

/** 交互模式，创建时确定，不可变更（Fork 时继承，可改）。 */
export type SessionInteractionMode = "chat" | "terminal";

/** 双模式渲染（dual-mode 设计 §5/§9）：当前可见视图，切换不改变进程生命周期。 */
export type SessionActiveView = "terminal" | "gui";

/** 单一输入所有权（dual-mode 设计 §10）：任一时刻只有一个输入源可写入会话。 */
export type SessionInputOwner = "terminal" | "gui" | "none";

export interface SessionLaunchConfig {
  permission: string | null;
  mode: string | null;
  model: string | null;
  /** B 段：启动前受控 checkout 的分支（可选，缺失不回填）。 */
  branch?: string | null;
}

/** terminal 模式的原生恢复上下文（chat 模式恒为 undefined；与 chatContext 分离以保持 I-3）。 */
export interface SessionTerminalContext {
  /** CLI 本地会话目录归因捕获的 resume 凭据：codex rollout session id / claude projects 文件名。 */
  resumeToken?: string;
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

export interface BackendSessionRef {
  backendId: string;
  nativeSessionId?: string;
  transport: "native-sdk" | "acp" | "json-stream" | "pty";
  resumeData?: Record<string, unknown>;
  migrationMetadata?: {
    sourceSchemaVersion: number;
    unknownFields?: Record<string, unknown>;
  };
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
  /** 可选追加字段（schema 仍为 v4）：load 时按 interactionMode 归一默认值（chat → gui，terminal → terminal）。 */
  activeView?: SessionActiveView;
  /** 与 activeView 同步的输入所有者；只影响输入路由，不影响进程。 */
  inputOwner?: SessionInputOwner;
  runtimeStatus: SessionRuntimeStatus;
  organizationStatus: SessionOrganizationStatus;
  pinned: boolean;
  manualOrder: number;
  launchConfig: SessionLaunchConfig;
  /** Optional provider connection frozen at session creation. */
  providerId?: string;
  /** Optional route binding; absent preserves legacy profile/model behavior. */
  modelRouteId?: string;
  chatContext?: SessionChatContext;
  terminalContext?: SessionTerminalContext;
  /** MVP02 Agent Engine identity; Profile remains advanced launch configuration. */
  backendId?: string;
  /** Vendor/native identity used for structured resume across Runtime restarts. */
  backendSessionRef?: BackendSessionRef;
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
  /** Optional in the TypeScript compatibility shape; normalized repositories always return arrays. */
  providers?: ModelProviderConfig[];
  modelDeployments?: ModelDeploymentConfig[];
  modelRoutes?: PriorityModelRoute[];
  globalModelRouteId?: string;
  workspaceModelRouteBindings?: WorkspaceModelRouteBinding[];
}

export interface AppStateEnvelopeV3 {
  schemaVersion: 3;
  state: AppStateV3;
}

export type AppStateV4 = AppStateV3;

export interface AppStateEnvelopeV4 {
  schemaVersion: 4;
  state: AppStateV4;
}

export interface AppStateEnvelopeV5 { schemaVersion: 5; state: AppStateV3; }
export interface AppStateEnvelopeV6 { schemaVersion: 6; state: AppStateV3; }
export interface AppStateEnvelopeV7 { schemaVersion: 7; state: AppStateV3; }
export interface AppStateEnvelopeV8 { schemaVersion: 8; state: AppStateV3; }

// ---------------------------------------------------------------------------
// Legacy schema-v2 shapes（仅迁移输入使用；对应磁盘上的 v2 envelope）。
// ---------------------------------------------------------------------------

export type WorkspaceV2 = Omit<Workspace, "kind">;

export type SessionV2 = Omit<Session, "interactionMode" | "chatContext" | "terminalContext">;

export interface AppStateV2 {
  workspaces: WorkspaceV2[];
  profiles: CliProfile[];
  sessions: SessionV2[];
}

export interface AppStateEnvelopeV2 {
  schemaVersion: 2;
  state: AppStateV2;
}
