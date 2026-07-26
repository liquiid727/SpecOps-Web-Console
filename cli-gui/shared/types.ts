import type {
  AppStateV3,
  CliProfile as CliProfileV3,
  Session as SessionV3,
  SessionRuntimeStatus,
  Workspace as WorkspaceV3,
  WorkspaceV2
} from "./state.js";

export { CURRENT_SCHEMA_VERSION } from "./state.js";
export type {
  AppStateEnvelopeV2,
  AppStateEnvelopeV3,
  AppStateV2,
  AppStateV3,
  CliAdapterId,
  CliProfile as CliProfileV2,
  CliProfile as CliProfileV3,
  Session as SessionV3,
  SessionChatContext,
  SessionInteractionMode,
  SessionLaunchConfig,
  SessionOrganizationStatus,
  SessionRuntimeError,
  SessionRuntimeStatus,
  SessionV2,
  Workspace as WorkspaceV3,
  WorkspaceKind,
  WorkspaceV2
} from "./state.js";
export type * from "./api.js";
export type * from "./capabilities.js";
export type * from "./transcript.js";
export type * from "./websocket.js";

/** @deprecated Use SessionRuntimeStatus. */
export type SessionStatus = SessionRuntimeStatus;

/** @deprecated Use WorkspaceV3 for schema-v3 state. */
export type Workspace = Omit<WorkspaceV2, "lastOpenedAt"> & { lastOpenedAt?: string };

/** @deprecated Use CliProfileV3 for schema-v3 state. */
export type CliProfile = Omit<CliProfileV3, "adapterId" | "adapterVersionRange"> & {
  adapterId?: CliProfileV3["adapterId"];
  adapterVersionRange?: string;
};

/** @deprecated Use SessionV3.runtimeStatus for schema-v3 state. */
export interface Session {
  id: string;
  workspaceId: string;
  profileId: string;
  name: string;
  status?: SessionStatus;
  runtimeStatus?: SessionRuntimeStatus;
  organizationStatus?: import("./state.js").SessionOrganizationStatus;
  pinned?: boolean;
  manualOrder?: number;
  launchConfig?: import("./state.js").SessionLaunchConfig;
  parentSessionId?: string;
  forkEventId?: string;
  forkSequence?: number;
  forkedAt?: string;
  createdAt: string;
  lastActiveAt: string;
  exitCode?: number;
  completedAt?: string;
  archivedAt?: string;
  revision?: number;
  error?: string | import("./state.js").SessionRuntimeError;
}

/** @deprecated Use AppStateV3 for schema-v3 persistence. */
export interface AppState {
  workspaces: Workspace[];
  profiles: CliProfile[];
  sessions: Session[];
}

export interface StateResponse extends Omit<AppStateV3, "sessions"> {
  sessions: SessionWithCompatibilityStatus[];
  readonly: boolean;
  csrfCapability?: string;
  pickerIntentToken?: string;
}

export type SessionWithCompatibilityStatus = SessionV3 & {
  readonly status: SessionRuntimeStatus;
};

export function withCompatibilityStatus(session: SessionV3): SessionWithCompatibilityStatus {
  return { ...session, status: session.runtimeStatus };
}

export function withCompatibilityState(state: AppStateV3): Omit<AppStateV3, "sessions"> & { sessions: SessionWithCompatibilityStatus[] } {
  return { ...state, sessions: state.sessions.map(withCompatibilityStatus) };
}
