export const CURRENT_SCHEMA_VERSION = 2 as const;

export type CliAdapterId = "claude-code" | "codex" | "generic";

export interface Workspace {
  id: string;
  name: string;
  path: string;
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

export interface SessionLaunchConfig {
  permission: string | null;
  mode: string | null;
  model: string | null;
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
  runtimeStatus: SessionRuntimeStatus;
  organizationStatus: SessionOrganizationStatus;
  pinned: boolean;
  manualOrder: number;
  launchConfig: SessionLaunchConfig;
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

export interface AppStateV2 {
  workspaces: Workspace[];
  profiles: CliProfile[];
  sessions: Session[];
}

export interface AppStateEnvelopeV2 {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  state: AppStateV2;
}
