export type SessionStatus = "starting" | "running" | "stopped" | "error";

export interface Workspace {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

export interface CliProfile {
  id: string;
  name: string;
  command: string;
  args: string[];
  createdAt: string;
}

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

export interface AppState {
  workspaces: Workspace[];
  profiles: CliProfile[];
  sessions: Session[];
}

export interface StateResponse extends AppState {
  readonly: boolean;
}
