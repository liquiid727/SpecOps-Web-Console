import { createContext, useContext, type ReactNode } from "react";
import { api, openTerminalSubscription, openTranscriptSubscription } from "../api";
import { getPlatform, WebPlatformAdapter, type PlatformAdapter } from "../lib/platform";

type ApiFacade = typeof api;

export type EnginePort = Pick<ApiFacade,
  "engineReadiness" | "profileCapabilities" | "profileModels" |
  "syncProfileModels" | "syncModels" | "addProfileModel" |
  "removeProfileModel" | "createProfile" | "deleteProfile" | "enhancePrompt"
>;

export type SessionPort = Pick<ApiFacade,
  "state" | "createSession" | "startSession" | "stopSession" |
  "renameSession" | "updateLaunchConfig" | "pinSession" |
  "archiveSession" | "completeSession" | "restoreSession" |
  "forkSession" | "reorderSessions" | "sendMessage" | "cancelTurn" |
  "respondApproval" | "updateActiveModel" | "deleteSession" | "switchView"
>;

export interface EventPort {
  transcript: ApiFacade["transcript"];
  subscribe: typeof openTranscriptSubscription;
}

export interface TerminalPort {
  subscribe: typeof openTerminalSubscription;
}

export type WorkspacePort = Pick<ApiFacade,
  "createWorkspace" | "workspaceFiles" | "filePreview" | "languageSummary" |
  "gitStatus" | "gitDiff" | "pickWorkspace" | "deleteWorkspace" | "skills" |
  "skillContent"
>;

export interface ClientCapabilities {
  sessionStreaming: boolean;
  terminal: boolean;
  nativeFolderPicker: boolean;
  notifications: boolean;
  remoteControl: boolean;
  gitDiff: "none" | "read-only";
}

export interface ClientRuntime {
  readonly kind: "mock" | "local" | "remote";
  capabilities(): Promise<ClientCapabilities>;
  readonly engines: EnginePort;
  readonly sessions: SessionPort;
  readonly events: EventPort;
  readonly terminal: TerminalPort;
  readonly workspace: WorkspacePort;
  readonly platform: PlatformAdapter;
}

export class LocalHttpRuntime implements ClientRuntime {
  readonly kind = "local" as const;
  readonly engines: EnginePort = api;
  readonly sessions: SessionPort = api;
  readonly events: EventPort = { transcript: api.transcript, subscribe: openTranscriptSubscription };
  readonly terminal: TerminalPort = { subscribe: openTerminalSubscription };
  readonly workspace: WorkspacePort = api;
  readonly platform = getPlatform();

  async capabilities(): Promise<ClientCapabilities> {
    return {
      sessionStreaming: typeof WebSocket !== "undefined",
      terminal: typeof WebSocket !== "undefined",
      nativeFolderPicker: this.platform.kind === "tauri",
      notifications: this.platform.kind === "tauri" || typeof Notification !== "undefined",
      remoteControl: false,
      gitDiff: "read-only"
    };
  }
}

export interface RuntimePortSet {
  engines: EnginePort;
  sessions: SessionPort;
  events: EventPort;
  terminal: TerminalPort;
  workspace: WorkspacePort;
  platform?: PlatformAdapter;
}

/**
 * Browser preview runtime. Storybook/tests provide deterministic in-memory
 * ports; no browser network or Tauri global is required.
 */
export class MockClientRuntime implements ClientRuntime {
  readonly kind = "mock" as const;
  readonly engines: EnginePort;
  readonly sessions: SessionPort;
  readonly events: EventPort;
  readonly terminal: TerminalPort;
  readonly workspace: WorkspacePort;
  readonly platform: PlatformAdapter;

  constructor(ports: RuntimePortSet) {
    this.engines = ports.engines;
    this.sessions = ports.sessions;
    this.events = ports.events;
    this.terminal = ports.terminal;
    this.workspace = ports.workspace;
    this.platform = ports.platform ?? new WebPlatformAdapter();
  }

  async capabilities(): Promise<ClientCapabilities> {
    return { sessionStreaming: true, terminal: true, nativeFolderPicker: false, notifications: false, remoteControl: false, gitDiff: "read-only" };
  }
}

/**
 * Remote shell runtime. Control Server adapters supply the same domain ports;
 * feature modules cannot distinguish their transport from local mode.
 */
export class RemoteRuntime implements ClientRuntime {
  readonly kind = "remote" as const;
  readonly engines: EnginePort;
  readonly sessions: SessionPort;
  readonly events: EventPort;
  readonly terminal: TerminalPort;
  readonly workspace: WorkspacePort;
  readonly platform: PlatformAdapter;

  constructor(ports: RuntimePortSet) {
    this.engines = ports.engines;
    this.sessions = ports.sessions;
    this.events = ports.events;
    this.terminal = ports.terminal;
    this.workspace = ports.workspace;
    this.platform = ports.platform ?? getPlatform();
  }

  async capabilities(): Promise<ClientCapabilities> {
    return { sessionStreaming: true, terminal: true, nativeFolderPicker: false, notifications: typeof Notification !== "undefined", remoteControl: true, gitDiff: "read-only" };
  }
}

const defaultRuntime = new LocalHttpRuntime();
const ClientRuntimeContext = createContext<ClientRuntime>(defaultRuntime);

export function ClientRuntimeProvider({ runtime = defaultRuntime, children }: { runtime?: ClientRuntime; children: ReactNode }) {
  return <ClientRuntimeContext.Provider value={runtime}>{children}</ClientRuntimeContext.Provider>;
}

export function useClientRuntime() {
  return useContext(ClientRuntimeContext);
}

/** Compatibility entry for stores that live outside React. */
export function getDefaultClientRuntime(): ClientRuntime {
  return defaultRuntime;
}
