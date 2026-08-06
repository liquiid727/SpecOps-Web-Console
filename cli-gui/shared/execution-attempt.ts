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

/** Keep backend diagnostics useful without persisting launch secrets or prompts. */
export function redactSensitiveText(value: string): string {
  const sensitiveKey = "credentialRef|credential|secret|token|key|env(?:ironment)?|prompt|password|api[_-]?key|auth";
  return value
    // Headers and JSON-like header fields: keep the field name and scheme, never the credential.
    .replace(/((?:["']?authorization["']?)\s*[:=]\s*["']?Bearer\s+)([^"'\s,}]+)(["']?)/gi, (_match, prefix: string, _secret: string, suffix: string) => `${prefix}[REDACTED]${suffix}`)
    // Quoted JSON/object values, including single-quoted diagnostic fragments.
    .replace(new RegExp(`(["'](?:${sensitiveKey})["']\\s*:\\s*["'])([^"']*)(["'])`, "gi"), (_match, prefix: string, _secret: string, suffix: string) => `${prefix}[REDACTED]${suffix}`)
    // Unquoted key=value / key: value diagnostics. Ordinary words such as "token expired" do not match.
    .replace(new RegExp(`\\b(${sensitiveKey})\\s*([:=])\\s*(?:["']?)([^\\s,;}]*)`, "gi"), (_match, key: string, separator: string) => `${key}${separator}[REDACTED]`)
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+/gi, "Bearer [REDACTED]");
}

const sensitiveFieldPattern = /(?:secret|token|key|prompt|env(?:ironment)?|credential|auth|password|api[_-]?key)/i;

export function redactSensitiveValue(value: unknown, fieldName?: string, depth = 0): unknown {
  if (typeof value === "string") return fieldName && sensitiveFieldPattern.test(fieldName) ? "[REDACTED]" : redactSensitiveText(value);
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 6) return undefined;
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => redactSensitiveValue(item, undefined, depth + 1)).filter((item) => item !== undefined);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, item]) => [key, redactSensitiveValue(item, key, depth + 1)]).filter((entry): entry is [string, unknown] => entry[1] !== undefined));
  return undefined;
}

export interface ExecutionTask {
  id: string;
  sessionId: string;
  turnId: string;
  input: InputSnapshotRef;
  resolvedRoute: ResolvedRoute;
  state: ExecutionTaskState;
  revision: number;
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
  return from !== to && taskTransitions[from].includes(to);
}

export function canTransitionAttempt(from: ExecutionAttemptState, to: ExecutionAttemptState) {
  return from !== to && attemptTransitions[from].includes(to);
}

export function observeSideEffect(events: readonly { id?: string; effect?: AgentEffect }[], protocolComplete = true): SideEffectObservation {
  const evidenceEventIds = events.flatMap((event) => event.id ? [event.id] : []);
  if (!protocolComplete) return { state: "unknown", evidenceEventIds };
  if (events.length === 0) return { state: "unknown", evidenceEventIds };
  if (events.some((event) => event.effect === "external" || event.effect === "write")) return { state: "confirmed", evidenceEventIds };
  if (events.some((event) => event.effect === "unknown" || event.effect === undefined)) return { state: "possible", evidenceEventIds };
  return { state: events.every((event) => event.effect === "none" || event.effect === "read") ? "clean" : "unknown", evidenceEventIds };
}

export function failureAllowsAutomaticFallback(failure: RoutingFailure | undefined) {
  return Boolean(failure && ["startup", "connection", "timeout", "rate-limited", "provider-unavailable", "model-temporarily-unavailable"].includes(failure.class));
}
