import { randomUUID } from "node:crypto";
import { failureAllowsAutomaticFallback, type DeploymentExecutionSnapshot, type ExecutionAttempt, type ExecutionSnapshot, type ExecutionTask, type RoutingFailure, type SideEffectObservation } from "../shared/execution-attempt.js";
import type { ExecutionRepository } from "./ports.js";

export interface RouteExecutionCandidate {
  deployment: DeploymentExecutionSnapshot;
}

export interface AttemptRunResult {
  status: "completed" | "failed" | "cancelled";
  failure?: RoutingFailure;
  sideEffect?: SideEffectObservation;
  usage?: { inputTokens?: number; outputTokens?: number };
  latencyMs?: number;
  cost?: number;
}

export interface RouteExecutionRequest {
  task: ExecutionTask;
  candidates: readonly RouteExecutionCandidate[];
  automaticTechnicalFallback: boolean;
  runAttempt(input: { attempt: ExecutionAttempt; signal: AbortSignal }): Promise<AttemptRunResult>;
}

export class RouteExecutionError extends Error {
  constructor(readonly code: "TASK_REVISION_CONFLICT" | "TASK_CANCELLED" | "ROUTE_REPLAY_CONFIRMATION_REQUIRED" | "ROUTE_FALLBACK_EXHAUSTED" | "EXECUTION_NOT_FOUND" | "EXECUTION_ATTEMPT_CANCEL_FAILED", message: string) {
    super(message);
    this.name = "RouteExecutionError";
  }
}

/**
 * Owns candidate choice and Task/Attempt transitions. Runtime/Transport code
 * only supplies one-attempt execution and never chooses the next deployment.
 */
export class RouteExecutionCoordinator {
  private readonly active = new Map<string, Promise<ExecutionSnapshot>>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly requests = new Map<string, RouteExecutionRequest>();
  private readonly confirmations = new Map<string, Promise<ExecutionSnapshot>>();
  private readonly taskLocks = new Map<string, Promise<void>>();

  constructor(private readonly repository: ExecutionRepository, private readonly now: () => string = () => new Date().toISOString()) {}

  execute(request: RouteExecutionRequest): Promise<ExecutionSnapshot> {
    const existing = this.active.get(request.task.id);
    if (existing) return existing;
    const frozenRequest: RouteExecutionRequest = {
      ...request,
      candidates: deepFreeze(structuredClone(request.candidates)),
    };
    this.requests.set(request.task.id, frozenRequest);
    const operation = this.run(frozenRequest).finally(() => {
      if (this.active.get(request.task.id) === operation) this.active.delete(request.task.id);
      this.controllers.delete(request.task.id);
    });
    this.active.set(request.task.id, operation);
    return operation;
  }

  async confirmRetry(taskId: string, expectedRevision: number, confirmationToken: string, inputSha256: string): Promise<ExecutionSnapshot> {
    const key = [taskId, expectedRevision, confirmationToken, inputSha256].join("\\u0000");
    const existing = this.confirmations.get(key);
    if (existing) return existing;
    const operation = this.confirmRetryOnce(taskId, expectedRevision, confirmationToken, inputSha256);
    this.confirmations.set(key, operation);
    try {
      return await operation;
    } finally {
      if (this.confirmations.get(key) === operation) this.confirmations.delete(key);
    }
  }

  private async confirmRetryOnce(taskId: string, expectedRevision: number, confirmationToken: string, inputSha256: string): Promise<ExecutionSnapshot> {
    const operation = this.active.get(taskId);
    if (operation) await operation.catch(() => undefined);
    const request = this.requests.get(taskId);
    if (!request) {
      const snapshot = await this.repository.get(taskId);
      if (snapshot?.task.state === "awaiting_confirmation") {
        throw new RouteExecutionError("ROUTE_REPLAY_CONFIRMATION_REQUIRED", "The execution is awaiting confirmation after restart; replay the original request before retrying.");
      }
      throw new RouteExecutionError("EXECUTION_NOT_FOUND", "The execution request is no longer available after restart.");
    }
    const attempt = await this.withTaskLock(taskId, async () => {
      const snapshot = await this.requireSnapshot(taskId);
      if (snapshot.task.state !== "awaiting_confirmation" || snapshot.task.revision !== expectedRevision || snapshot.task.confirmationToken !== confirmationToken || snapshot.task.confirmationInputSha256 !== inputSha256 || snapshot.task.input.sha256 !== inputSha256) {
        throw new RouteExecutionError("TASK_REVISION_CONFLICT", "The execution confirmation is stale or invalid.");
      }
      const candidate = this.nextCandidate(request, snapshot);
      if (!candidate) throw new RouteExecutionError("ROUTE_FALLBACK_EXHAUSTED", "No executable deployment remains for this route.");
      const runningTask = await this.repository.transitionTask(taskId, expectedRevision, { state: "running", confirmationToken: undefined, confirmationInputSha256: undefined }, this.now());
      const nextAttempt = this.newAttempt(runningTask, candidate, "confirmed-retry", snapshot.attempts.length + 1);
      await this.repository.createAttempt(nextAttempt);
      return nextAttempt;
    });
    return this.runAttempt(request, attempt, false);
  }

  async cancel(taskId: string, expectedRevision?: number): Promise<ExecutionSnapshot> {
    return this.withTaskLock(taskId, async () => {
      const snapshot = await this.requireSnapshot(taskId);
      if (expectedRevision !== undefined && snapshot.task.revision !== expectedRevision) throw new RouteExecutionError("TASK_REVISION_CONFLICT", "The execution task has changed.");
      if (["completed", "failed", "cancelled"].includes(snapshot.task.state)) return snapshot;
      this.controllers.get(taskId)?.abort();
      const activeAttempt = snapshot.attempts.find((attempt) => attempt.state === "running" || attempt.state === "created");
      if (activeAttempt) {
        try {
          await this.repository.transitionAttempt(taskId, activeAttempt.id, activeAttempt.revision, { state: "cancelled", completedAt: this.now() }, this.now());
        } catch {
          throw new RouteExecutionError("EXECUTION_ATTEMPT_CANCEL_FAILED", "The active execution attempt could not be cancelled; the task remains active.");
        }
      }
      await this.repository.transitionTask(taskId, snapshot.task.revision ?? 1, { state: "cancelled", completedAt: this.now() }, this.now()).catch((error: unknown) => {
        if (error instanceof Error && "code" in error && (error as { code?: string }).code === "EXECUTION_REVISION_CONFLICT") throw new RouteExecutionError("TASK_REVISION_CONFLICT", "The execution task has changed.");
        throw error;
      });
      return this.requireSnapshot(taskId);
    });
  }

  private async run(request: RouteExecutionRequest): Promise<ExecutionSnapshot> {
    const prepared = await this.withTaskLock(request.task.id, async () => {
      let snapshot = await this.repository.get(request.task.id);
      if (!snapshot) {
        const initialTask: ExecutionTask = { ...request.task, state: "created", revision: request.task.revision ?? 1 };
        await this.repository.createTask(initialTask);
        snapshot = { task: initialTask, attempts: [] };
      }
      if (["completed", "failed", "cancelled", "awaiting_confirmation"].includes(snapshot.task.state)) return { snapshot };
      if (snapshot.attempts.some((attempt) => attempt.state === "running")) return { snapshot };
      const candidate = this.nextCandidate(request, snapshot);
      if (!candidate) {
        await this.repository.transitionTask(snapshot.task.id, snapshot.task.revision ?? 1, { state: "failed", completedAt: this.now() }, this.now());
        return { snapshot: await this.requireSnapshot(snapshot.task.id) };
      }
      if (snapshot.task.state === "created") await this.repository.transitionTask(snapshot.task.id, snapshot.task.revision ?? 1, { state: "running" }, this.now());
      const current = await this.requireSnapshot(request.task.id);
      const existingAttempt = current.attempts.find((attempt) => attempt.state === "created");
      if (existingAttempt) return { attempt: existingAttempt };
      const attempt = this.newAttempt(current.task, candidate, "primary", current.attempts.length + 1);
      await this.repository.createAttempt(attempt);
      return { attempt };
    });
    if (!prepared.attempt) return prepared.snapshot;
    return this.runAttempt(request, prepared.attempt, request.automaticTechnicalFallback);
  }

  private async runAttempt(request: RouteExecutionRequest, attempt: ExecutionAttempt, allowAutomaticFallback: boolean): Promise<ExecutionSnapshot> {
    const prepared = await this.withTaskLock(attempt.taskId, async () => {
      const snapshot = await this.requireSnapshot(attempt.taskId);
      if (["completed", "failed", "cancelled", "awaiting_confirmation"].includes(snapshot.task.state)) return { snapshot };
      const currentAttempt = latestAttempt(snapshot, attempt.id);
      if (currentAttempt.state === "running") return { attempt: currentAttempt, controller: this.controllers.get(attempt.taskId) ?? new AbortController() };
      if (currentAttempt.state !== "created") return { snapshot };
      const runningAttempt = await this.repository.transitionAttempt(attempt.taskId, attempt.id, currentAttempt.revision, { state: "running", startedAt: this.now() }, this.now());
      const controller = new AbortController();
      this.controllers.set(attempt.taskId, controller);
      return { attempt: runningAttempt, controller };
    });
    if (!prepared.attempt) return prepared.snapshot;
    const running = prepared.attempt;
    const controller = prepared.controller;
    let result: AttemptRunResult;
    try {
      result = await request.runAttempt({ attempt: running, signal: controller.signal });
    } catch (error) {
      result = { status: controller.signal.aborted ? "cancelled" : "failed", failure: { code: "TURN_FAILED", class: "unknown", message: error instanceof Error ? error.message : String(error), fallbackEligible: false }, sideEffect: { state: "unknown", evidenceEventIds: [] } };
    }
    const sideEffect = result.sideEffect ?? { state: result.status === "completed" ? "clean" : "unknown", evidenceEventIds: [] };
    const nextStep = await this.withTaskLock(attempt.taskId, async () => {
      const latest = await this.requireSnapshot(attempt.taskId);
      if (latest.task.state === "cancelled") return { snapshot: latest };
      const currentAttempt = latestAttempt(latest, attempt.id);
      if (currentAttempt.state !== "running") return { snapshot: latest };
      if (result.status === "completed") {
        await this.repository.transitionAttempt(attempt.taskId, attempt.id, currentAttempt.revision, { state: "completed", completedAt: this.now(), sideEffect, usage: result.usage, latencyMs: result.latencyMs, cost: result.cost }, this.now());
        const afterAttempt = await this.requireSnapshot(attempt.taskId);
        await this.repository.transitionTask(attempt.taskId, afterAttempt.task.revision ?? 1, { state: "completed", selectedAttemptId: attempt.id, completedAt: this.now(), confirmationToken: undefined, confirmationInputSha256: undefined }, this.now());
        return { snapshot: await this.requireSnapshot(attempt.taskId) };
      }
      await this.repository.transitionAttempt(attempt.taskId, attempt.id, currentAttempt.revision, { state: result.status === "cancelled" ? "cancelled" : "failed", completedAt: this.now(), failure: result.failure, sideEffect, usage: result.usage, latencyMs: result.latencyMs, cost: result.cost }, this.now());
      const afterFailure = await this.requireSnapshot(attempt.taskId);
      if (result.status === "cancelled") {
        if (afterFailure.task.state !== "cancelled") await this.repository.transitionTask(attempt.taskId, afterFailure.task.revision ?? 1, { state: "cancelled", completedAt: this.now() }, this.now());
        return { snapshot: await this.requireSnapshot(attempt.taskId) };
      }
      const next = this.nextCandidate(request, afterFailure);
      const canFallback = allowAutomaticFallback && next && !afterFailure.attempts.some((item) => item.trigger === "automatic-fallback") && failureAllowsAutomaticFallback(result.failure) && sideEffect.state === "clean";
      if (canFallback) {
        const fallbackAttempt = this.newAttempt(afterFailure.task, next, "automatic-fallback", afterFailure.attempts.length + 1);
        await this.repository.createAttempt(fallbackAttempt);
        return { nextAttempt: fallbackAttempt };
      }
      if (allowAutomaticFallback && next && failureAllowsAutomaticFallback(result.failure) && sideEffect.state !== "clean") {
        await this.repository.transitionTask(attempt.taskId, afterFailure.task.revision ?? 1, { state: "awaiting_confirmation", confirmationToken: randomUUID(), confirmationInputSha256: afterFailure.task.input.sha256 }, this.now());
      } else {
        await this.repository.transitionTask(attempt.taskId, afterFailure.task.revision ?? 1, { state: "failed", completedAt: this.now(), confirmationToken: undefined, confirmationInputSha256: undefined }, this.now());
      }
      return { snapshot: await this.requireSnapshot(attempt.taskId) };
    });
    if (nextStep.nextAttempt) return this.runAttempt(request, nextStep.nextAttempt, false);
    return nextStep.snapshot;
  }

  private async withTaskLock<T>(taskId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.taskLocks.get(taskId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    this.taskLocks.set(taskId, current);
    await previous.catch(() => undefined);
    try {
      return await work();
    } finally {
      release();
      if (this.taskLocks.get(taskId) === current) this.taskLocks.delete(taskId);
    }
  }

  private nextCandidate(request: RouteExecutionRequest, snapshot: ExecutionSnapshot): RouteExecutionCandidate | undefined {
    const used = new Set(snapshot.attempts.map((attempt) => attempt.deployment.deploymentId));
    return request.candidates.find((candidate) => !used.has(candidate.deployment.deploymentId));
  }

  private newAttempt(task: ExecutionTask, candidate: RouteExecutionCandidate, trigger: ExecutionAttempt["trigger"], ordinal: number): ExecutionAttempt {
    return { id: randomUUID(), taskId: task.id, ordinal, trigger, deployment: structuredClone(candidate.deployment), state: "created", revision: 1, sideEffect: { state: "clean", evidenceEventIds: [] } };
  }

  private async requireSnapshot(taskId: string) {
    const snapshot = await this.repository.get(taskId);
    if (!snapshot) throw new RouteExecutionError("EXECUTION_NOT_FOUND", "Execution task not found.");
    return snapshot;
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function latestAttempt(snapshot: ExecutionSnapshot, attemptId: string) {
  const attempt = snapshot.attempts.find((candidate) => candidate.id === attemptId);
  if (!attempt) throw new RouteExecutionError("EXECUTION_NOT_FOUND", "Execution attempt not found.");
  return attempt;
}

export function createRouteExecutionCoordinator(repository: ExecutionRepository, now?: () => string) {
  return new RouteExecutionCoordinator(repository, now);
}
