import type {
  AppStateV2,
  CliProfile as CliProfileV2,
  Session as SessionV2,
  SessionRuntimeStatus,
  Workspace as WorkspaceV2
} from "./state.js";

export { CURRENT_SCHEMA_VERSION } from "./state.js";
export type {
  AppStateEnvelopeV2,
  AppStateV2,
  CliAdapterId,
  CliProfile as CliProfileV2,
  Session as SessionV2,
  SessionLaunchConfig,
  SessionOrganizationStatus,
  SessionRuntimeError,
  SessionRuntimeStatus,
  Workspace as WorkspaceV2
} from "./state.js";
export type * from "./api.js";
export type * from "./capabilities.js";
export type * from "./transcript.js";
export type * from "./websocket.js";

/** @deprecated Use SessionRuntimeStatus. */
export type SessionStatus = SessionRuntimeStatus;

/** @deprecated Use WorkspaceV2 for schema-v2 state. */
export type Workspace = Omit<WorkspaceV2, "lastOpenedAt"> & { lastOpenedAt?: string };

/** @deprecated Use CliProfileV2 for schema-v2 state. */
export type CliProfile = Omit<CliProfileV2, "adapterId" | "adapterVersionRange"> & {
  adapterId?: CliProfileV2["adapterId"];
  adapterVersionRange?: string;
};

/** @deprecated Use SessionV2.runtimeStatus for schema-v2 state. */
export interface Session {
  id: string;
  workspaceId: string;
  profileId: string;
  name: string;
  status: SessionStatus;
  createdAt: string;
  lastActiveAt: string;
  exitCode?: number;
  error?: string;
}

/** @deprecated Use AppStateV2 for schema-v2 persistence. */
export interface AppState {
  workspaces: Workspace[];
  profiles: CliProfile[];
  sessions: Session[];
}

export interface StateResponse extends Omit<AppStateV2, "sessions"> {
  sessions: SessionWithCompatibilityStatus[];
  readonly: boolean;
}

export type SessionWithCompatibilityStatus = SessionV2 & {
  readonly status: SessionRuntimeStatus;
};

export function withCompatibilityStatus(session: SessionV2): SessionWithCompatibilityStatus {
  return { ...session, status: session.runtimeStatus };
}

export function withCompatibilityState(state: AppStateV2): Omit<AppStateV2, "sessions"> & { sessions: SessionWithCompatibilityStatus[] } {
  return { ...state, sessions: state.sessions.map(withCompatibilityStatus) };
}
