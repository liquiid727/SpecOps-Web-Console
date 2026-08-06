import fs from "node:fs/promises";
import path from "node:path";
import { canTransitionAttempt, canTransitionTask, type ExecutionAttemptState, type ExecutionRecord, type ExecutionSnapshot, type ExecutionTaskState, type RoutingFailure } from "../shared/execution-attempt.js";
import type { Clock, ExecutionRepository } from "./ports.js";

export class ExecutionRepositoryError extends Error {
  constructor(readonly code: "EXECUTION_HISTORY_CORRUPT" | "EXECUTION_NOT_FOUND" | "EXECUTION_REVISION_CONFLICT" | "EXECUTION_INVALID_TRANSITION" | "READONLY_MODE", message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ExecutionRepositoryError";
  }
}

const fileQueues = new Map<string, Promise<void>>();
const sessionQueues = new Map<string, Promise<void>>();
const taskStates = new Set<ExecutionTaskState>(["created", "running", "awaiting_confirmation", "completed", "failed", "cancelled"]);
const attemptStates = new Set<ExecutionAttemptState>(["created", "running", "completed", "failed", "cancelled"]);
const attemptTriggers = new Set(["primary", "automatic-fallback", "confirmed-retry"]);
const taskFields = new Set(["id", "sessionId", "turnId", "input", "resolvedRoute", "state", "revision", "selectedAttemptId", "confirmationToken", "confirmationInputSha256", "createdAt", "completedAt"]);
const attemptFields = new Set(["id", "taskId", "ordinal", "trigger", "deployment", "state", "revision", "startedAt", "completedAt", "failure", "usage", "latencyMs", "cost", "sideEffect"]);
const deploymentFields = new Set(["deploymentId", "deploymentName", "providerId", "providerName", "profileId", "modelId"]);
const sideEffectFields = new Set(["state", "evidenceEventIds"]);
const routeFields = new Set(["kind", "routeId", "resolvedAt", "sourceTrace", "candidates", "executableCandidates", "selectedDeploymentId", "fixedDeploymentId", "canSend", "legacyResolution", "errorCode"]);
const routeCandidateFields = new Set(["deploymentId", "position", "eligible", "exclusionCodes"]);
const routeTraceFields = new Set(["field", "source", "value"]);
const legacyResolutionFields = new Set(["kind", "profileId", "modelId", "source"]);
const routeKinds = new Set(["route", "legacy-profile-model"]);
const routeSources = new Set(["system", "global", "project", "session", "run"]);
const routeExclusionCodes = new Set(["route-disabled", "deployment-missing", "deployment-disabled", "deployment-archived", "provider-disabled", "credential-missing", "engine-incompatible", "model-unverified"]);
const routeErrorCodes = new Set(["ROUTE_NO_CANDIDATE", "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE", "ROUTE_UNSUPPORTED_ENGINE"]);
const failureFields = new Set(["code", "class", "message", "phase", "fallbackEligible"]);
const failureClasses = new Set(["startup", "connection", "timeout", "rate-limited", "provider-unavailable", "model-temporarily-unavailable", "configuration", "secret-missing", "authentication", "invalid-request", "policy", "approval-denied", "cancelled", "unknown"]);
const taskPatchFields = new Set(["state", "selectedAttemptId", "completedAt", "confirmationToken", "confirmationInputSha256"]);
const attemptPatchFields = new Set(["state", "startedAt", "completedAt", "failure", "usage", "latencyMs", "cost", "sideEffect"]);

export interface JsonExecutionRepositoryOptions {
  dataDirectory: string;
  clock: Clock;
  readonly?: boolean;
}

export function createJsonExecutionRepository({ dataDirectory, clock, readonly = false }: JsonExecutionRepositoryOptions): ExecutionRepository {
  const root = path.resolve(dataDirectory);
  const executionDirectory = path.join(root, "executions");

  const fileFor = (sessionId: string) => path.join(executionDirectory, `${encodeURIComponent(sessionId)}.jsonl`);
  const ensureWritable = () => {
    if (readonly) throw new ExecutionRepositoryError("READONLY_MODE", "Readonly mode disables execution history writes.");
  };
  const corrupt = (message: string, cause?: unknown): never => {
    throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", message, cause === undefined ? undefined : { cause });
  };
  const object = (value: unknown, label: string): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) corrupt(`${label} must be an object.`);
    return value as Record<string, unknown>;
  };
  const nonEmpty = (value: unknown, label: string): string => {
    if (typeof value !== "string" || value.trim() === "") corrupt(`${label} must be a non-empty string.`);
    return value as string;
  };
  const integerAtLeast = (value: unknown, minimum: number, label: string): number => {
    if (!Number.isInteger(value) || (value as number) < minimum) corrupt(`${label} must be an integer >= ${minimum}.`);
    return value as number;
  };
  const exactKeys = (value: Record<string, unknown>, allowed: ReadonlySet<string>, label: string, required: readonly string[] = []) => {
    for (const key of Object.keys(value)) if (!allowed.has(key)) corrupt(`${label} contains unsupported field ${key}.`);
    for (const key of required) if (!(key in value)) corrupt(`${label} is missing ${key}.`);
  };
  const validateInput = (value: unknown) => {
    const input = object(value, "Execution input");
    exactKeys(input, new Set(["transcriptEventId", "sha256"]), "Execution input", ["transcriptEventId", "sha256"]);
    nonEmpty(input.transcriptEventId, "Execution input transcriptEventId");
    if (typeof input.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(input.sha256)) corrupt("Execution input sha256 must be a 64-character hexadecimal digest.");
  };
  const validateRouteCandidate = (value: unknown) => {
    const candidate = object(value, "Resolved route candidate");
    exactKeys(candidate, routeCandidateFields, "Resolved route candidate", ["deploymentId", "position", "eligible", "exclusionCodes"]);
    nonEmpty(candidate.deploymentId, "Resolved route candidate deploymentId");
    integerAtLeast(candidate.position, 1, "Resolved route candidate position");
    if (typeof candidate.eligible !== "boolean") corrupt("Resolved route candidate eligible must be boolean.");
    if (!Array.isArray(candidate.exclusionCodes) || candidate.exclusionCodes.some((code) => typeof code !== "string" || !routeExclusionCodes.has(code))) corrupt("Resolved route candidate exclusionCodes are invalid.");
  };
  const validateRouteTrace = (value: unknown) => {
    const trace = object(value, "Resolved route sourceTrace");
    exactKeys(trace, routeTraceFields, "Resolved route sourceTrace", ["field", "source"]);
    nonEmpty(trace.field, "Resolved route sourceTrace field");
    if (!routeSources.has(trace.source as string)) corrupt("Resolved route sourceTrace source is invalid.");
    if (trace.value !== undefined && trace.value !== null) nonEmpty(trace.value, "Resolved route sourceTrace value");
    if (trace.value === null) corrupt("Resolved route sourceTrace value must not be null.");
  };
  const validateLegacyResolution = (value: unknown) => {
    const legacy = object(value, "Resolved route legacyResolution");
    exactKeys(legacy, legacyResolutionFields, "Resolved route legacyResolution", ["kind", "profileId", "modelId", "source"]);
    if (legacy.kind !== "legacy-profile-model") corrupt("Resolved route legacyResolution kind is invalid.");
    nonEmpty(legacy.profileId, "Resolved route legacyResolution profileId");
    if (legacy.modelId !== null && legacy.modelId !== undefined) nonEmpty(legacy.modelId, "Resolved route legacyResolution modelId");
    if (!(new Set(["launch-config", "active-model", "profile-default"]).has(legacy.source as string))) corrupt("Resolved route legacyResolution source is invalid.");
  };
  const validateResolvedRoute = (value: unknown) => {
    const route = object(value, "Resolved route");
    exactKeys(route, routeFields, "Resolved route", ["kind", "resolvedAt", "sourceTrace", "candidates", "executableCandidates", "canSend"]);
    if (!routeKinds.has(route.kind as string)) corrupt("Resolved route kind is invalid.");
    nonEmpty(route.resolvedAt, "Resolved route resolvedAt");
    const sourceTrace = route.sourceTrace;
    if (!Array.isArray(sourceTrace)) corrupt("Resolved route sourceTrace must be an array.");
    (sourceTrace as unknown[]).forEach(validateRouteTrace);
    const candidates = route.candidates;
    if (!Array.isArray(candidates)) corrupt("Resolved route candidates must be an array.");
    (candidates as unknown[]).forEach(validateRouteCandidate);
    const executableCandidates = route.executableCandidates;
    if (!Array.isArray(executableCandidates)) corrupt("Resolved route executableCandidates must be an array.");
    (executableCandidates as unknown[]).forEach(validateRouteCandidate);
    if (typeof route.canSend !== "boolean") corrupt("Resolved route canSend must be boolean.");
    for (const key of ["routeId", "selectedDeploymentId", "fixedDeploymentId"]) if (route[key] !== undefined && route[key] !== null) nonEmpty(route[key], `Resolved route ${key}`);
    for (const key of ["routeId", "selectedDeploymentId", "fixedDeploymentId"]) if (route[key] === null) corrupt(`Resolved route ${key} must not be null.`);
    if (route.legacyResolution !== undefined) validateLegacyResolution(route.legacyResolution);
    if (route.errorCode !== undefined && !routeErrorCodes.has(route.errorCode as string)) corrupt("Resolved route errorCode is invalid.");
  };
  const validateFailure = (value: unknown) => {
    const failure = object(value, "Routing failure");
    exactKeys(failure, failureFields, "Routing failure", ["code", "class", "message"]);
    nonEmpty(failure.code, "Routing failure code");
    if (!failureClasses.has(failure.class as string)) corrupt("Routing failure class is invalid.");
    nonEmpty(failure.message, "Routing failure message");
    if (failure.phase !== undefined && failure.phase !== null) nonEmpty(failure.phase, "Routing failure phase");
    if (failure.phase === null) corrupt("Routing failure phase must not be null.");
    if (failure.fallbackEligible !== undefined && typeof failure.fallbackEligible !== "boolean") corrupt("Routing failure fallbackEligible must be boolean.");
  };
  const validateDeployment = (value: unknown) => {
    const deployment = object(value, "Attempt deployment");
    exactKeys(deployment, deploymentFields, "Attempt deployment", [...deploymentFields]);
    for (const key of ["deploymentId", "deploymentName", "providerId", "providerName", "profileId", "modelId"]) nonEmpty(deployment[key], `Attempt deployment ${key}`);
  };
  const validateSideEffect = (value: unknown) => {
    const sideEffect = object(value, "Attempt sideEffect");
    exactKeys(sideEffect, sideEffectFields, "Attempt sideEffect", ["state", "evidenceEventIds"]);
    if (!(new Set(["clean", "possible", "confirmed", "unknown"]).has(sideEffect.state as string))) corrupt("Attempt sideEffect state is invalid.");
    if (!Array.isArray(sideEffect.evidenceEventIds) || sideEffect.evidenceEventIds.some((id) => typeof id !== "string" || id.trim() === "")) corrupt("Attempt sideEffect evidenceEventIds is invalid.");
  };
  const validateTask = (value: unknown) => {
    const task = object(value, "Task");
    exactKeys(task, taskFields, "Task", ["id", "sessionId", "turnId", "input", "resolvedRoute", "state", "revision", "createdAt"]);
    nonEmpty(task.id, "Task id");
    nonEmpty(task.sessionId, "Task sessionId");
    nonEmpty(task.turnId, "Task turnId");
    validateInput(task.input);
    validateResolvedRoute(task.resolvedRoute);
    if (!taskStates.has(task.state as ExecutionTaskState)) corrupt("Task state is invalid.");
    if (task.revision !== 1) corrupt("Task initial revision must be one.");
    nonEmpty(task.createdAt, "Task createdAt");
  };
  const validateAttempt = (value: unknown) => {
    const attempt = object(value, "Attempt");
    exactKeys(attempt, attemptFields, "Attempt", ["id", "taskId", "ordinal", "trigger", "deployment", "state", "revision", "sideEffect"]);
    nonEmpty(attempt.id, "Attempt id");
    nonEmpty(attempt.taskId, "Attempt taskId");
    integerAtLeast(attempt.ordinal, 1, "Attempt ordinal");
    if (!attemptTriggers.has(attempt.trigger as string)) corrupt("Attempt trigger is invalid.");
    validateDeployment(attempt.deployment);
    if (!attemptStates.has(attempt.state as ExecutionAttemptState)) corrupt("Attempt state is invalid.");
    if (attempt.revision !== 1) corrupt("Attempt initial revision must be one.");
    validateSideEffect(attempt.sideEffect);
    if (attempt.failure !== undefined) validateFailure(attempt.failure);
  };
  const validatePatch = (value: unknown, allowed: ReadonlySet<string>, stateSet: ReadonlySet<string>, label: string) => {
    const patch = object(value, label);
    exactKeys(patch, allowed, label, ["state"]);
    if (!stateSet.has(patch.state as string)) corrupt(`${label} state is invalid.`);
    for (const [key, field] of Object.entries(patch)) {
      if (field === undefined) continue;
      if (field === null) corrupt(`${label} ${key} must not be null.`);
      if (["selectedAttemptId", "completedAt", "confirmationToken", "confirmationInputSha256", "startedAt"].includes(key)) nonEmpty(field, `${label} ${key}`);
      if (key === "failure") validateFailure(field);
      if (key === "usage") object(field, `${label} usage`);
      if (["latencyMs", "cost"].includes(key) && typeof field !== "number") corrupt(`${label} ${key} must be numeric.`);
      if (key === "sideEffect") validateSideEffect(field);
    }
  };
  const validateRecord = (value: unknown): ExecutionRecord => {
    try {
      const record = object(value, "Execution record");
      if (record.formatVersion !== 1) corrupt("Execution record formatVersion is invalid.");
      nonEmpty(record.occurredAt, "Execution record occurredAt");
      switch (record.type) {
        case "task-created": {
          exactKeys(record, new Set(["formatVersion", "type", "occurredAt", "task"]), "Task-created record", ["formatVersion", "type", "occurredAt", "task"]);
          validateTask(record.task);
          return record as unknown as ExecutionRecord;
        }
        case "attempt-created": {
          exactKeys(record, new Set(["formatVersion", "type", "occurredAt", "attempt"]), "Attempt-created record", ["formatVersion", "type", "occurredAt", "attempt"]);
          validateAttempt(record.attempt);
          return record as unknown as ExecutionRecord;
        }
        case "task-transition": {
          exactKeys(record, new Set(["formatVersion", "type", "occurredAt", "taskId", "revision", "patch"]), "Task-transition record", ["formatVersion", "type", "occurredAt", "taskId", "revision", "patch"]);
          nonEmpty(record.taskId, "Task transition taskId");
          integerAtLeast(record.revision, 2, "Task transition revision");
          validatePatch(record.patch, taskPatchFields, taskStates, "Task transition patch");
          return record as unknown as ExecutionRecord;
        }
        case "attempt-transition": {
          exactKeys(record, new Set(["formatVersion", "type", "occurredAt", "taskId", "attemptId", "revision", "patch"]), "Attempt-transition record", ["formatVersion", "type", "occurredAt", "taskId", "attemptId", "revision", "patch"]);
          nonEmpty(record.taskId, "Attempt transition taskId");
          nonEmpty(record.attemptId, "Attempt transition attemptId");
          integerAtLeast(record.revision, 2, "Attempt transition revision");
          validatePatch(record.patch, attemptPatchFields, attemptStates, "Attempt transition patch");
          return record as unknown as ExecutionRecord;
        }
        default: return corrupt(`Unknown execution record type ${String(record.type)}.`);
      }
    } catch (error) {
      if (error instanceof ExecutionRepositoryError) throw error;
      return corrupt("Execution record structure is invalid.", error);
    }
  };
  const redactFailureMessage = (message: string) => message
    .replace(/(["']?(?:authorization|auth|credentialRef|secret|env|prompt|token|api[_-]?key|key)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^,;}\]]+)/gi, "$1<redacted>")
    .replace(/\bBearer\s+[^,;}\]]+/gi, "Bearer <redacted>");
  const sanitizeFailure = (failure: RoutingFailure): RoutingFailure => ({ ...failure, message: redactFailureMessage(failure.message) });
  const sanitizeRecord = (record: ExecutionRecord): ExecutionRecord => {
    const safe = structuredClone(record);
    if (safe.type === "attempt-created" && safe.attempt.failure) safe.attempt.failure = sanitizeFailure(safe.attempt.failure);
    if (safe.type === "attempt-transition" && safe.patch.failure) safe.patch.failure = sanitizeFailure(safe.patch.failure);
    return safe;
  };
  const appendRecord = async (sessionId: string, record: ExecutionRecord) => {
    ensureWritable();
    const target = fileFor(sessionId);
    const previous = fileQueues.get(target) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
        await fs.mkdir(executionDirectory, { recursive: true });
        await fs.appendFile(target, `${JSON.stringify(sanitizeRecord(validateRecord(record)))}\n`, "utf8");
    });
    fileQueues.set(target, next);
    try { await next; } finally { if (fileQueues.get(target) === next) fileQueues.delete(target); }
  };
  const withSessionQueue = async <T>(sessionId: string, operation: () => Promise<T>) => {
    const key = fileFor(sessionId);
    const previous = sessionQueues.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    const queued = next.then(() => undefined, () => undefined);
    sessionQueues.set(key, queued);
    try { return await next; } finally { if (sessionQueues.get(key) === queued) sessionQueues.delete(key); }
  };

  async function readRecords(sessionId: string): Promise<ExecutionRecord[]> {
    const target = fileFor(sessionId);
    const source = await fs.readFile(target, "utf8").catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
      throw error;
    });
    if (!source) return [];
    const lines = source.split("\n");
    const incompleteTail = source.endsWith("\n") ? undefined : lines.pop();
    const records: ExecutionRecord[] = [];
    for (const [index, line] of lines.entries()) {
      if (!line.trim()) continue;
      try {
        records.push(validateRecord(JSON.parse(line)));
      } catch (error) {
        if (error instanceof ExecutionRepositoryError) throw error;
        throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Execution history is corrupt at record ${index + 1}.`, { cause: error });
      }
    }
    // A valid JSONL record is complete even when the writer crashed before
    // appending its final newline. Only an actually truncated JSON tail is
    // ignored; a syntactically complete but schema-invalid record remains a
    // corruption error.
    if (incompleteTail?.trim()) {
      try {
        records.push(validateRecord(JSON.parse(incompleteTail)));
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }
    return records;
  }

  function fold(records: readonly ExecutionRecord[]): ExecutionSnapshot[] {
    const snapshots = new Map<string, ExecutionSnapshot>();
    for (const record of records) {
      if (record.type === "task-created") {
        if (snapshots.has(record.task.id)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Task ${record.task.id} was created twice.`);
        snapshots.set(record.task.id, { task: structuredClone(record.task), attempts: [] });
      } else if (record.type === "attempt-created") {
        const snapshot = snapshots.get(record.attempt.taskId);
        if (!snapshot || snapshot.attempts.some((attempt) => attempt.id === record.attempt.id)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Attempt ${record.attempt.id} has no unique task.`);
        snapshot.attempts.push(structuredClone(record.attempt));
        snapshot.attempts.sort((left, right) => left.ordinal - right.ordinal);
      } else if (record.type === "task-transition") {
        const snapshot = snapshots.get(record.taskId);
        if (!snapshot) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Task ${record.taskId} transition has no task.`);
        if (snapshot.task.revision !== record.revision - 1) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Task ${record.taskId} revision is not append-only.`);
        if (!record.patch.state || !canTransitionTask(snapshot.task.state, record.patch.state)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Task ${record.taskId} has an illegal transition.`);
        Object.assign(snapshot.task, structuredClone(record.patch), { revision: record.revision });
      } else if (record.type === "attempt-transition") {
        const snapshot = snapshots.get(record.taskId);
        const attempt = snapshot?.attempts.find((candidate) => candidate.id === record.attemptId);
        if (!snapshot || !attempt) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Attempt ${record.attemptId} transition has no attempt.`);
        if (attempt.revision !== record.revision - 1) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Attempt ${record.attemptId} revision is not append-only.`);
        if (!record.patch.state || !canTransitionAttempt(attempt.state, record.patch.state)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Attempt ${record.attemptId} has an illegal transition.`);
        Object.assign(attempt, structuredClone(record.patch), { revision: record.revision });
      } else {
        throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Unknown execution record type ${(record as { type?: unknown }).type}.`);
      }
    }
    return [...snapshots.values()];
  }

  async function snapshot(sessionId: string) {
    return fold(await readRecords(sessionId));
  }

  async function findTask(taskId: string) {
    const files = await fs.readdir(executionDirectory).catch((error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT" ? [] : Promise.reject(error));
    for (const entry of files.filter((name) => name.endsWith(".jsonl"))) {
      const sessionId = decodeURIComponent(entry.slice(0, -".jsonl".length));
      const found = (await snapshot(sessionId)).find((item) => item.task.id === taskId);
      if (found) return { sessionId, found };
    }
    return undefined;
  }

  const repository: ExecutionRepository = {
    async append(record) {
      const validated = validateRecord(record);
      const sessionId = validated.type === "task-created" ? validated.task.sessionId : validated.type === "attempt-created" ? (await findTask(validated.attempt.taskId))?.found.task.sessionId : (await findTask(validated.taskId))?.found.task.sessionId;
      if (!sessionId) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
      await withSessionQueue(sessionId, async () => {
        if (validated.type !== "task-created") {
          const taskId = validated.type === "attempt-created" ? validated.attempt.taskId : validated.taskId;
          const current = await findTask(taskId);
          if (!current || current.sessionId !== sessionId) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
        }
        await appendRecord(sessionId, validated);
      });
    },
    async createTask(task) {
      validateTask(task);
      await withSessionQueue(task.sessionId, async () => {
        validateTask(task);
        if ((await snapshot(task.sessionId)).some((item) => item.task.id === task.id)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Task ${task.id} already exists.`);
        await appendRecord(task.sessionId, { formatVersion: 1, type: "task-created", occurredAt: clock.now(), task: structuredClone(task) });
      });
    },
    async createAttempt(attempt) {
      validateAttempt(attempt);
      const initial = await findTask(attempt.taskId);
      if (!initial) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
      await withSessionQueue(initial.sessionId, async () => {
        validateAttempt(attempt);
        const found = await findTask(attempt.taskId);
        if (!found || found.sessionId !== initial.sessionId) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
        if (found.found.attempts.some((candidate) => candidate.id === attempt.id)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Attempt ${attempt.id} already exists.`);
        await appendRecord(initial.sessionId, { formatVersion: 1, type: "attempt-created", occurredAt: clock.now(), attempt: structuredClone(attempt) });
      });
    },
    async transitionTask(taskId, expectedRevision, patch, occurredAt) {
      const initial = await findTask(taskId);
      if (!initial) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
      return withSessionQueue(initial.sessionId, async () => {
        const found = await findTask(taskId);
        if (!found || found.sessionId !== initial.sessionId) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
        validatePatch(patch, taskPatchFields, taskStates, "Task transition patch");
        if (found.found.task.revision !== expectedRevision) throw new ExecutionRepositoryError("EXECUTION_REVISION_CONFLICT", "Execution task revision conflict.");
        if (!canTransitionTask(found.found.task.state, patch.state)) throw new ExecutionRepositoryError("EXECUTION_INVALID_TRANSITION", "Execution task transition is not allowed.");
        const revision = expectedRevision + 1;
        await appendRecord(found.sessionId, { formatVersion: 1, type: "task-transition", occurredAt, taskId, revision, patch: structuredClone(patch) });
        return { ...found.found.task, ...structuredClone(patch), revision };
      });
    },
    async transitionAttempt(taskId, attemptId, expectedRevision, patch, occurredAt) {
      const initial = await findTask(taskId);
      if (!initial) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
      return withSessionQueue(initial.sessionId, async () => {
        const found = await findTask(taskId);
        const attempt = found?.found.attempts.find((candidate) => candidate.id === attemptId);
        if (!found || found.sessionId !== initial.sessionId || !attempt) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution attempt not found.");
        validatePatch(patch, attemptPatchFields, attemptStates, "Attempt transition patch");
        if (attempt.revision !== expectedRevision) throw new ExecutionRepositoryError("EXECUTION_REVISION_CONFLICT", "Execution attempt revision conflict.");
        if (!canTransitionAttempt(attempt.state, patch.state)) throw new ExecutionRepositoryError("EXECUTION_INVALID_TRANSITION", "Execution attempt transition is not allowed.");
        const revision = expectedRevision + 1;
        await appendRecord(found.sessionId, { formatVersion: 1, type: "attempt-transition", occurredAt, taskId, attemptId, revision, patch: structuredClone(patch) });
        return { ...attempt, ...structuredClone(patch), revision };
      });
    },
    async list(sessionId, options = {}) {
      const snapshots = await snapshot(sessionId);
      const offset = options.after && /^\d+$/.test(options.after) ? Number(options.after) : 0;
      const limit = Math.max(1, Math.min(options.limit ?? 100, 100));
      const tasks = snapshots.slice(offset, offset + limit);
      return { tasks, ...(offset + limit < snapshots.length ? { nextAfter: String(offset + limit) } : {}) };
    },
    async get(taskId) {
      return (await findTask(taskId))?.found;
    },
    async delete(sessionId) {
      ensureWritable();
      await withSessionQueue(sessionId, async () => {
        const target = fileFor(sessionId);
        const pending = fileQueues.get(target);
        if (pending) await pending.catch(() => undefined);
        await fs.rm(target, { force: true });
      });
    },
    async drain() {
      while (sessionQueues.size > 0 || fileQueues.size > 0) {
        await Promise.all([
          ...[...sessionQueues.values()],
          ...[...fileQueues.values()]
        ].map((queue) => queue.catch(() => undefined)));
      }
    }
  };
  return repository;
}
