import type { CliProfileCapabilities } from "./capabilities.js";
import type { Session, SessionLaunchConfig, SessionOrganizationStatus, SessionRuntimeStatus, Workspace } from "./state.js";
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
}

export interface PickWorkspaceRequest {
  intentToken: string;
}

export type PickWorkspaceResponse = { cancelled: true; pickerIntentToken?: string } | { cancelled: false; workspace: Workspace; duplicate?: boolean; pickerIntentToken?: string };
