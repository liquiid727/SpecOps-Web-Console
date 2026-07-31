import type { AgentInput, ApprovalDecision } from "./agent-runtime.js";

export interface RemoteEnvelope<T> {
  protocolVersion: 1;
  deviceId: string;
  requestId: string;
  sessionId?: string;
  sequence?: number;
  timestamp: string;
  payload: T;
}

export type RemoteCommand =
  | { type: "engine.readiness" }
  | { type: "session.list" }
  | { type: "session.create"; workspaceId: string; profileId: string; name: string }
  | { type: "session.turn"; sessionId: string; input: AgentInput }
  | { type: "session.cancel"; sessionId: string; turnId: string }
  | { type: "approval.decide"; sessionId: string; approvalId: string; decision: ApprovalDecision }
  | { type: "transcript.read"; sessionId: string; afterSequence: number }
  | { type: "workspace.diff"; workspaceId: string; scope: "staged" | "unstaged" };

export type RemoteEvent =
  | { type: "runtime.event"; sessionId: string; sequence: number; event: import("./transcript.js").TranscriptEvent }
  | { type: "device.status"; status: "online" | "offline" | "reconnecting" }
  | { type: "command.result"; requestId: string; result: unknown };
