import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createJsonExecutionRepository } from "./execution-store.js";
import { createRouteExecutionCoordinator } from "./route-execution-coordinator.js";
import type { DeploymentExecutionSnapshot, ExecutionTask } from "../shared/execution-attempt.js";
import type { ExecutionRepository } from "./ports.js";

const directories: string[] = [];
const clock = { now: () => "2026-08-02T00:00:00.000Z" };

function task(): ExecutionTask {
  return {
    id: "task-1",
    sessionId: "session-1",
    turnId: "turn-1",
    input: { transcriptEventId: "event-1", sha256: "a".repeat(64) },
    resolvedRoute: { kind: "route", routeId: "route-1", resolvedAt: clock.now(), sourceTrace: [], candidates: [], executableCandidates: [], canSend: true },
    state: "created",
    revision: 1,
    createdAt: clock.now()
  };
}

function candidate(id: string): { deployment: DeploymentExecutionSnapshot } {
  return { deployment: { deploymentId: id, deploymentName: id, providerId: `provider-${id}`, providerName: id, profileId: `profile-${id}`, modelId: `model-${id}` } };
}

const allowedFailureClasses = ["startup", "connection", "timeout", "rate-limited", "provider-unavailable", "model-temporarily-unavailable"] as const;

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("route execution coordinator", () => {
  it.each(allowedFailureClasses)("allows one automatic fallback for %s", async (failureClass) => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-matrix-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    const snapshot = await coordinator.execute({
      task: task(), candidates: [candidate("primary"), candidate("backup"), candidate("third")], automaticTechnicalFallback: true,
      runAttempt: async ({ attempt }) => attempt.trigger === "primary"
        ? { status: "failed" as const, failure: { code: failureClass.toUpperCase(), class: failureClass, message: "technical failure", fallbackEligible: true }, sideEffect: { state: "clean" as const, evidenceEventIds: [] } }
        : { status: "completed" as const, sideEffect: { state: "clean" as const, evidenceEventIds: [] } }
    });
    expect(snapshot.task.state).toBe("completed");
    expect(snapshot.attempts).toHaveLength(2);
    expect(snapshot.attempts.map((attempt) => attempt.ordinal)).toEqual([1, 2]);
    expect(snapshot.attempts.map((attempt) => attempt.trigger)).toEqual(["primary", "automatic-fallback"]);
    expect(snapshot.attempts[1].state).toBe("completed");
  });

  it.each([
    ["forbidden", "policy"], ["configuration", "configuration"], ["authentication", "authentication"],
    ["secret", "secret-missing"], ["unknown", "unknown"]
  ] as const)("does not fallback for %s failures", async (_label, failureClass) => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-no-fallback-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    const snapshot = await coordinator.execute({
      task: task(), candidates: [candidate("primary"), candidate("backup")], automaticTechnicalFallback: true,
      runAttempt: async () => ({ status: "failed" as const, failure: { code: "BLOCKED", class: failureClass, message: "blocked", fallbackEligible: false }, sideEffect: { state: "clean" as const, evidenceEventIds: [] } })
    });
    expect(snapshot.task.state).toBe("failed");
    expect(snapshot.attempts).toHaveLength(1);
  });

  it("does not fallback when automatic fallback is disabled", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-disabled-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const snapshot = await createRouteExecutionCoordinator(repository, clock.now).execute({
      task: task(), candidates: [candidate("primary"), candidate("backup")], automaticTechnicalFallback: false,
      runAttempt: async () => ({ status: "failed" as const, failure: { code: "TIMEOUT", class: "timeout" as const, message: "timeout", fallbackEligible: true }, sideEffect: { state: "clean" as const, evidenceEventIds: [] } })
    });
    expect(snapshot.task.state).toBe("failed");
    expect(snapshot.attempts).toHaveLength(1);
  });

  it("fails with zero attempts when there are no candidates", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-empty-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const snapshot = await createRouteExecutionCoordinator(repository, clock.now).execute({ task: task(), candidates: [], automaticTechnicalFallback: true, runAttempt: async () => { throw new Error("must not run"); } });
    expect(snapshot.task.state).toBe("failed");
    expect(snapshot.attempts).toHaveLength(0);
  });

  it("exhausts two candidates after two allowed failures", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-exhausted-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const snapshot = await createRouteExecutionCoordinator(repository, clock.now).execute({
      task: task(), candidates: [candidate("primary"), candidate("backup")], automaticTechnicalFallback: true,
      runAttempt: async ({ attempt }) => ({ status: "failed" as const, failure: { code: "DOWN", class: "provider-unavailable" as const, message: attempt.deployment.deploymentId, fallbackEligible: true }, sideEffect: { state: "clean" as const, evidenceEventIds: [] } })
    });
    expect(snapshot.task.state).toBe("failed");
    expect(snapshot.attempts).toHaveLength(2);
  });

  it("persists the Attempt and transitions it to running before invoking the backend", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-order-"));
    directories.push(dataDirectory);
    const base = createJsonExecutionRepository({ dataDirectory, clock });
    const events: string[] = [];
    const repository: ExecutionRepository = {
      ...base,
      createTask: async (value) => { events.push("createTask"); return base.createTask(value); },
      createAttempt: async (value) => { events.push("createAttempt"); return base.createAttempt(value); },
      transitionAttempt: async (...args) => { events.push(`transitionAttempt:${args[3].state}`); return base.transitionAttempt(...args); }
    };
    const snapshot = await createRouteExecutionCoordinator(repository, clock.now).execute({
      task: task(), candidates: [candidate("primary")], automaticTechnicalFallback: false,
      runAttempt: async () => { events.push("runAttempt"); return { status: "completed" as const, sideEffect: { state: "clean" as const, evidenceEventIds: [] } }; }
    });
    expect(snapshot.task.state).toBe("completed");
    expect(events.indexOf("createAttempt")).toBeLessThan(events.indexOf("transitionAttempt:running"));
    expect(events.indexOf("transitionAttempt:running")).toBeLessThan(events.indexOf("runAttempt"));
  });

  it("deduplicates concurrent execute calls and replays a completed snapshot", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-replay-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const firstCoordinator = createRouteExecutionCoordinator(repository, clock.now);
    let runs = 0;
    const request = { task: task(), candidates: [candidate("primary")], automaticTechnicalFallback: false, runAttempt: async () => { runs += 1; return { status: "completed" as const, sideEffect: { state: "clean" as const, evidenceEventIds: [] } }; } };
    const first = firstCoordinator.execute(request);
    const duplicate = firstCoordinator.execute(request);
    expect(duplicate).toBe(first);
    expect(await first).toEqual(await duplicate);
    expect(runs).toBe(1);
    const replay = await createRouteExecutionCoordinator(repository, clock.now).execute({ ...request, runAttempt: async () => { throw new Error("replay must not run"); } });
    expect(replay).toEqual(await first);
  });

  it("creates exactly one automatic fallback for a clean technical failure", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-coordinator-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    const snapshot = await coordinator.execute({
      task: task(),
      candidates: [candidate("primary"), candidate("backup"), candidate("third")],
      automaticTechnicalFallback: true,
      runAttempt: async ({ attempt }) => attempt.trigger === "primary"
        ? { status: "failed", failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable", message: "down", fallbackEligible: true }, sideEffect: { state: "clean", evidenceEventIds: [] } }
        : { status: "completed", sideEffect: { state: "clean", evidenceEventIds: [] } }
    });

    expect(snapshot.task.state).toBe("completed");
    expect(snapshot.attempts.map((attempt) => attempt.trigger)).toEqual(["primary", "automatic-fallback"]);
    expect(snapshot.attempts[0].state).toBe("failed");
    expect(snapshot.task.selectedAttemptId).toBe(snapshot.attempts[1].id);
  });

  it("waits for confirmation when the failed attempt may have side effects and accepts one retry", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-confirmation-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    const initial = await coordinator.execute({
      task: task(),
      candidates: [candidate("primary"), candidate("backup")],
      automaticTechnicalFallback: true,
      runAttempt: async ({ attempt }) => attempt.trigger === "primary"
        ? { status: "failed", failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable", message: "stream ended", fallbackEligible: true }, sideEffect: { state: "unknown", evidenceEventIds: ["event-tool"] } }
        : { status: "completed", sideEffect: { state: "clean", evidenceEventIds: [] } }
    });

    expect(initial.task.state).toBe("awaiting_confirmation");
    expect(initial.attempts).toHaveLength(1);
    const retried = await coordinator.confirmRetry(initial.task.id, initial.task.revision ?? 0, initial.task.confirmationToken!, initial.task.input.sha256);
    expect(retried.task.state).toBe("completed");
    expect(retried.attempts.map((attempt) => attempt.trigger)).toEqual(["primary", "confirmed-retry"]);
    expect(retried.attempts[1].ordinal).toBe(2);
  });

  it("requires replay after restart without changing a persisted confirmation task", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-confirmation-restart-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const initial = await createRouteExecutionCoordinator(repository, clock.now).execute({
      task: task(),
      candidates: [candidate("primary"), candidate("backup")],
      automaticTechnicalFallback: true,
      runAttempt: async () => ({
        status: "failed" as const,
        failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable" as const, message: "stream ended", fallbackEligible: true },
        sideEffect: { state: "unknown" as const, evidenceEventIds: ["event-tool"] }
      })
    });
    expect(initial.task.state).toBe("awaiting_confirmation");
    const before = await repository.get(initial.task.id);

    await expect(createRouteExecutionCoordinator(repository, clock.now).confirmRetry(
      initial.task.id,
      initial.task.revision!,
      initial.task.confirmationToken!,
      initial.task.input.sha256
    )).rejects.toMatchObject({ code: "ROUTE_REPLAY_CONFIRMATION_REQUIRED" });
    expect(await repository.get(initial.task.id)).toEqual(before);
  });

  it.each(["possible", "confirmed", "unknown"] as const)("requires confirmation for %s side effects and never auto-fallbacks", async (sideEffect) => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), `cli-gui-route-${sideEffect}-`));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    const snapshot = await coordinator.execute({
      task: task(), candidates: [candidate("primary"), candidate("backup")], automaticTechnicalFallback: true,
      runAttempt: async () => ({ status: "failed" as const, failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable" as const, message: "ambiguous", fallbackEligible: true }, sideEffect: { state: sideEffect, evidenceEventIds: ["effect-1"] } })
    });
    expect(snapshot.task.state).toBe("awaiting_confirmation");
    expect(snapshot.attempts).toHaveLength(1);
    expect(snapshot.attempts[0].trigger).toBe("primary");
  });

  it("rejects invalid confirmation credentials without creating an Attempt and makes confirm idempotent", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-confirmation-contract-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    const initial = await coordinator.execute({
      task: task(), candidates: [candidate("primary"), candidate("backup")], automaticTechnicalFallback: true,
      runAttempt: async ({ attempt }) => attempt.trigger === "primary"
        ? { status: "failed" as const, failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable" as const, message: "unknown", fallbackEligible: true }, sideEffect: { state: "unknown" as const, evidenceEventIds: ["effect-1"] } }
        : { status: "completed" as const, sideEffect: { state: "clean" as const, evidenceEventIds: [] } }
    });
    const revision = initial.task.revision!;
    const token = initial.task.confirmationToken!;
    const input = initial.task.input.sha256;
    for (const [badToken, badInput, badRevision] of [["wrong", input, revision], [token, "b".repeat(64), revision], [token, input, revision - 1]] as const) {
      await expect(coordinator.confirmRetry(initial.task.id, badRevision, badToken, badInput)).rejects.toMatchObject({ code: expect.any(String) });
      expect((await repository.get(initial.task.id))!.attempts).toHaveLength(1);
    }
    const [confirmed, duplicate] = await Promise.all([
      coordinator.confirmRetry(initial.task.id, revision, token, input),
      coordinator.confirmRetry(initial.task.id, revision, token, input)
    ]);
    expect(confirmed.attempts).toHaveLength(2);
    expect(confirmed.attempts[1].trigger).toBe("confirmed-retry");
    expect(duplicate.attempts).toHaveLength(2);
  });

  it("does not let an in-flight wrong confirmation credential poison the valid one", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-confirmation-key-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    const initial = await coordinator.execute({
      task: task(), candidates: [candidate("primary"), candidate("backup")], automaticTechnicalFallback: true,
      runAttempt: async ({ attempt }) => attempt.trigger === "primary"
        ? { status: "failed" as const, failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable" as const, message: "unknown", fallbackEligible: true }, sideEffect: { state: "unknown" as const, evidenceEventIds: ["effect-1"] } }
        : { status: "completed" as const, sideEffect: { state: "clean" as const, evidenceEventIds: [] } }
    });
    const revision = initial.task.revision!;
    const token = initial.task.confirmationToken!;
    const input = initial.task.input.sha256;
    const wrong = coordinator.confirmRetry(initial.task.id, revision, "wrong-token", input);
    const right = coordinator.confirmRetry(initial.task.id, revision, token, input);
    await expect(wrong).rejects.toMatchObject({ code: "TASK_REVISION_CONFLICT" });
    await expect(right).resolves.toMatchObject({ task: { state: "completed" } });
  });

  it("lets cancellation win the failure race without creating a fallback", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-cancel-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const operation = coordinator.execute({
      task: task(),
      candidates: [candidate("primary"), candidate("backup")],
      automaticTechnicalFallback: true,
      runAttempt: async ({ signal }) => {
        await blocked;
        return signal.aborted ? { status: "cancelled" as const } : { status: "failed" as const, failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable", message: "down" }, sideEffect: { state: "clean", evidenceEventIds: [] } };
      }
    });
    await new Promise((resolve) => setImmediate(resolve));
    const cancelled = await coordinator.cancel("task-1");
    release();
    const final = await operation;
    expect(cancelled.task.state).toBe("cancelled");
    expect(final.task.state).toBe("cancelled");
    expect(final.attempts).toHaveLength(1);
    expect(final.attempts[0].state).toBe("cancelled");
  });

  it("does not abort the running attempt for a stale cancellation", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-stale-cancel-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let started!: () => void;
    const startedPromise = new Promise<void>((resolve) => { started = resolve; });
    let observedSignal!: AbortSignal;
    const operation = coordinator.execute({
      task: task(),
      candidates: [candidate("primary")],
      automaticTechnicalFallback: false,
      runAttempt: async ({ signal }) => {
        observedSignal = signal;
        started();
        await gate;
        return signal.aborted
          ? { status: "cancelled" as const }
          : { status: "completed" as const, sideEffect: { state: "clean" as const, evidenceEventIds: [] } };
      }
    });
    await startedPromise;

    await expect(coordinator.cancel("task-1", 1)).rejects.toMatchObject({ code: "TASK_REVISION_CONFLICT" });
    expect(observedSignal.aborted).toBe(false);
    release();
    const final = await operation;
    expect(final.task.state).toBe("completed");
  });

  it("keeps the Task active when cancelling the Attempt cannot be persisted", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-cancel-persist-failure-"));
    directories.push(dataDirectory);
    const base = createJsonExecutionRepository({ dataDirectory, clock });
    const repository: ExecutionRepository = {
      ...base,
      transitionAttempt: async (...args) => {
        if (args[3].state === "cancelled") throw new Error("attempt persistence unavailable");
        return base.transitionAttempt(...args);
      }
    };
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const operation = coordinator.execute({
      task: task(), candidates: [candidate("primary")], automaticTechnicalFallback: false,
      runAttempt: async () => { await gate; return { status: "completed" as const, sideEffect: { state: "clean" as const, evidenceEventIds: [] } }; }
    });
    await new Promise((resolve) => setImmediate(resolve));
    await expect(coordinator.cancel("task-1")).rejects.toMatchObject({ code: "EXECUTION_ATTEMPT_CANCEL_FAILED" });
    expect((await repository.get("task-1"))?.task.state).toBe("running");
    release();
    await expect(operation).resolves.toMatchObject({ task: { state: "completed" } });
  });

  it("freezes the candidate order and deployment snapshot at first acceptance", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-route-freeze-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const coordinator = createRouteExecutionCoordinator(repository, clock.now);
    const candidates = [candidate("primary"), candidate("backup")];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const operation = coordinator.execute({
      task: task(),
      candidates,
      automaticTechnicalFallback: true,
      runAttempt: async ({ attempt }) => {
        await gate;
        return attempt.trigger === "primary"
          ? { status: "failed" as const, failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable" as const, message: "down", fallbackEligible: true }, sideEffect: { state: "clean" as const, evidenceEventIds: [] } }
          : { status: "completed" as const, sideEffect: { state: "clean" as const, evidenceEventIds: [] } };
      }
    });
    candidates.reverse();
    candidates[0].deployment.deploymentId = "caller-mutated";
    release();
    const snapshot = await operation;
    expect(snapshot.attempts.map((attempt) => attempt.deployment.deploymentId)).toEqual(["primary", "backup"]);
  });
});
