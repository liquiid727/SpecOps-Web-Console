import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createJsonExecutionRepository, ExecutionRepositoryError } from "./execution-store.js";
import type { ExecutionAttempt, ExecutionTask } from "../shared/execution-attempt.js";

const directories: string[] = [];
const clock = { now: () => "2026-08-02T00:00:00.000Z" };

function task(id = "task-1"): ExecutionTask {
  return {
    id,
    sessionId: "session-1",
    turnId: "turn-1",
    input: { transcriptEventId: "event-1", sha256: "input-sha" },
    resolvedRoute: { kind: "route", routeId: "route-1", resolvedAt: clock.now(), sourceTrace: [], candidates: [], executableCandidates: [], canSend: true },
    state: "created",
    revision: 1,
    createdAt: clock.now()
  };
}

function attempt(taskId: string): ExecutionAttempt {
  return {
    id: "attempt-1",
    taskId,
    ordinal: 1,
    trigger: "primary",
    deployment: { deploymentId: "deployment-1", deploymentName: "Primary", providerId: "provider-1", providerName: "Provider", profileId: "profile-1", modelId: "model-1" },
    state: "created",
    revision: 1,
    sideEffect: { state: "clean", evidenceEventIds: [] }
  };
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("JSON execution repository", () => {
  it("folds append-only transitions and recovers from a fresh repository instance", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const nextTask = task();
    await repository.createTask(nextTask);
    await repository.createAttempt(attempt(nextTask.id));
    await repository.transitionTask(nextTask.id, 1, { state: "running" }, clock.now());
    await repository.transitionAttempt(nextTask.id, "attempt-1", 1, { state: "running", startedAt: clock.now() }, clock.now());
    await repository.transitionAttempt(nextTask.id, "attempt-1", 2, { state: "failed", completedAt: clock.now(), failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable", message: "temporarily unavailable" }, sideEffect: { state: "clean", evidenceEventIds: [] } }, clock.now());
    await repository.transitionTask(nextTask.id, 2, { state: "failed", completedAt: clock.now() }, clock.now());

    const recovered = await createJsonExecutionRepository({ dataDirectory, clock }).get(nextTask.id);
    expect(recovered?.task.state).toBe("failed");
    expect(recovered?.task.revision).toBe(3);
    expect(recovered?.attempts[0]).toMatchObject({ state: "failed", revision: 3, failure: { class: "provider-unavailable" } });
  });

  it("ignores an incomplete tail but rejects a corrupt complete record", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-recovery-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    await repository.createTask(task());
    const file = path.join(dataDirectory, "executions", `${encodeURIComponent("session-1")}.jsonl`);
    await appendFile(file, "{\"formatVersion\":1,\"type\":\"incomplete\"");
    expect((await repository.list("session-1")).tasks).toHaveLength(1);

    const completeLine = await readFile(file, "utf8");
    await appendFile(file, `\n${completeLine.split("\n")[0]}\n`);
    await expect(repository.list("session-1")).rejects.toMatchObject({ code: "EXECUTION_HISTORY_CORRUPT" });
    await expect(repository.transitionTask("missing", 1, { state: "failed" }, clock.now())).rejects.toBeInstanceOf(ExecutionRepositoryError);
  });
});
