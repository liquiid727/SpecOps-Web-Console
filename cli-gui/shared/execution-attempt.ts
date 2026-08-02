import type { ResolvedRoute } from "./model-route.js";

export type ExecutionTaskState = "created" | "running" | "awaiting_confirmation" | "completed" | "failed" | "cancelled";
export type ExecutionAttemptState = "created" | "running" | "completed" | "failed" | "cancelled";
export type AttemptTrigger = "primary" | "automatic-fallback" | "confirmed-retry";

export interface InputSnapshotRef {
  transcriptEventId: string;
  sha256: string;
}

export interface DeploymentExecutionSnapshot {
  deploymentId: string;
  deploymentName: string;
  providerId: string;
  providerName: string;
  profileId: string;
  modelId: string;
}

export type RoutingFailureClass =
  | "startup"
  | "connection"
  | "timeout"
  | "rate-limited"
  | "provider-unavailable"
  | "model-temporarily-unavailable"
  | "configuration"
  | "secret-missing"
  | "authentication"
  | "invalid-request"
  | "policy"
  | "approval-denied"
  | "cancelled"
  | "unknown";

export interface RoutingFailure {
  code: string;
  class: RoutingFailureClass;
  message: string;
  phase?: string;
  fallbackEligible?: boolean;
}

export type AgentEffect = "none" | "read" | "write" | "external" | "unknown";

export interface SideEffectObservation {
  state: "clean" | "possible" | "confirmed" | "unknown";
  evidenceEventIds: string[];
}

export interface ExecutionTask {
  id: string;
  sessionId: string;
  turnId: string;
  input: InputSnapshotRef;
  resolvedRoute: ResolvedRoute;
  state: ExecutionTaskState;
  revision?: number;
  selectedAttemptId?: string;
  confirmationToken?: string;
  confirmationInputSha256?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ExecutionAttempt {
  id: string;
  taskId: string;
  ordinal: number;
  trigger: AttemptTrigger;
  deployment: DeploymentExecutionSnapshot;
  state: ExecutionAttemptState;
  revision: number;
  startedAt?: string;
  completedAt?: string;
  failure?: RoutingFailure;
  usage?: { inputTokens?: number; outputTokens?: number };
  latencyMs?: number;
  cost?: number;
  sideEffect: SideEffectObservation;
}

export interface ExecutionSnapshot {
  task: ExecutionTask;
  attempts: ExecutionAttempt[];
}

export type ExecutionRecord =
  | { formatVersion: 1; type: "task-created"; occurredAt: string; task: ExecutionTask }
  | { formatVersion: 1; type: "attempt-created"; occurredAt: string; attempt: ExecutionAttempt }
  | { formatVersion: 1; type: "task-transition"; occurredAt: string; taskId: string; revision: number; patch: Partial<Pick<ExecutionTask, "state" | "selectedAttemptId" | "completedAt" | "confirmationToken" | "confirmationInputSha256">> }
  | { formatVersion: 1; type: "attempt-transition"; occurredAt: string; taskId: string; attemptId: string; revision: number; patch: Partial<Pick<ExecutionAttempt, "state" | "startedAt" | "completedAt" | "failure" | "usage" | "latencyMs" | "cost" | "sideEffect">> };

const taskTransitions: Record<ExecutionTaskState, readonly ExecutionTaskState[]> = {
  created: ["running", "cancelled", "failed"],
  running: ["completed", "failed", "cancelled", "awaiting_confirmation"],
  awaiting_confirmation: ["running", "cancelled", "failed"],
  completed: [],
  failed: [],
  cancelled: []
};

const attemptTransitions: Record<ExecutionAttemptState, readonly ExecutionAttemptState[]> = {
  created: ["running", "cancelled", "failed"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: []
};

export function canTransitionTask(from: ExecutionTaskState, to: ExecutionTaskState) {
  return from === to || taskTransitions[from].includes(to);
}

export function canTransitionAttempt(from: ExecutionAttemptState, to: ExecutionAttemptState) {
  return from === to || attemptTransitions[from].includes(to);
}

export function observeSideEffect(events: readonly { id?: string; effect?: AgentEffect }[], protocolComplete = true): SideEffectObservation {
  const evidenceEventIds = events.flatMap((event) => event.id ? [event.id] : []);
  if (!protocolComplete) return { state: "unknown", evidenceEventIds };
  if (events.some((event) => event.effect === "external" || event.effect === "write")) return { state: "confirmed", evidenceEventIds };
  if (events.some((event) => event.effect === "unknown" || event.effect === undefined)) return { state: "possible", evidenceEventIds };
  return { state: "clean", evidenceEventIds };
}

export function failureAllowsAutomaticFallback(failure: RoutingFailure | undefined) {
  return Boolean(failure && ["startup", "connection", "timeout", "rate-limited", "provider-unavailable", "model-temporarily-unavailable"].includes(failure.class));
}
