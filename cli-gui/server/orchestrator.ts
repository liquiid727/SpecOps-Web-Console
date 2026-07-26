import { WebSocket } from "ws";
import { ApiHttpError } from "./api-errors.js";
import type { Clock, Logger, OrchestratorCallbacks, PreparedLaunch, PtyProcess, PtyRuntime, RuntimeOrchestrator, TurnInput } from "./ports.js";

export const MAX_TERMINAL_COLS = 500;
export const MAX_TERMINAL_ROWS = 200;
const PTY_TRANSCRIPT_FLUSH_MS = 75;
const MAX_PTY_TRANSCRIPT_BYTES = 64 * 1024;
const MAX_TERMINAL_BUFFERED_BYTES = 1 * 1024 * 1024;

type Worker = {
  process: PtyProcess;
  clients: Set<WebSocket>;
  generation: number;
  pendingTranscript: string;
  transcriptTimer?: ReturnType<typeof setTimeout>;
  transcriptFlush: Promise<void>;
};

export interface RuntimeOrchestratorDependencies {
  ptyRuntime: PtyRuntime;
  clock: Clock;
  logger: Logger;
  callbacks: OrchestratorCallbacks;
}

export function clampDimension(value: unknown, minimum: number, maximum: number) {
  if (value === undefined) return minimum === 20 ? 100 : 30;
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isFinite(value)) throw new ApiHttpError(400, "VALIDATION_FAILED", "Terminal dimensions must be integers.");
  return Math.min(maximum, Math.max(minimum, value));
}

export function createRuntimeOrchestrator(dependencies: RuntimeOrchestratorDependencies): RuntimeOrchestrator {
  const { ptyRuntime, clock, logger, callbacks } = dependencies;
  const workers = new Map<string, Worker>();
  const workerGenerations = new Map<string, number>();
  const startLocks = new Map<string, Promise<void>>();
  let closing = false;

  function queuePtyTranscript(sessionId: string, worker: Worker, data: string) {
    worker.pendingTranscript += data;
    if (Buffer.byteLength(worker.pendingTranscript, "utf8") >= MAX_PTY_TRANSCRIPT_BYTES) {
      if (worker.transcriptTimer !== undefined) clearTimeout(worker.transcriptTimer);
      worker.transcriptTimer = undefined;
      enqueuePtyTranscriptFlush(sessionId, worker);
      return;
    }
    if (worker.transcriptTimer === undefined) {
      worker.transcriptTimer = setTimeout(() => {
        worker.transcriptTimer = undefined;
        enqueuePtyTranscriptFlush(sessionId, worker);
      }, PTY_TRANSCRIPT_FLUSH_MS);
    }
  }

  function enqueuePtyTranscriptFlush(sessionId: string, worker: Worker) {
    worker.transcriptFlush = worker.transcriptFlush.catch(() => undefined).then(async () => {
      const raw = worker.pendingTranscript;
      worker.pendingTranscript = "";
      if (raw) await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "pty_output", source: "pty", raw });
    });
    void worker.transcriptFlush.catch((error) => logger.warn("PTY transcript flush failed", { sessionId, error: String(error) }));
  }

  async function flushPtyTranscript(sessionId: string, worker: Worker) {
    if (worker.transcriptTimer !== undefined) clearTimeout(worker.transcriptTimer);
    worker.transcriptTimer = undefined;
    if (worker.pendingTranscript) enqueuePtyTranscriptFlush(sessionId, worker);
    await worker.transcriptFlush;
  }

  function broadcastTerminal(sessionId: string, message: unknown) {
    const worker = workers.get(sessionId);
    if (!worker) return;
    const encoded = JSON.stringify(message);
    for (const client of worker.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (client.bufferedAmount > MAX_TERMINAL_BUFFERED_BYTES) {
        client.close(1013, "terminal client is behind");
        worker.clients.delete(client);
        continue;
      }
      client.send(encoded);
    }
  }

  async function finishExit(sessionId: string, generation: number, exitCode: number) {
    const worker = workers.get(sessionId);
    if (!worker || worker.generation !== generation) return;
    if (!callbacks.hasSession(sessionId)) {
      workers.delete(sessionId);
      return;
    }
    await flushPtyTranscript(sessionId, worker);
    broadcastTerminal(sessionId, { type: "runtime-status", status: "stopped", exitCode });
    workers.delete(sessionId);
    await callbacks.onRuntimeStatus(sessionId, "stopped", { exitCode });
  }

  return {
    async start(sessionId, prepare, terminal) {
      if (workers.has(sessionId)) return;
      const pending = startLocks.get(sessionId);
      if (pending) return pending;
      const operation = (async () => {
        if (workers.has(sessionId)) return;
        const plan: PreparedLaunch = await prepare();
        const dimensions = { cols: clampDimension(terminal?.cols, 20, MAX_TERMINAL_COLS), rows: clampDimension(terminal?.rows, 5, MAX_TERMINAL_ROWS) };
        await callbacks.onRuntimeStatus(sessionId, "starting");
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session starting.", metadata: { status: "starting" } });
        try {
          const process = ptyRuntime.spawn({
            command: plan.command,
            args: plan.args,
            name: "xterm-256color",
            cols: dimensions.cols,
            rows: dimensions.rows,
            cwd: plan.cwd,
            env: { ...plan.env, TERM: "xterm-256color" }
          });
          const generation = (workerGenerations.get(sessionId) ?? 0) + 1;
          workerGenerations.set(sessionId, generation);
          const worker: Worker = { process, clients: new Set<WebSocket>(), generation, pendingTranscript: "", transcriptFlush: Promise.resolve() };
          workers.set(sessionId, worker);
          process.onData((data) => {
            if (closing || workers.get(sessionId)?.generation !== generation) return;
            broadcastTerminal(sessionId, { type: "terminal-output", data });
            queuePtyTranscript(sessionId, worker, data);
            callbacks.onActivity(sessionId);
          });
          process.onExit(({ exitCode }) => {
            if (closing || workers.get(sessionId)?.generation !== generation) return;
            void finishExit(sessionId, generation, exitCode);
          });
          await callbacks.onRuntimeStatus(sessionId, "running");
          broadcastTerminal(sessionId, { type: "runtime-status", status: "running" });
          await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session running.", metadata: { status: "running" } });
        } catch (error) {
          const worker = workers.get(sessionId);
          if (worker) {
            await flushPtyTranscript(sessionId, worker);
            workers.delete(sessionId);
            try { worker.process.kill(); } catch { /* process already exited */ }
          }
          await callbacks.onRuntimeStatus(sessionId, "error");
          throw error instanceof ApiHttpError ? error : new ApiHttpError(422, "SESSION_START_FAILED", "Failed to start the session.", undefined, { cause: error });
        }
      })();
      startLocks.set(sessionId, operation);
      try {
        return await operation;
      } finally {
        if (startLocks.get(sessionId) === operation) startLocks.delete(sessionId);
      }
    },
    async stop(sessionId) {
      const pending = startLocks.get(sessionId);
      if (pending) await pending.catch(() => undefined);
      const worker = workers.get(sessionId);
      if (!worker) return false;
      if (callbacks.hasSession(sessionId)) await flushPtyTranscript(sessionId, worker);
      workers.delete(sessionId);
      broadcastTerminal(sessionId, { type: "runtime-status", status: "stopped" });
      try { worker.process.kill(); } catch (error) { logger.warn("PTY stop failed", { sessionId, error: String(error) }); }
      return true;
    },
    async submitTurn(_sessionId: string, _input: TurnInput): Promise<{ turnId: string }> {
      throw new Error("Chat turns are not implemented yet.");
    },
    async cancelTurn(_sessionId: string, _turnId: string): Promise<void> {
      throw new Error("Chat turns are not implemented yet.");
    },
    async respondApproval(_sessionId: string, _approvalId: string, _decision: "allow" | "deny"): Promise<void> {
      throw new Error("Approvals are not implemented yet.");
    },
    isRunning(sessionId) {
      return workers.has(sessionId);
    },
    writeTerminal(sessionId, data) {
      const worker = workers.get(sessionId);
      if (!worker) throw new Error("Session has no running worker.");
      worker.process.write(data);
    },
    resizeTerminal(sessionId, cols, rows) {
      const worker = workers.get(sessionId);
      if (!worker) return;
      worker.process.resize(clampDimension(cols, 20, MAX_TERMINAL_COLS), clampDimension(rows, 5, MAX_TERMINAL_ROWS));
    },
    attachTerminalClient(sessionId, client) {
      workers.get(sessionId)?.clients.add(client);
    },
    detachTerminalClient(sessionId, client) {
      workers.get(sessionId)?.clients.delete(client);
    },
    runningCount() {
      return workers.size;
    },
    beginShutdown() {
      closing = true;
    },
    async shutdown() {
      closing = true;
      const stoppedSessionIds: string[] = [];
      for (const [sessionId, worker] of workers) {
        if (callbacks.hasSession(sessionId)) await flushPtyTranscript(sessionId, worker);
        for (const client of worker.clients) client.close(1001, "server shutting down");
        try { worker.process.kill(); } catch { /* process already exited */ }
        stoppedSessionIds.push(sessionId);
      }
      workers.clear();
      return stoppedSessionIds;
    }
  };
}
