import { spawn, type ChildProcess } from "node:child_process";
import { WebSocket } from "ws";
import { ApiHttpError } from "./api-errors.js";
import { PersistentRuntimeUnavailableError } from "./ports.js";
import type { Clock, Logger, OrchestratorCallbacks, PersistentTurnHandle, PreparedLaunch, PtyProcess, PtyRuntime, RuntimeOrchestrator, TurnInput, TurnParseResult } from "./ports.js";
import type { AgentEvent, AgentTurnHandle, TranscriptEvent, TranscriptEventKind, TranscriptEventMetadataValue, TranscriptEventSource } from "../shared/types.js";

export const MAX_TERMINAL_COLS = 500;
export const MAX_TERMINAL_ROWS = 200;
const PTY_TRANSCRIPT_FLUSH_MS = 75;
const MAX_PTY_TRANSCRIPT_BYTES = 64 * 1024;
const MAX_TERMINAL_BUFFERED_BYTES = 1 * 1024 * 1024;
/** 崩溃诊断用：保留最近若干字符的 PTY 输出，作为进程异常退出时的错误信息（runtime-orchestrator-spec §5 失败透传） */
const MAX_RECENT_OUTPUT_CHARS = 8_000;
const DEFAULT_TURN_TIMEOUT_MS = 600_000;
const DEFAULT_APPROVAL_TIMEOUT_MS = 300_000;
const DEFAULT_CANCEL_GRACE_MS = 2_000;
const MAX_TURN_STDERR_CHARS = 2_000;

type TerminalWorker = {
  kind: "terminal";
  process: PtyProcess;
  clients: Set<WebSocket>;
  generation: number;
  pendingTranscript: string;
  /** 最近 PTY 输出环形缓冲（崩溃诊断）；仅保留末尾，避免内存无限增长 */
  recentOutput: string;
  terminatedByUs: boolean;
  transcriptTimer?: ReturnType<typeof setTimeout>;
  transcriptFlush: Promise<void>;
};

/** chat 轮次运行时对象，不入 state.json（决策 D-10） */
type ActiveTurn = {
  turnId: string;
  child?: ChildProcess;
  /** 常驻运行时轮次句柄（streaming-spec §3.4）；存在时 kill 路径优先作用于它 */
  persistentHandle?: PersistentTurnHandle;
  /** AgentBackend 轮次句柄（MVP02 issue-062）：取消/审批由 backend handle 转发，事件流已规范化。 */
  backendHandle?: AgentTurnHandle;
  terminationReason?: "cancelled" | "timeout";
  timeoutTimer?: ReturnType<typeof setTimeout>;
  killTimer?: ReturnType<typeof setTimeout>;
  /** 轮次超时暂停/恢复记账（审批挂起期间暂停计时，runtime-orchestrator-spec §3.4） */
  timeoutRemainingMs?: number;
  timeoutArmedAt?: number;
  /** 挂起中的审批（单挂起）；存在即轮次处于 waiting_approval */
  pendingApproval?: { approvalId: string; timer: ReturnType<typeof setTimeout> };
  /** Adapter 声明的审批应答 stdin 格式；Orchestrator 不理解 CLI 语义 */
  approvalResponder?: (approvalId: string, decision: "allow" | "deny") => string;
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
  /** 审批超时（SPECOS_APPROVAL_TIMEOUT_MS，默认 300000）；超时视同拒绝，轮次走超时失败路径 */
  approvalTimeoutMs?: number;
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
  const approvalTimeoutMs = dependencies.approvalTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS;
  const cancelGraceMs = dependencies.cancelGraceMs ?? DEFAULT_CANCEL_GRACE_MS;
  const workers = new Map<string, Worker>();
  const workerGenerations = new Map<string, number>();
  const startLocks = new Map<string, Promise<void>>();
  let closing = false;

  function queuePtyTranscript(sessionId: string, worker: TerminalWorker, data: string) {
    worker.pendingTranscript += data;
    worker.recentOutput += data;
    if (Buffer.byteLength(worker.recentOutput, "utf8") > MAX_RECENT_OUTPUT_CHARS) {
      worker.recentOutput = worker.recentOutput.slice(-MAX_RECENT_OUTPUT_CHARS);
    }
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
    // 进程异常退出（非 0 且非我们主动终止）→ 会话失败态 + 错误事件，避免被误判为「已停止」（runtime-orchestrator-spec §5）
    const crashed = typeof exitCode === "number" && exitCode !== 0 && !worker.terminatedByUs;
    const recentOutput = worker.recentOutput.trim();
    const crashMessage = crashed
      ? `CLI process exited with code ${exitCode}.${recentOutput ? `\n\n${recentOutput}` : ""}`
      : undefined;
    broadcastTerminal(sessionId, crashed
      ? { type: "runtime-status", status: "error", exitCode }
      : { type: "runtime-status", status: "stopped", exitCode });
    workers.delete(sessionId);
    if (crashed) {
      await callbacks.appendEvent(sessionId, {
        occurredAt: clock.now(),
        kind: "error",
        source: "session-manager",
        raw: crashMessage ?? "Failed to start the session.",
        metadata: { code: "SESSION_START_FAILED", exitCode }
      });
    }
    await callbacks.onRuntimeStatus(sessionId, crashed ? "error" : "stopped", { exitCode, errorMessage: crashMessage });
  }

  /** 取消/超时共用 kill 路径：SIGTERM → 宽限期 → SIGKILL；首个终态请求胜出（竞态单终态） */
  function requestTurnKill(turn: ActiveTurn, reason: "cancelled" | "timeout") {
    if (turn.terminationReason) return;
    turn.terminationReason = reason;
    if (turn.persistentHandle) {
      // 常驻路径：运行时负责终止进程，进程 close → result reject 收敛（streaming-spec §4）
      try { turn.persistentHandle.kill(); } catch { /* process already exited */ }
      return;
    }
    if (turn.backendHandle) {
      void turn.backendHandle.cancel().catch((error) => logger.warn("Backend turn cancel failed", { error: String(error) }));
      return;
    }
    const child = turn.child;
    if (!child) return;
    try { child.kill("SIGTERM"); } catch { /* process already exited */ }
    turn.killTimer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch { /* process already exited */ }
    }, cancelGraceMs);
  }

  /** 轮次超时计时器：武装/暂停成对，审批挂起期间不计入轮次超时（§3.4） */
  function armTurnTimeout(turn: ActiveTurn, remainingMs: number) {
    turn.timeoutRemainingMs = remainingMs;
    turn.timeoutArmedAt = Date.now();
    turn.timeoutTimer = setTimeout(() => requestTurnKill(turn, "timeout"), remainingMs);
  }

  function pauseTurnTimeout(turn: ActiveTurn) {
    if (turn.timeoutTimer !== undefined) clearTimeout(turn.timeoutTimer);
    turn.timeoutTimer = undefined;
    const elapsed = Date.now() - (turn.timeoutArmedAt ?? Date.now());
    turn.timeoutRemainingMs = Math.max(1, (turn.timeoutRemainingMs ?? turnTimeoutMs) - elapsed);
  }

  /** 进入 waiting_approval：暂停轮次超时，启动审批超时计时（单挂起：已有挂起审批时忽略后续请求） */
  function enterWaitingApproval(sessionId: string, turn: ActiveTurn, approvalId: string) {
    if (turn.pendingApproval || turn.terminationReason) return;
    pauseTurnTimeout(turn);
    turn.pendingApproval = {
      approvalId,
      timer: setTimeout(() => { void expireApproval(sessionId, turn, approvalId); }, approvalTimeoutMs)
    };
    callbacks.onTurnStatus?.(sessionId, turn.turnId, "waiting_approval");
  }

  /** 落 approval_response 事件并清除挂起状态；同步清除在前，防止 respond/超时双结算 */
  async function settleApproval(sessionId: string, turn: ActiveTurn, decision: "allow" | "deny" | "timeout", extraMetadata?: Record<string, string>) {
    const pending = turn.pendingApproval;
    if (!pending) return undefined;
    turn.pendingApproval = undefined;
    clearTimeout(pending.timer);
    await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "approval_response", source: "session-manager", raw: decision, metadata: { approvalId: pending.approvalId, decision, turnId: turn.turnId, ...extraMetadata } });
    return pending.approvalId;
  }

  /** 审批超时：approval_response(timeout) → 走取消 kill 路径、轮次以超时失败收尾（§3.4） */
  async function expireApproval(sessionId: string, turn: ActiveTurn, approvalId: string) {
    if (turn.pendingApproval?.approvalId !== approvalId) return;
    await settleApproval(sessionId, turn, "timeout", { code: "APPROVAL_TIMEOUT" });
    requestTurnKill(turn, "timeout");
  }

  async function runTurn(sessionId: string, worker: ChatWorker, turn: ActiveTurn, input: TurnInput): Promise<void> {
    type TurnOutcome =
      | { status: "completed"; exitCode: number }
      | { status: "cancelled"; exitCode: number }
      | { status: "failed"; code: "TURN_FAILED" | "TURN_TIMEOUT" | "TURN_SPAWN_FAILED"; message: string; exitCode: number };
    const finishTurn = async (outcome: TurnOutcome) => {
      if (turn.pendingApproval) { clearTimeout(turn.pendingApproval.timer); turn.pendingApproval = undefined; }
      if (turn.timeoutTimer !== undefined) clearTimeout(turn.timeoutTimer);
      if (turn.killTimer !== undefined) clearTimeout(turn.killTimer);
      turn.timeoutTimer = undefined;
      turn.killTimer = undefined;
      if (worker.activeTurn === turn) worker.activeTurn = undefined;
      if (closing || !callbacks.hasSession(sessionId)) return;
      if (outcome.status === "completed") {
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Turn completed.", metadata: { status: "turn-completed", turnId: turn.turnId, exitCode: outcome.exitCode } });
        callbacks.onTurnStatus?.(sessionId, turn.turnId, "completed");
      } else if (outcome.status === "cancelled") {
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Turn cancelled.", metadata: { status: "turn-cancelled", turnId: turn.turnId, exitCode: outcome.exitCode } });
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "error", source: "session-manager", raw: "Turn cancelled by user.", metadata: { code: "TURN_CANCELLED", turnId: turn.turnId } });
        callbacks.onTurnStatus?.(sessionId, turn.turnId, "cancelled");
      } else {
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "lifecycle", source: "session-manager", raw: "Turn failed.", metadata: { status: "turn-failed", turnId: turn.turnId, exitCode: outcome.exitCode } });
        await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "error", source: "session-manager", raw: outcome.message, metadata: { code: outcome.code, turnId: turn.turnId } });
        callbacks.onTurnStatus?.(sessionId, turn.turnId, "failed");
      }
    };

    async function appendAgentEvent(event: AgentEvent) {
      if (closing || turn.terminationReason !== undefined) return;
      if (event.kind === "text_delta") {
        if (event.text) callbacks.onTurnDelta?.(sessionId, turn.turnId, event.text);
        return;
      }
      const mapped = toTranscriptEvent(event, turn.turnId);
      await callbacks.appendEvent(sessionId, mapped);
      callbacks.onActivity(sessionId);
      if (event.kind === "approval_request" && typeof event.metadata?.approvalId === "string" && turn.backendHandle?.approve) {
        enterWaitingApproval(sessionId, turn, event.metadata.approvalId);
      }
    }

    if (input.runBackend) {
      let handle: AgentTurnHandle;
      try {
        handle = await input.runBackend();
      } catch (error) {
        await finishTurn({ status: "failed", code: "TURN_SPAWN_FAILED", message: `Failed to open the backend turn: ${error instanceof Error ? error.message : String(error)}`, exitCode: -1 });
        return;
      }
      turn.backendHandle = handle;
      armTurnTimeout(turn, turnTimeoutMs);
      let eventFailure: unknown;
      const eventPump = (async () => {
        for await (const event of handle.events) await appendAgentEvent(event);
      })().catch((error) => { eventFailure = error; });
      let backendResult;
      let backendFailure: unknown;
      try {
        backendResult = await handle.result;
      } catch (error) {
        backendFailure = error;
      }
      await eventPump;
      if (eventFailure !== undefined) logger.warn("Backend event stream failed", { sessionId, turnId: turn.turnId, error: String(eventFailure) });
      if (turn.terminationReason === "cancelled" || backendResult?.status === "cancelled") {
        await finishTurn({ status: "cancelled", exitCode: -1 });
        return;
      }
      if (turn.terminationReason === "timeout") {
        await finishTurn({ status: "failed", code: "TURN_TIMEOUT", message: `Turn timed out after ${turnTimeoutMs}ms.`, exitCode: -1 });
        return;
      }
      if (backendFailure !== undefined || backendResult?.status === "failed") {
        const error = backendResult?.error;
        await finishTurn({
          status: "failed",
          code: "TURN_FAILED",
          message: error?.message ?? (backendFailure instanceof Error ? backendFailure.message : backendFailure !== undefined ? String(backendFailure) : "Backend turn failed."),
          exitCode: -1
        });
        return;
      }
      await finishTurn({ status: "completed", exitCode: 0 });
      if (backendResult?.nativeSessionId && !closing && callbacks.hasSession(sessionId)) {
        await callbacks.onRuntimeStatus(sessionId, "running", { resumeToken: backendResult.nativeSessionId });
      }
      return;
    }

    let plan: PreparedLaunch;
    try {
      if (!input.buildCommand || !input.parseOutput) throw new Error("Turn input is missing legacy command execution callbacks.");
      plan = await input.buildCommand();
    } catch (error) {
      await finishTurn({ status: "failed", code: "TURN_SPAWN_FAILED", message: `Failed to build the turn command: ${error instanceof Error ? error.message : String(error)}`, exitCode: -1 });
      return;
    }

    // 常驻运行时优先（streaming-spec §3.4）：启动前不可用 → 同轮回落下方 spawn 路径
    if (input.runPersistent) {
      let handle: PersistentTurnHandle | undefined;
      try {
        handle = input.runPersistent({
          async onEvent(event) {
            if (closing || turn.terminationReason !== undefined) return;
            await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: event.kind, source: event.source, raw: event.raw, metadata: { ...event.metadata, turnId: turn.turnId } });
            callbacks.onActivity(sessionId);
          },
          onDelta(delta) {
            if (closing || turn.terminationReason !== undefined) return;
            callbacks.onTurnDelta?.(sessionId, turn.turnId, delta);
          }
        });
      } catch (error) {
        if (!(error instanceof PersistentRuntimeUnavailableError)) {
          await finishTurn({ status: "failed", code: "TURN_SPAWN_FAILED", message: error instanceof Error ? error.message : String(error), exitCode: -1 });
          return;
        }
        logger.info("Persistent runtime unavailable; falling back to spawn path", { sessionId, turnId: turn.turnId, reason: error.message });
      }
      if (handle) {
        turn.persistentHandle = handle;
        turn.timeoutTimer = undefined;
        armTurnTimeout(turn, turnTimeoutMs);
        let persistentResult: TurnParseResult | undefined;
        let persistentFailure: unknown;
        try {
          persistentResult = await handle.result;
        } catch (error) {
          persistentFailure = error;
        }
        if (turn.terminationReason === "cancelled") {
          await finishTurn({ status: "cancelled", exitCode: -1 });
          return;
        }
        if (turn.terminationReason === "timeout") {
          await finishTurn({ status: "failed", code: "TURN_TIMEOUT", message: `Turn timed out after ${turnTimeoutMs}ms.`, exitCode: -1 });
          return;
        }
        if (persistentFailure !== undefined) {
          if (persistentFailure instanceof PersistentRuntimeUnavailableError) {
            logger.info("Persistent runtime setup failed; falling back to spawn path", {
              sessionId,
              turnId: turn.turnId,
              reason: persistentFailure.message
            });
          } else {
            await finishTurn({
              status: "failed",
              code: "TURN_FAILED",
              message: persistentFailure instanceof Error ? persistentFailure.message : String(persistentFailure),
              exitCode: -1
            });
            return;
          }
        } else {
          if (persistentResult?.resumeToken && !closing && callbacks.hasSession(sessionId)) {
            await callbacks.onRuntimeStatus(sessionId, "running", { resumeToken: persistentResult.resumeToken });
          }
          await finishTurn({ status: "completed", exitCode: 0 });
          return;
        }
      }
    }

    const child = spawn(plan.command, plan.args, { cwd: plan.cwd, env: plan.env, stdio: ["pipe", "pipe", "pipe"] });
    turn.approvalResponder = input.buildApprovalResponse;
    // headless 轮次的 prompt 完全经 argv 传递；无审批应答通道时立即关闭 stdin（EOF），避免 CLI 等待额外 stdin 输入而挂起；
    // 支持审批的 profile 保持 stdin 开放以回写决定（runtime-orchestrator-spec §3.4）
    if (!input.buildApprovalResponse) child.stdin?.end();
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
    turn.timeoutTimer = undefined;
    armTurnTimeout(turn, turnTimeoutMs);

    let parseResult: TurnParseResult = {};
    try {
      const iterator = input.parseOutput!(child.stdout!, {
        onDelta(delta) {
          if (closing || turn.terminationReason !== undefined) return;
          callbacks.onTurnDelta?.(sessionId, turn.turnId, delta);
        }
      });
      let next = await iterator.next();
      while (!next.done) {
        if (!closing && turn.terminationReason === undefined) {
          const event = next.value;
          await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: event.kind, source: event.source, raw: event.raw, metadata: { ...event.metadata, turnId: turn.turnId } });
          callbacks.onActivity(sessionId);
          // 审批挂起（§3.4）：仅当 Adapter 声明了应答通道才进入等待；无通道时事件照常透传、不挂起
          if (event.kind === "approval_request" && typeof event.metadata?.approvalId === "string" && input.buildApprovalResponse) {
            enterWaitingApproval(sessionId, turn, event.metadata.approvalId);
          }
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
    // 轮次成功才回写 resumeToken（domain-spec §2.1：失败轮不回写）
    // 先于 finishTurn 写入，确保 turn-completed 生命周期事件发出时 session 状态已一致
    if (parseResult.resumeToken && !closing && callbacks.hasSession(sessionId)) {
      await callbacks.onRuntimeStatus(sessionId, "running", { resumeToken: parseResult.resumeToken });
    }
    await finishTurn({ status: "completed", exitCode: 0 });
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
          const worker: TerminalWorker = { kind: "terminal", process, clients: new Set<WebSocket>(), generation, pendingTranscript: "", recentOutput: "", terminatedByUs: false, transcriptFlush: Promise.resolve() };
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
          // 挂起审批按 deny 落 approval_response 后走取消路径（runtime-orchestrator-spec §6 边界表）
          if (turn.pendingApproval) await settleApproval(sessionId, turn, "deny");
          requestTurnKill(turn, "cancelled");
          await turn.done.catch(() => undefined);
        }
        workers.delete(sessionId);
        return true;
      }
      if (callbacks.hasSession(sessionId)) await flushPtyTranscript(sessionId, worker);
      workers.delete(sessionId);
      worker.terminatedByUs = true;
      broadcastTerminal(sessionId, { type: "runtime-status", status: "stopped" });
      try { worker.process.kill(); } catch (error) { logger.warn("PTY stop failed", { sessionId, error: String(error) }); }
      return true;
    },
    async submitTurn(sessionId: string, input: TurnInput): Promise<{ turnId: string; event: TranscriptEvent }> {
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
      const event = await callbacks.appendEvent(sessionId, { occurredAt: clock.now(), kind: "user_message", source: "composer", raw: input.prompt, metadata: { turnId: input.turnId }, clientMessageId: input.clientMessageId });
      // 与 terminal messages 分支对齐：落盘失败则不启动轮次（单一事实源，回放可重建）
      if (!event) throw new ApiHttpError(500, "TRANSCRIPT_WRITE_FAILED", "Message could not be recorded.");
      const turn: ActiveTurn = { turnId: input.turnId, done: Promise.resolve() };
      worker.activeTurn = turn;
      callbacks.onTurnStatus?.(sessionId, input.turnId, "running");
      turn.done = runTurn(sessionId, worker, turn, input).catch((error) => {
        logger.warn("Turn execution failed unexpectedly", { sessionId, turnId: input.turnId, error: String(error) });
        if (worker.activeTurn === turn) worker.activeTurn = undefined;
      });
      return { turnId: input.turnId, event };
    },
    async cancelTurn(sessionId: string, turnId: string): Promise<void> {
      const worker = workers.get(sessionId);
      if (worker && worker.kind === "terminal") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "Chat turns are not available for terminal sessions.");
      const turn = worker?.activeTurn;
      if (!turn || turn.turnId !== turnId) throw new ApiHttpError(409, "TURN_NOT_ACTIVE", "The requested turn is not in progress.");
      // waiting_approval 中收到 cancelTurn：挂起审批按 deny 落 approval_response，再走取消路径（取消优先于审批）
      if (turn.pendingApproval) await settleApproval(sessionId, turn, "deny");
      requestTurnKill(turn, "cancelled");
      await turn.done;
    },
    async respondApproval(sessionId: string, approvalId: string, decision: "allow" | "deny"): Promise<void> {
      const worker = workers.get(sessionId);
      const turn = worker?.kind === "chat" ? worker.activeTurn : undefined;
      // 已应答/已超时/不存在/非挂起中轮次 → 409（api-spec §2.5）
      if (!turn || turn.pendingApproval?.approvalId !== approvalId) throw new ApiHttpError(409, "APPROVAL_NOT_PENDING", "No pending approval matches this request.");
      // 事件先落盘，再按 Adapter 声明的格式回写子进程 stdin，恢复计时回到 running（§3.4）
      await settleApproval(sessionId, turn, decision);
      const payload = turn.approvalResponder?.(approvalId, decision);
      const child = turn.child;
      if (turn.backendHandle?.approve) {
        try { await turn.backendHandle.approve(approvalId, decision); } catch (error) { logger.warn("Backend approval response failed", { sessionId, approvalId, error: String(error) }); }
      } else if (payload !== undefined && child?.stdin && !child.stdin.destroyed) {
        try { child.stdin.write(payload); } catch (error) { logger.warn("Approval response write failed", { sessionId, approvalId, error: String(error) }); }
      }
      armTurnTimeout(turn, turn.timeoutRemainingMs ?? turnTimeoutMs);
      callbacks.onTurnStatus?.(sessionId, turn.turnId, "running");
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

function toTranscriptEvent(event: AgentEvent, turnId: string): {
  occurredAt: string;
  kind: TranscriptEventKind;
  source: TranscriptEventSource;
  raw: string;
  metadata?: Record<string, TranscriptEventMetadataValue>;
} {
  const metadata = { ...event.metadata, turnId } as Record<string, TranscriptEventMetadataValue>;
  const raw = event.text ?? String(event.metadata?.vendorType ?? event.kind);
  switch (event.kind) {
    case "assistant_message":
      return { occurredAt: event.occurredAt, kind: "assistant_message", source: "profile-adapter", raw, metadata };
    case "tool":
    case "command":
    case "progress":
    case "usage":
      return { occurredAt: event.occurredAt, kind: "tool_activity", source: "profile-adapter", raw, metadata: { ...metadata, tool: String(event.metadata?.tool ?? event.metadata?.name ?? event.kind) } };
    case "file_change":
      return { occurredAt: event.occurredAt, kind: "file_change", source: "profile-adapter", raw, metadata };
    case "approval_request":
      return { occurredAt: event.occurredAt, kind: "approval_request", source: "profile-adapter", raw, metadata };
    case "approval_result":
      return { occurredAt: event.occurredAt, kind: "approval_response", source: "profile-adapter", raw, metadata };
    case "error":
      return { occurredAt: event.occurredAt, kind: "error", source: "profile-adapter", raw, metadata };
    case "completed":
    case "cancelled":
      return { occurredAt: event.occurredAt, kind: "lifecycle", source: "profile-adapter", raw, metadata };
    case "diagnostic":
      if (event.metadata?.compatibilityKind === "pty_output") return { occurredAt: event.occurredAt, kind: "pty_output", source: "pty", raw, metadata };
      return { occurredAt: event.occurredAt, kind: "lifecycle", source: "profile-adapter", raw, metadata };
    case "text_delta":
      return { occurredAt: event.occurredAt, kind: "assistant_message", source: "profile-adapter", raw, metadata };
  }
}
