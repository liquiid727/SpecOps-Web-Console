import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createJsonExecutionRepository } from "./execution-store.js";
import { createRouteExecutionCoordinator } from "./route-execution-coordinator.js";
import type { DeploymentExecutionSnapshot, ExecutionTask } from "../shared/execution-attempt.js";

const directories: string[] = [];
const clock = { now: () => "2026-08-02T00:00:00.000Z" };

function task(): ExecutionTask {
  return {
    id: "task-1",
    sessionId: "session-1",
    turnId: "turn-1",
    input: { transcriptEventId: "event-1", sha256: "input-sha" },
    resolvedRoute: { kind: "route", routeId: "route-1", resolvedAt: clock.now(), sourceTrace: [], candidates: [], executableCandidates: [], canSend: true },
    state: "created",
    revision: 1,
    createdAt: clock.now()
  };
}

function candidate(id: string): { deployment: DeploymentExecutionSnapshot } {
  return { deployment: { deploymentId: id, deploymentName: id, providerId: `provider-${id}`, providerName: id, profileId: `profile-${id}`, modelId: `model-${id}` } };
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("route execution coordinator", () => {
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
});
