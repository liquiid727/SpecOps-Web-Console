import { spawn, type ChildProcess } from "node:child_process";
import { WebSocket } from "ws";
import { ApiHttpError } from "./api-errors.js";
import type { Clock, Logger, OrchestratorCallbacks, PreparedLaunch, PtyProcess, PtyRuntime, RuntimeOrchestrator, TurnInput, TurnParseResult } from "./ports.js";

export const MAX_TERMINAL_COLS = 500;
export const MAX_TERMINAL_ROWS = 200;
const PTY_TRANSCRIPT_FLUSH_MS = 75;
const MAX_PTY_TRANSCRIPT_BYTES = 64 * 1024;
const MAX_TERMINAL_BUFFERED_BYTES = 1 * 1024 * 1024;
const DEFAULT_TURN_TIMEOUT_MS = 600_000;
const DEFAULT_CANCEL_GRACE_MS = 2_000;
const MAX_TURN_STDERR_CHARS = 2_000;

type TerminalWorker = {
  kind: "terminal";
  process: PtyProcess;
  clients: Set<WebSocket>;
  generation: number;
  pendingTranscript: string;
  transcriptTimer?: ReturnType<typeof setTimeout>;
  transcriptFlush: Promise<void>;
};

/** chat 轮次运行时对象，不入 state.json（决策 D-10） */
type ActiveTurn = {
  turnId: string;
  child?: ChildProcess;
  terminationReason?: "cancelled" | "timeout";
  timeoutTimer?: ReturnType<typeof setTimeout>;
  killTimer?: ReturnType<typeof setTimeout>;
  done: Promise<void>;
};

/** chat Worker：轮次间空闲驻留，running ≠ 有子进程存活（runtime-orchestrator-spec §3） */
type ChatWorker = {
  kind: "chat";
  activeTurn?: ActiveTurn;
};

type Worker = TerminalWorker | ChatWorker;

export interface RuntimeOrchestratorDependencies {
  ptyRuntime: PtyRuntime;
  clock: Clock;
  logger: Logger;
  callbacks: OrchestratorCallbacks;
  /** 轮次超时（SPECOS_TURN_TIMEOUT_MS，默认 600000） */
  turnTimeoutMs?: number;
  /** 取消 SIGTERM → SIGKILL 宽限期（默认 2000ms） */
  cancelGraceMs?: number;
}

export function clampDimension(value: unknown, minimum: number, maximum: number) {
  if (value === undefined) return minimum === 20 ? 100 : 30;
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isFinite(value)) throw new ApiHttpError(400, "VALIDATION_FAILED", "Terminal dimensions must be integers.");
  return Math.min(maximum, Math.max(minimum, value));
}

export function createRuntimeOrchestrator(dependencies: RuntimeOrchestratorDependencies): RuntimeOrchestrator {
  const { ptyRuntime, clock, logger, callbacks } = dependencies;
  const turnTimeoutMs = dependencies.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS;
  const cancelGraceMs = dependencies.cancelGraceMs ?? DEFAULT_CANCEL_GRACE_MS;
  const workers = new Map<string, Worker>();
  const workerGenerations = new Map<string, number>();
  const startLocks = new Map<string, Promise<void>>();
  let closing = false;

  function queuePtyTranscript(sessionId: string, worker: TerminalWorker, data: string) {
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

  function enqueuePtyTranscriptFlush(sessionId: string, worker: TerminalWorker) {
    worker.transcriptFlush = worker.transcriptFlush.catch(() => undefined).then(async () => {
      const raw = worker.pendingTranscript;
      worker.pendingTranscript = "";
      if (raw) await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "pty_output", source: "pty", raw });
    });
    void worker.transcriptFlush.catch((error) => logger.warn("PTY transcript flush failed", { sessionId, error: String(error) }));
  }

  async function flushPtyTranscript(sessionId: string, worker: TerminalWorker) {
    if (worker.transcriptTimer !== undefined) clearTimeout(worker.transcriptTimer);
    worker.transcriptTimer = undefined;
    if (worker.pendingTranscript) enqueuePtyTranscriptFlush(sessionId, worker);
    await worker.transcriptFlush;
  }

  function broadcastTerminal(sessionId: string, message: unknown) {
    const worker = workers.get(sessionId);
    if (!worker || worker.kind !== "terminal") return;
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
    if (!worker || worker.kind !== "terminal" || worker.generation !== generation) return;
    if (!callbacks.hasSession(sessionId)) {
      workers.delete(sessionId);
      return;
    }
    await flushPtyTranscript(sessionId, worker);
    broadcastTerminal(sessionId, { type: "runtime-status", status: "stopped", exitCode });
    workers.delete(sessionId);
    await callbacks.onRuntimeStatus(sessionId, "stopped", { exitCode });
  }

  /** 取消/超时共用 kill 路径：SIGTERM → 宽限期 → SIGKILL；首个终态请求胜出（竞态单终态） */
  function requestTurnKill(turn: ActiveTurn, reason: "cancelled" | "timeout") {
    if (turn.terminationReason) return;
    turn.terminationReason = reason;
    const child = turn.child;
    if (!child) return;
    try { child.kill("SIGTERM"); } catch { /* process already exited */ }
    turn.killTimer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch { /* process already exited */ }
    }, cancelGraceMs);
  }

  async function runTurn(sessionId: string, worker: ChatWorker, turn: ActiveTurn, input: TurnInput): Promise<void> {
    type TurnOutcome =
      | { status: "completed"; exitCode: number }
      | { status: "cancelled"; exitCode: number }
      | { status: "failed"; code: "TURN_FAILED" | "TURN_TIMEOUT" | "TURN_SPAWN_FAILED"; message: string; exitCode: number };
    const finishTurn = async (outcome: TurnOutcome) => {
      if (turn.timeoutTimer !== undefined) clearTimeout(turn.timeoutTimer);
      if (turn.killTimer !== undefined) clearTimeout(turn.killTimer);
      turn.timeoutTimer = undefined;
      turn.killTimer = undefined;
      if (worker.activeTurn === turn) worker.activeTurn = undefined;
      if (closing || !callbacks.hasSession(sessionId)) return;
      if (outcome.status === "completed") {
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Turn completed.", metadata: { status: "turn-completed", turnId: turn.turnId, exitCode: outcome.exitCode } });
      } else if (outcome.status === "cancelled") {
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Turn cancelled.", metadata: { status: "turn-cancelled", turnId: turn.turnId, exitCode: outcome.exitCode } });
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "error", source: "session-manager", raw: "Turn cancelled by user.", metadata: { code: "TURN_CANCELLED", turnId: turn.turnId } });
      } else {
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Turn failed.", metadata: { status: "turn-failed", turnId: turn.turnId, exitCode: outcome.exitCode } });
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "error", source: "session-manager", raw: outcome.message, metadata: { code: outcome.code, turnId: turn.turnId } });
      }
    };

    let plan: PreparedLaunch;
    try {
      plan = await input.buildCommand();
    } catch (error) {
      await finishTurn({ status: "failed", code: "TURN_SPAWN_FAILED", message: `Failed to build the turn command: ${error instanceof Error ? error.message : String(error)}`, exitCode: -1 });
      return;
    }

    const child = spawn(plan.command, plan.args, { cwd: plan.cwd, env: plan.env, stdio: ["pipe", "pipe", "pipe"] });
    turn.child = child;
    let stderrSummary = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderrSummary.length < MAX_TURN_STDERR_CHARS) stderrSummary += chunk.toString("utf8").slice(0, MAX_TURN_STDERR_CHARS - stderrSummary.length);
    });
    const exitOutcome = new Promise<{ type: "exit"; exitCode: number } | { type: "spawn-error"; error: Error }>((resolve) => {
      child.once("error", (error) => {
        child.stdout?.destroy();
        child.stderr?.destroy();
        resolve({ type: "spawn-error", error });
      });
      child.once("close", (code) => resolve({ type: "exit", exitCode: code ?? -1 }));
    });
    turn.timeoutTimer = setTimeout(() => requestTurnKill(turn, "timeout"), turnTimeoutMs);

    let parseResult: TurnParseResult = {};
    try {
      const iterator = input.parseOutput(child.stdout!);
      let next = await iterator.next();
      while (!next.done) {
        if (!closing && turn.terminationReason === undefined) {
          const event = next.value;
          await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: event.kind, source: event.source, raw: event.raw, metadata: { ...event.metadata, turnId: turn.turnId } });
          callbacks.onActivity(sessionId);
        }
        next = await iterator.next();
      }
      parseResult = next.value ?? {};
    } catch (error) {
      logger.warn("Turn output parsing failed", { sessionId, turnId: turn.turnId, error: String(error) });
    }

    const outcome = await exitOutcome;
    const exitCode = outcome.type === "exit" ? outcome.exitCode : -1;
    if (turn.terminationReason === "cancelled") {
      await finishTurn({ status: "cancelled", exitCode });
      return;
    }
    if (turn.terminationReason === "timeout") {
      await finishTurn({ status: "failed", code: "TURN_TIMEOUT", message: `Turn timed out after ${turnTimeoutMs}ms.`, exitCode });
      return;
    }
    if (outcome.type === "spawn-error") {
      await finishTurn({ status: "failed", code: "TURN_SPAWN_FAILED", message: outcome.error.message || String(outcome.error), exitCode: -1 });
      return;
    }
    if (outcome.exitCode !== 0) {
      await finishTurn({ status: "failed", code: "TURN_FAILED", message: stderrSummary.trim() || `Turn failed with exit code ${outcome.exitCode}.`, exitCode: outcome.exitCode });
      return;
    }
    await finishTurn({ status: "completed", exitCode: 0 });
    // 轮次成功才回写 resumeToken（domain-spec §2.1：失败轮不回写）
    if (parseResult.resumeToken && !closing && callbacks.hasSession(sessionId)) {
      await callbacks.onRuntimeStatus(sessionId, "running", { resumeToken: parseResult.resumeToken });
    }
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
          const worker: TerminalWorker = { kind: "terminal", process, clients: new Set<WebSocket>(), generation, pendingTranscript: "", transcriptFlush: Promise.resolve() };
          workers.set(sessionId, worker);
          process.onData((data) => {
            const current = workers.get(sessionId);
            if (closing || current?.kind !== "terminal" || current.generation !== generation) return;
            broadcastTerminal(sessionId, { type: "terminal-output", data });
            queuePtyTranscript(sessionId, worker, data);
            callbacks.onActivity(sessionId);
          });
          process.onExit(({ exitCode }) => {
            const current = workers.get(sessionId);
            if (closing || current?.kind !== "terminal" || current.generation !== generation) return;
            void finishExit(sessionId, generation, exitCode);
          });
          await callbacks.onRuntimeStatus(sessionId, "running");
          broadcastTerminal(sessionId, { type: "runtime-status", status: "running" });
          await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session running.", metadata: { status: "running" } });
        } catch (error) {
          const worker = workers.get(sessionId);
          if (worker && worker.kind === "terminal") {
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
      if (worker.kind === "chat") {
        // 进行中轮次先取消（SIGTERM→SIGKILL），事件序：error(turn) → lifecycle(stopped)（后者由 Session Manager 追加）
        const turn = worker.activeTurn;
        if (turn) {
          requestTurnKill(turn, "cancelled");
          await turn.done.catch(() => undefined);
        }
        workers.delete(sessionId);
        return true;
      }
      if (callbacks.hasSession(sessionId)) await flushPtyTranscript(sessionId, worker);
      workers.delete(sessionId);
      broadcastTerminal(sessionId, { type: "runtime-status", status: "stopped" });
      try { worker.process.kill(); } catch (error) { logger.warn("PTY stop failed", { sessionId, error: String(error) }); }
      return true;
    },
    async submitTurn(sessionId: string, input: TurnInput): Promise<{ turnId: string }> {
      if (closing) throw new ApiHttpError(409, "INTERNAL_ERROR", "Server is shutting down.");
      const existing = workers.get(sessionId);
      if (existing && existing.kind === "terminal") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "Chat turns are not available for terminal sessions.");
      if (existing?.activeTurn) throw new ApiHttpError(409, "TURN_IN_PROGRESS", "A turn is already in progress for this session.");
      let worker = existing;
      if (!worker) {
        // chat Worker 首次提交时创建并驻留；running ≠ 有子进程存活
        worker = { kind: "chat", activeTurn: undefined };
        workers.set(sessionId, worker);
        await callbacks.onRuntimeStatus(sessionId, "running");
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session running.", metadata: { status: "running" } });
      }
      await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "user_message", source: "composer", raw: input.prompt, metadata: { turnId: input.turnId }, clientMessageId: input.clientMessageId });
      const turn: ActiveTurn = { turnId: input.turnId, done: Promise.resolve() };
      worker.activeTurn = turn;
      turn.done = runTurn(sessionId, worker, turn, input).catch((error) => {
        logger.warn("Turn execution failed unexpectedly", { sessionId, turnId: input.turnId, error: String(error) });
        if (worker.activeTurn === turn) worker.activeTurn = undefined;
      });
      return { turnId: input.turnId };
    },
    async cancelTurn(sessionId: string, turnId: string): Promise<void> {
      const worker = workers.get(sessionId);
      if (worker && worker.kind === "terminal") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "Chat turns are not available for terminal sessions.");
      const turn = worker?.activeTurn;
      if (!turn || turn.turnId !== turnId) throw new ApiHttpError(409, "TURN_NOT_ACTIVE", "The requested turn is not in progress.");
      requestTurnKill(turn, "cancelled");
      await turn.done;
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
      if (worker.kind !== "terminal") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "Terminal input is not available for chat sessions.");
      worker.process.write(data);
    },
    resizeTerminal(sessionId, cols, rows) {
      const worker = workers.get(sessionId);
      if (!worker || worker.kind !== "terminal") return;
      worker.process.resize(clampDimension(cols, 20, MAX_TERMINAL_COLS), clampDimension(rows, 5, MAX_TERMINAL_ROWS));
    },
    attachTerminalClient(sessionId, client) {
      const worker = workers.get(sessionId);
      if (worker?.kind === "terminal") worker.clients.add(client);
    },
    detachTerminalClient(sessionId, client) {
      const worker = workers.get(sessionId);
      if (worker?.kind === "terminal") worker.clients.delete(client);
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
        if (worker.kind === "chat") {
          const child = worker.activeTurn?.child;
          if (child) { try { child.kill("SIGKILL"); } catch { /* process already exited */ } }
          if (worker.activeTurn?.timeoutTimer !== undefined) clearTimeout(worker.activeTurn.timeoutTimer);
          if (worker.activeTurn?.killTimer !== undefined) clearTimeout(worker.activeTurn.killTimer);
          stoppedSessionIds.push(sessionId);
          continue;
        }
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
