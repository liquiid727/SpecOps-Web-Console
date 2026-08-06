import fs, { appendFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createJsonExecutionRepository, ExecutionRepositoryError } from "./execution-store.js";
import type { ExecutionAttempt, ExecutionTask } from "../shared/execution-attempt.js";

const directories: string[] = [];
const clock = { now: () => "2026-08-02T00:00:00.000Z" };

function task(id = "task-1"): ExecutionTask {
  return {
    id,
    sessionId: "session-1",
    turnId: "turn-1",
    input: { transcriptEventId: "event-1", sha256: "a".repeat(64) },
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
  vi.restoreAllMocks();
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

  it("accepts a valid final JSONL record without a trailing newline", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-final-record-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    await repository.createTask(task("task-final-record"));
    const file = path.join(dataDirectory, "executions", `${encodeURIComponent("session-1")}.jsonl`);
    const source = await readFile(file, "utf8");
    await fs.writeFile(file, source.replace(/\n$/, ""), "utf8");

    const recovered = await createJsonExecutionRepository({ dataDirectory, clock }).get("task-final-record");
    expect(recovered?.task.id).toBe("task-final-record");
  });

  it("returns stable ordered pages from a fresh repository after restart", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-pages-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    for (const id of ["task-page-1", "task-page-2", "task-page-3"]) await repository.createTask(task(id));

    const first = await repository.list("session-1", { limit: 2 });
    const recovered = createJsonExecutionRepository({ dataDirectory, clock });
    const firstAfterRestart = await recovered.list("session-1", { limit: 2 });
    const second = await recovered.list("session-1", { after: first.nextAfter, limit: 2 });

    expect(first).toEqual(firstAfterRestart);
    expect(first.tasks.map(({ task: item }) => item.id)).toEqual(["task-page-1", "task-page-2"]);
    expect(second.tasks.map(({ task: item }) => item.id)).toEqual(["task-page-3"]);
    expect(second.nextAfter).toBeUndefined();
  });

  it("keeps frozen route and deployment history unchanged after later archive-like mutation", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-snapshot-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const historicalTask = task("task-history");
    historicalTask.resolvedRoute = {
      kind: "route", routeId: "route-1", resolvedAt: clock.now(), sourceTrace: [{ field: "routeId", source: "session", value: "route-1" }],
      candidates: [{ deploymentId: "deployment-1", position: 1, eligible: true, exclusionCodes: [] }],
      executableCandidates: [{ deploymentId: "deployment-1", position: 1, eligible: true, exclusionCodes: [] }],
      selectedDeploymentId: "deployment-1", canSend: true
    };
    const historicalAttempt = attempt(historicalTask.id);
    await repository.createTask(historicalTask);
    await repository.createAttempt(historicalAttempt);

    const read = await repository.get(historicalTask.id);
    expect(read?.task.resolvedRoute).toMatchObject({ routeId: "route-1", selectedDeploymentId: "deployment-1" });
    expect(read?.attempts[0].deployment).toMatchObject({ deploymentId: "deployment-1", providerId: "provider-1", profileId: "profile-1", modelId: "model-1" });
    read!.task.resolvedRoute = { kind: "legacy-profile-model", resolvedAt: clock.now(), sourceTrace: [], candidates: [], executableCandidates: [], canSend: true, legacyResolution: { kind: "legacy-profile-model", profileId: "profile-1", modelId: null, source: "profile-default" } };
    read!.attempts[0].deployment.modelId = "archived-replacement";

    const afterMutation = await repository.get(historicalTask.id);
    expect(afterMutation?.task.resolvedRoute).toMatchObject({ routeId: "route-1", selectedDeploymentId: "deployment-1" });
    expect(afterMutation?.attempts[0].deployment).toMatchObject({ providerId: "provider-1", profileId: "profile-1", modelId: "model-1" });
  });

  it("rejects terminal and same-state transitions, immutable patches, and invalid input", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-contract-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const nextTask = task("task-contract");
    await repository.createTask(nextTask);
    await expect(repository.createTask({ ...nextTask, id: "bad-input", input: { ...nextTask.input, sha256: "prompt" } })).rejects.toMatchObject({ code: "EXECUTION_HISTORY_CORRUPT" });
    await expect(repository.transitionTask(nextTask.id, 1, { state: "created" })).rejects.toMatchObject({ code: "EXECUTION_INVALID_TRANSITION" });
    await repository.transitionTask(nextTask.id, 1, { state: "failed", completedAt: clock.now() }, clock.now());
    await expect(repository.transitionTask(nextTask.id, 2, { state: "failed" }, clock.now())).rejects.toMatchObject({ code: "EXECUTION_INVALID_TRANSITION" });
    await expect(repository.transitionTask(nextTask.id, 2, { state: "running", id: "tampered" } as never, clock.now())).rejects.toMatchObject({ code: "EXECUTION_HISTORY_CORRUPT" });
  });

  it("serializes concurrent transitions using one expected revision", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-race-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const nextTask = task("task-race");
    await repository.createTask(nextTask);
    const results = await Promise.allSettled([
      repository.transitionTask(nextTask.id, 1, { state: "running" }, clock.now()),
      repository.transitionTask(nextTask.id, 1, { state: "failed" }, clock.now())
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const recovered = await createJsonExecutionRepository({ dataDirectory, clock }).get(nextTask.id);
    expect(recovered?.task.revision).toBe(2);
  });

  it("keeps old sessions empty and delete removes execution history without copying it", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-lifecycle-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    await expect(repository.list("old-session")).resolves.toMatchObject({ tasks: [] });
    await repository.createTask(task("task-delete"));
    await repository.delete("session-1");
    await expect(repository.list("session-1")).resolves.toMatchObject({ tasks: [] });
    await expect(repository.list("fork-session")).resolves.toMatchObject({ tasks: [] });
  });

  it("rejects a JSONL transition that attempts to mutate immutable fields", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-corrupt-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    await repository.createTask(task("task-corrupt"));
    const file = path.join(dataDirectory, "executions", `${encodeURIComponent("session-1")}.jsonl`);
    await appendFile(file, `${JSON.stringify({ formatVersion: 1, type: "task-transition", occurredAt: clock.now(), taskId: "task-corrupt", revision: 2, patch: { state: "running", input: { transcriptEventId: "secret", sha256: "b".repeat(64) } } })}\n`);
    await expect(repository.list("session-1")).rejects.toMatchObject({ code: "EXECUTION_HISTORY_CORRUPT" });
  });

  it("rejects malformed records and patches with one repository error", async () => {
    const malformedRecords: unknown[] = [
      { formatVersion: 1, type: "task-transition", occurredAt: clock.now(), taskId: "task-1", revision: 2, patch: { state: "running", unexpected: true } },
      { formatVersion: 1, type: "task-transition", occurredAt: clock.now(), taskId: "task-1", revision: 2, patch: null },
      { formatVersion: 1, type: "task-created", occurredAt: clock.now() },
      { formatVersion: 1, type: "attempt-created", occurredAt: clock.now() },
      { formatVersion: 2, type: "task-created", occurredAt: clock.now(), task: task() },
      { formatVersion: 1, type: "unknown", occurredAt: clock.now() },
      null
    ];
    for (const record of malformedRecords) {
      const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-shape-"));
      directories.push(dataDirectory);
      const file = path.join(dataDirectory, "executions", `${encodeURIComponent("session-1")}.jsonl`);
      await mkdir(path.dirname(file), { recursive: true });
      await appendFile(file, `${JSON.stringify(record)}\n`);
      const repository = createJsonExecutionRepository({ dataDirectory, clock });
      await expect(repository.list("session-1")).rejects.toMatchObject({ code: "EXECUTION_HISTORY_CORRUPT" });
    }
  });

  it("rejects an attempt raw immutable patch instead of mutating its deployment snapshot", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-attempt-corrupt-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const nextTask = task("task-attempt-corrupt");
    await repository.createTask(nextTask);
    await repository.createAttempt(attempt(nextTask.id));
    const file = path.join(dataDirectory, "executions", `${encodeURIComponent("session-1")}.jsonl`);
    await appendFile(file, `${JSON.stringify({ formatVersion: 1, type: "attempt-transition", occurredAt: clock.now(), taskId: nextTask.id, attemptId: "attempt-1", revision: 2, patch: { state: "running", deployment: { deploymentId: "tampered" } } })}\n`);
    await expect(repository.list("session-1")).rejects.toMatchObject({ code: "EXECUTION_HISTORY_CORRUPT" });
  });

  it("rejects route and failure records with extra runtime fields", async () => {
    const routeDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-route-extra-"));
    directories.push(routeDirectory);
    const routeTask = task("task-route-extra");
    (routeTask.resolvedRoute as unknown as Record<string, unknown>).credentialRef = "route-secret-canary";
    const routeFile = path.join(routeDirectory, "executions", `${encodeURIComponent("session-1")}.jsonl`);
    await mkdir(path.dirname(routeFile), { recursive: true });
    await appendFile(routeFile, `${JSON.stringify({ formatVersion: 1, type: "task-created", occurredAt: clock.now(), task: routeTask })}\n`);
    await expect(createJsonExecutionRepository({ dataDirectory: routeDirectory, clock }).list("session-1")).rejects.toMatchObject({ code: "EXECUTION_HISTORY_CORRUPT" });

    const failureDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-failure-extra-"));
    directories.push(failureDirectory);
    const failureRepository = createJsonExecutionRepository({ dataDirectory: failureDirectory, clock });
    const failureTask = task("task-failure-extra");
    await failureRepository.createTask(failureTask);
    await failureRepository.createAttempt(attempt(failureTask.id));
    const failureFile = path.join(failureDirectory, "executions", `${encodeURIComponent("session-1")}.jsonl`);
    await appendFile(failureFile, `${JSON.stringify({ formatVersion: 1, type: "attempt-transition", occurredAt: clock.now(), taskId: failureTask.id, attemptId: "attempt-1", revision: 2, patch: { state: "running", failure: { code: "BAD", class: "unknown", message: "bad", credentialRef: "failure-secret-canary" } } })}\n`);
    await expect(failureRepository.list("session-1")).rejects.toMatchObject({ code: "EXECUTION_HISTORY_CORRUPT" });
  });

  it("redacts failure secret canaries before writing and preserves safe failure fields", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-failure-redaction-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const nextTask = task("task-failure-redaction");
    await repository.createTask(nextTask);
    await repository.createAttempt(attempt(nextTask.id));
    await repository.transitionAttempt(nextTask.id, "attempt-1", 1, { state: "running" }, clock.now());
    const canaryMessage = "credentialRef=canary-credential Authorization: Bearer canary-bearer prompt=canary-prompt secret=canary-secret token=canary-token key=canary-key env=canary-env";
    await repository.transitionAttempt(nextTask.id, "attempt-1", 2, {
      state: "failed",
      completedAt: clock.now(),
      failure: { code: "PROVIDER_AUTH_FAILED", class: "authentication", message: canaryMessage, phase: "request", fallbackEligible: false },
      sideEffect: { state: "clean", evidenceEventIds: [] }
    }, clock.now());

    const file = path.join(dataDirectory, "executions", `${encodeURIComponent("session-1")}.jsonl`);
    const source = await readFile(file, "utf8");
    expect(source).not.toContain("canary-");
    const recovered = await createJsonExecutionRepository({ dataDirectory, clock }).get(nextTask.id);
    expect(recovered?.attempts[0].failure).toMatchObject({ code: "PROVIDER_AUTH_FAILED", class: "authentication", phase: "request", fallbackEligible: false });
    expect(recovered?.attempts[0].failure?.message).not.toContain("canary-");
  });

  it("waits for a queued append before deleting a session file", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-delete-queue-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const nextTask = task("task-delete-queue");
    await repository.createTask(nextTask);
    let releaseAppend!: () => void;
    let appendStarted!: () => void;
    const started = new Promise<void>((resolve) => { appendStarted = resolve; });
    const blocked = new Promise<void>((resolve) => { releaseAppend = resolve; });
    const originalAppendFile = fs.appendFile.bind(fs);
    vi.spyOn(fs, "appendFile").mockImplementation(async (...args) => {
      appendStarted();
      await blocked;
      return originalAppendFile(...args);
    });

    const pendingAppend = repository.transitionTask(nextTask.id, 1, { state: "running" }, clock.now());
    await started;
    const pendingDelete = repository.delete("session-1");
    const queuedTransition = repository.transitionTask(nextTask.id, 1, { state: "failed" }, clock.now());
    releaseAppend();
    await pendingAppend;
    await pendingDelete;
    await expect(queuedTransition).rejects.toMatchObject({ code: "EXECUTION_NOT_FOUND" });
    await expect(repository.list("session-1")).resolves.toMatchObject({ tasks: [] });
  });

  it("orders a queued create before delete so the final delete cannot be revived", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-delete-create-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    await repository.createTask(task("task-delete-create-base"));
    let releaseAppend!: () => void;
    let appendStarted!: () => void;
    const started = new Promise<void>((resolve) => { appendStarted = resolve; });
    const blocked = new Promise<void>((resolve) => { releaseAppend = resolve; });
    const originalAppendFile = fs.appendFile.bind(fs);
    vi.spyOn(fs, "appendFile").mockImplementation(async (...args) => {
      appendStarted();
      await blocked;
      return originalAppendFile(...args);
    });
    const pendingCreate = repository.createTask(task("task-delete-create-queued"));
    await started;
    const pendingDelete = repository.delete("session-1");
    releaseAppend();
    await pendingCreate;
    await pendingDelete;
    await expect(repository.list("session-1")).resolves.toMatchObject({ tasks: [] });
  });

  it("orders public append with delete on the same session queue", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "cli-gui-execution-delete-public-append-"));
    directories.push(dataDirectory);
    const repository = createJsonExecutionRepository({ dataDirectory, clock });
    const nextTask = task("task-delete-public-append");
    await repository.createTask(nextTask);
    let releaseAppend!: () => void;
    let appendStarted!: () => void;
    const started = new Promise<void>((resolve) => { appendStarted = resolve; });
    const blocked = new Promise<void>((resolve) => { releaseAppend = resolve; });
    const originalAppendFile = fs.appendFile.bind(fs);
    vi.spyOn(fs, "appendFile").mockImplementation(async (...args) => {
      appendStarted();
      await blocked;
      return originalAppendFile(...args);
    });
    const pendingAppend = repository.append({ formatVersion: 1, type: "task-transition", occurredAt: clock.now(), taskId: nextTask.id, revision: 2, patch: { state: "running" } });
    await started;
    const pendingDelete = repository.delete("session-1");
    releaseAppend();
    await pendingAppend;
    await pendingDelete;
    await expect(repository.list("session-1")).resolves.toMatchObject({ tasks: [] });
  });
});
