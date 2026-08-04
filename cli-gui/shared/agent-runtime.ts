import type { CliProfileCapabilities } from "./capabilities.js";
import type { BackendSessionRef, CliProfile } from "./state.js";
import type { TranscriptStructuredComponent } from "./transcript.js";
import type { AgentEffect, RoutingFailure, RoutingFailureClass, SideEffectObservation } from "./execution-attempt.js";

export type ApprovalDecision = "allow" | "deny";

export interface AgentInput {
  turnId?: string;
  prompt: string;
  clientMessageId?: string;
  model?: string;
  permission?: string;
  mode?: string;
  /** Server-only provider launch material; never serialized into transcript or API responses. */
  launchArgs?: string[];
  launchEnv?: Record<string, string>;
}

export type AgentTurnFailurePhase = "app-server" | "spawn" | "parse";

export interface AgentTurnError {
  code: string;
  message: string;
  phase?: AgentTurnFailurePhase;
  fallbackAttempted?: boolean;
  fallbackCode?: string;
  failureClass?: RoutingFailureClass;
}

export interface AgentEvent {
  kind:
    | "text_delta"
    | "assistant_message"
    | "progress"
    | "tool"
    | "command"
    | "file_change"
    | "approval_request"
    | "approval_result"
    | "usage"
    | "error"
    | "completed"
    | "cancelled"
    | "diagnostic";
  occurredAt: string;
  text?: string;
  metadata?: Record<string, string | number | boolean>;
  component?: TranscriptStructuredComponent;
  effect?: AgentEffect;
}

export const AGENT_EVENT_KINDS = [
  "text_delta",
  "assistant_message",
  "progress",
  "tool",
  "command",
  "file_change",
  "approval_request",
  "approval_result",
  "usage",
  "error",
  "completed",
  "cancelled",
  "diagnostic"
] as const satisfies readonly AgentEvent["kind"][];

export type AgentCapabilities = CliProfileCapabilities;

export interface AgentBackendConfig {
  profile: CliProfile;
}

export interface OpenBackendSessionInput {
  sessionId: string;
  workspacePath: string;
  config: AgentBackendConfig;
  resume?: BackendSessionRef;
}

export interface AgentTurnResult {
  status: "completed" | "failed" | "cancelled";
  nativeSessionId?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  error?: AgentTurnError;
  /** Collected by the orchestrator from persisted tool/file events. */
  sideEffect?: SideEffectObservation;
}

export interface AgentTurnHandle {
  readonly events: AsyncIterable<AgentEvent>;
  readonly result: Promise<AgentTurnResult>;
  cancel(): Promise<void>;
  approve?(approvalId: string, decision: ApprovalDecision): Promise<void>;
}

export interface BackendSessionHandle {
  readonly ref: BackendSessionRef;
  readonly selectedTransport: import("./capabilities.js").AgentTransportKind;
  runTurn(input: AgentInput): Promise<AgentTurnHandle>;
  close(): Promise<void>;
}

export interface AgentBackend {
  readonly id: string;
  readonly supportedTransports: readonly import("./capabilities.js").AgentTransportKind[];
  probe(config: AgentBackendConfig): Promise<AgentCapabilities>;
  openSession(input: OpenBackendSessionInput): Promise<BackendSessionHandle>;
}
