import type { CliProfileCapabilities, EngineReadiness, ProfileModelEntry } from "./capabilities.js";
import type { Session, SessionActiveView, SessionLaunchConfig, SessionOrganizationStatus, SessionRuntimeStatus, Workspace } from "./state.js";
import type { TranscriptEvent } from "./transcript.js";

export type ApiErrorCode =
  | "INVALID_JSON"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "VALIDATION_FAILED"
  | "ORIGIN_NOT_ALLOWED"
  | "READONLY_MODE"
  | "WORKSPACE_NOT_FOUND"
  | "WORKSPACE_PATH_INVALID"
  | "WORKSPACE_DUPLICATE"
  | "WORKSPACE_IN_USE"
  | "WORKSPACE_PATH_ESCAPE"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_IN_USE"
  | "CLI_OPTION_UNSUPPORTED"
  | "SESSION_NOT_FOUND"
  | "SESSION_REVISION_CONFLICT"
  | "SESSION_NOT_ACTIVE"
  | "SESSION_RUNNING_CONFIRMATION_REQUIRED"
  | "SESSION_ALREADY_RUNNING"
  | "SESSION_START_FAILED"
  | "SESSION_HAS_FORKS"
  | "MESSAGE_DUPLICATE"
  | "MESSAGE_DELIVERY_FAILED"
  | "TURN_IN_PROGRESS"
  | "TURN_NOT_ACTIVE"
  | "SESSION_CONCURRENCY_LIMIT"
  | "APPROVAL_NOT_PENDING"
  | "INTERACTION_MODE_MISMATCH"
  | "TRANSCRIPT_CORRUPT"
  | "TRANSCRIPT_WRITE_FAILED"
  | "PICKER_UNAVAILABLE"
  | "PICKER_BUSY"
  | "PICKER_TIMEOUT"
  | "PICKER_INTENT_INVALID"
  | "FILE_NOT_FOUND"
  | "FILE_BINARY"
  | "GIT_UNAVAILABLE"
  | "NOT_A_GIT_REPOSITORY"
  | "GIT_TIMEOUT"
  | "ENHANCE_UNAVAILABLE"
  | "ENHANCE_FAILED"
  | "ENHANCE_TIMEOUT"
  | "VIEW_UNSUPPORTED"
  | "ROUTE_NOT_FOUND"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface CreateSessionRequest {
  name: string;
  workspaceId: string;
  profileId: string;
  launchConfig?: Partial<SessionLaunchConfig>;
  start: boolean;
  confirmed: boolean;
  terminal?: { cols: number; rows: number };
}

export interface CreateSessionResponse {
  session: Session;
  capabilities: CliProfileCapabilities;
  startupError?: ApiError;
}

export interface EngineReadinessResponse {
  engines: EngineReadiness[];
  probedAt: string;
}

export interface PatchSessionRequest {
  expectedRevision: number;
  name?: string;
  launchConfig?: Partial<SessionLaunchConfig>;
}

export interface RuntimeAffectingActionRequest {
  expectedRevision: number;
  stopRunning?: boolean;
}

export interface PinSessionRequest {
  expectedRevision: number;
  pinned: boolean;
}

export interface ReorderSessionsRequest {
  organizationStatus: SessionOrganizationStatus;
  pinned: boolean;
  orderedSessionIds: string[];
  expectedRevisions: Record<string, number>;
}

export interface ForkSessionRequest {
  name?: string;
  expectedRevision: number;
}

export interface ForkSessionResponse {
  session: Session;
  parentBoundary: { eventId?: string; sequence: number };
}

export interface SendMessageRequest {
  clientMessageId: string;
  content: string;
  startIfStopped: boolean;
  confirmedStart: boolean;
}

export interface SendMessageResponse {
  event: TranscriptEvent;
  runtimeStatus: SessionRuntimeStatus;
  duplicate: boolean;
  /** chat 分流响应携带本轮 turnId（api-spec §2.2）。 */
  turnId?: string;
}

export interface PickWorkspaceRequest {
  intentToken: string;
}

export type PickWorkspaceResponse = { cancelled: true; pickerIntentToken?: string } | { cancelled: false; workspace: Workspace; duplicate?: boolean; pickerIntentToken?: string };

/** Skills 只读管理（console-gaps SPEC §7）：system = ~/.claude|~/.codex，workspace = <workspace>/.claude|.codex */
export type SkillScope = "system" | "workspace";
export type SkillSource = "claude" | "codex";

export interface SkillSummary {
  /** `${source}:${目录名}`，content 接口以此命中服务端重扫结果（无客户端路径输入） */
  id: string;
  name: string;
  description: string;
  source: SkillSource;
  scope: SkillScope;
  /** 展示用缩略路径（如 `~/.claude/skills/foo`） */
  path: string;
}

export interface SkillListResponse {
  skills: SkillSummary[];
}

export interface SkillContentResponse {
  content: string;
  /** 正文超 256KiB 时截断 */
  truncated: boolean;
}

export type PromptEnhanceAction = "polish" | "compress";

/** POST /api/prompt/enhance 请求体（project-quest SPEC §5.7）：content 上限 32KiB */
export interface PromptEnhanceRequest {
  profileId: string;
  action: PromptEnhanceAction;
  content: string;
  /** 润色指令模板语言（缺省 en） */
  locale?: "en" | "zh";
}

export interface PromptEnhanceResponse {
  content: string;
  /** 输出超 64KiB 时截断 */
  truncated: boolean;
}

/** POST /api/profiles/:id/sync-models 响应（issue-053）：CLI 命令发现的模型写入 synced 层后回报合并列表 */
export interface SyncModelsResponse {
  models: ProfileModelEntry[];
  synced: string[];
}

// ---------------------------------------------------------------------------
// 双模式渲染：视图切换 API（dual-mode 设计 §9.1 / §10.1）
// ---------------------------------------------------------------------------

/** POST /api/sessions/:id/view 请求体 */
export interface SwitchViewRequest {
  view: SessionActiveView;
  expectedRevision: number;
}

/** POST /api/sessions/:id/view 成功响应 */
export interface SwitchViewResponse {
  session: Session;
}
