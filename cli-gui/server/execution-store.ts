import fs from "node:fs/promises";
import path from "node:path";
import { canTransitionAttempt, canTransitionTask, type ExecutionAttempt, type ExecutionRecord, type ExecutionSnapshot, type ExecutionTask } from "../shared/execution-attempt.js";
import type { Clock, ExecutionRepository } from "./ports.js";

export class ExecutionRepositoryError extends Error {
  constructor(readonly code: "EXECUTION_HISTORY_CORRUPT" | "EXECUTION_NOT_FOUND" | "EXECUTION_REVISION_CONFLICT" | "EXECUTION_INVALID_TRANSITION" | "READONLY_MODE", message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ExecutionRepositoryError";
  }
}

const queues = new Map<string, Promise<void>>();

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
  const appendRecord = async (sessionId: string, record: ExecutionRecord) => {
    ensureWritable();
    const target = fileFor(sessionId);
    const previous = queues.get(target) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      await fs.mkdir(executionDirectory, { recursive: true });
      await fs.appendFile(target, `${JSON.stringify(record)}\n`, "utf8");
    });
    queues.set(target, next);
    try { await next; } finally { if (queues.get(target) === next) queues.delete(target); }
  };

  async function readRecords(sessionId: string): Promise<ExecutionRecord[]> {
    const target = fileFor(sessionId);
    const source = await fs.readFile(target, "utf8").catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
      throw error;
    });
    if (!source) return [];
    const lines = source.split("\n");
    const hasCompleteTail = source.endsWith("\n");
    if (!hasCompleteTail) lines.pop();
    const records: ExecutionRecord[] = [];
    for (const [index, line] of lines.entries()) {
      if (!line.trim()) continue;
      try {
        const value = JSON.parse(line) as ExecutionRecord;
        if (!value || value.formatVersion !== 1 || typeof value.type !== "string") throw new Error("invalid record");
        records.push(value);
      } catch (error) {
        throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Execution history is corrupt at record ${index + 1}.`, { cause: error });
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
        snapshot.attempts.push(structuredClone({ ...record.attempt, revision: record.attempt.revision ?? 1 }));
        snapshot.attempts.sort((left, right) => left.ordinal - right.ordinal);
      } else if (record.type === "task-transition") {
        const snapshot = snapshots.get(record.taskId);
        if (!snapshot) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Task ${record.taskId} transition has no task.`);
        if (snapshot.task.revision !== record.revision - 1) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Task ${record.taskId} revision is not append-only.`);
        if (record.patch.state && !canTransitionTask(snapshot.task.state, record.patch.state)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Task ${record.taskId} has an illegal transition.`);
        Object.assign(snapshot.task, structuredClone(record.patch), { revision: record.revision });
      } else if (record.type === "attempt-transition") {
        const snapshot = snapshots.get(record.taskId);
        const attempt = snapshot?.attempts.find((candidate) => candidate.id === record.attemptId);
        if (!snapshot || !attempt) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Attempt ${record.attemptId} transition has no attempt.`);
        if (attempt.revision !== record.revision - 1) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Attempt ${record.attemptId} revision is not append-only.`);
        if (record.patch.state && !canTransitionAttempt(attempt.state, record.patch.state)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Attempt ${record.attemptId} has an illegal transition.`);
        Object.assign(attempt, structuredClone(record.patch), { revision: record.revision });
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
      const sessionId = record.type === "task-created" ? record.task.sessionId : record.type === "attempt-created" ? (await findTask(record.attempt.taskId))?.found.task.sessionId : (await findTask(record.taskId))?.found.task.sessionId;
      if (!sessionId) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
      await appendRecord(sessionId, record);
    },
    async createTask(task) {
      if ((task.revision ?? 0) < 1) throw new ExecutionRepositoryError("EXECUTION_REVISION_CONFLICT", "Task revision must start at one.");
      if ((await snapshot(task.sessionId)).some((item) => item.task.id === task.id)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Task ${task.id} already exists.`);
      await appendRecord(task.sessionId, { formatVersion: 1, type: "task-created", occurredAt: clock.now(), task: structuredClone(task) });
    },
    async createAttempt(attempt) {
      const found = await findTask(attempt.taskId);
      if (!found) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
      if (found.found.attempts.some((candidate) => candidate.id === attempt.id)) throw new ExecutionRepositoryError("EXECUTION_HISTORY_CORRUPT", `Attempt ${attempt.id} already exists.`);
      await appendRecord(found.sessionId, { formatVersion: 1, type: "attempt-created", occurredAt: clock.now(), attempt: structuredClone({ ...attempt, revision: attempt.revision ?? 1 }) });
    },
    async transitionTask(taskId, expectedRevision, patch, occurredAt) {
      const found = await findTask(taskId);
      if (!found) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution task not found.");
      if (found.found.task.revision !== expectedRevision) throw new ExecutionRepositoryError("EXECUTION_REVISION_CONFLICT", "Execution task revision conflict.");
      if (!canTransitionTask(found.found.task.state, patch.state)) throw new ExecutionRepositoryError("EXECUTION_INVALID_TRANSITION", "Execution task transition is not allowed.");
      const revision = expectedRevision + 1;
      await appendRecord(found.sessionId, { formatVersion: 1, type: "task-transition", occurredAt, taskId, revision, patch: structuredClone(patch) });
      return { ...found.found.task, ...structuredClone(patch), revision };
    },
    async transitionAttempt(taskId, attemptId, expectedRevision, patch, occurredAt) {
      const found = await findTask(taskId);
      const attempt = found?.found.attempts.find((candidate) => candidate.id === attemptId);
      if (!found || !attempt) throw new ExecutionRepositoryError("EXECUTION_NOT_FOUND", "Execution attempt not found.");
      if (attempt.revision !== expectedRevision) throw new ExecutionRepositoryError("EXECUTION_REVISION_CONFLICT", "Execution attempt revision conflict.");
      if (!canTransitionAttempt(attempt.state, patch.state)) throw new ExecutionRepositoryError("EXECUTION_INVALID_TRANSITION", "Execution attempt transition is not allowed.");
      const revision = expectedRevision + 1;
      await appendRecord(found.sessionId, { formatVersion: 1, type: "attempt-transition", occurredAt, taskId, attemptId, revision, patch: structuredClone(patch) });
      return { ...attempt, ...structuredClone(patch), revision };
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
      await fs.rm(fileFor(sessionId), { force: true });
    },
    async drain() {
      await Promise.all([...queues.values()]);
    }
  };
  return repository;
}
