import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRuntimeOrchestrator } from "./orchestrator.js";
import { PersistentRuntimeUnavailableError } from "./ports.js";
import type { AppendEventInput, ParsedTurnEvent, PersistentTurnHandle, PersistentTurnHandlers, PtyProcess, TurnInput, TurnParseResult } from "./ports.js";

// —— fake CLI 脚本（test-spec §3.6：server 集成，假 CLI 驱动，不依赖真实 codex）——
let fixtureDir = "";
let echoScript = "";
let sleepScript = "";
let stubbornScript = "";
let crashScript = "";
let approvalScript = "";

beforeAll(async () => {
  fixtureDir = await mkdtemp(path.join(tmpdir(), "orchestrator-fake-cli-"));
  echoScript = path.join(fixtureDir, "echo.cjs");
  sleepScript = path.join(fixtureDir, "sleep.cjs");
  stubbornScript = path.join(fixtureDir, "stubborn.cjs");
  crashScript = path.join(fixtureDir, "crash.cjs");
  approvalScript = path.join(fixtureDir, "approval.cjs");
  await writeFile(echoScript, 'const token = process.argv[2] || "t-1";\nconsole.log("assistant says hi");\nconsole.log("token:" + token);\n');
  await writeFile(sleepScript, 'console.log("still working");\nsetTimeout(() => {}, Number(process.argv[2] || "5000"));\n');
  await writeFile(stubbornScript, 'process.on("SIGTERM", () => {});\nconsole.log("stubborn working");\nsetInterval(() => {}, 1000);\n');
  await writeFile(crashScript, 'process.stderr.write("boom: fake cli exploded\\n");\nprocess.exit(3);\n');
  // 审批场景假 CLI：先发 approval_request 行，等待 stdin 决定；无 stdin 应答通道时 stdin EOF 直接完成
  await writeFile(approvalScript, [
    'process.stdout.write("approval:app-1\\n");',
    'let buffered = "";',
    'process.stdin.on("end", () => { console.log("no approval channel"); process.exit(0); });',
    'process.stdin.on("data", (chunk) => {',
    '  buffered += chunk.toString("utf8");',
    '  const index = buffered.indexOf("\\n");',
    '  if (index === -1) return;',
    '  const line = buffered.slice(0, index).trim();',
    '  if (line === "decision:allow") console.log("approved work done");',
    '  else console.log("denied politely");',
    '  process.exit(0);',
    '});',
    ''
  ].join("\n"));
});

afterAll(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

type RecordedEvent = AppendEventInput & { sessionId: string };
type RecordedStatus = { sessionId: string; status: string; extra?: { exitCode?: number; resumeToken?: string } };

function createHarness(options?: { turnTimeoutMs?: number; approvalTimeoutMs?: number; cancelGraceMs?: number; ptyProcess?: PtyProcess }) {
  const events: RecordedEvent[] = [];
  const loggerCalls: { level: string; metadata?: Record<string, unknown> }[] = [];
  const statusCalls: RecordedStatus[] = [];
  const turnStatuses: { sessionId: string; turnId: string; status: string }[] = [];
  const turnDeltas: { sessionId: string; turnId: string; delta: string }[] = [];
  const orchestrator = createRuntimeOrchestrator({
    ptyRuntime: {
      spawn() {
        if (!options?.ptyProcess) throw new Error("PTY runtime is not exercised by this test");
        return options.ptyProcess;
      },
      async shutdown() {}
    },
    clock: { now: () => new Date().toISOString() },
    logger: {
      info(_message, metadata) { loggerCalls.push({ level: "info", metadata }); },
      warn(_message, metadata) { loggerCalls.push({ level: "warn", metadata }); },
      error(_message, metadata) { loggerCalls.push({ level: "error", metadata }); }
    },
    turnTimeoutMs: options?.turnTimeoutMs,
    approvalTimeoutMs: options?.approvalTimeoutMs,
    cancelGraceMs: options?.cancelGraceMs,
    callbacks: {
      async appendEvent(sessionId, input) {
        events.push({ sessionId, ...input });
        return { id: `event-${events.length}`, sessionId, sequence: events.length, occurredAt: input.occurredAt, kind: input.kind, source: input.source, raw: input.raw, rawBytes: Buffer.byteLength(input.raw, "utf8"), truncated: false, metadata: input.metadata, clientMessageId: input.clientMessageId };
      },
      async onRuntimeStatus(sessionId, status, extra) {
        statusCalls.push({ sessionId, status, extra });
      },
      onActivity() {},
      hasSession: () => true,
      onTurnStatus(sessionId, turnId, status) {
        turnStatuses.push({ sessionId, turnId, status });
      },
      onTurnDelta(sessionId, turnId, delta) {
        turnDeltas.push({ sessionId, turnId, delta });
      }
    }
  });
  return { orchestrator, events, statusCalls, turnStatuses, turnDeltas, loggerCalls };
}

// 行协议：普通行 → assistant_message；"token:x" 行 → resumeToken（多次取最后）
async function* parseLines(stdout: Readable): AsyncGenerator<ParsedTurnEvent, TurnParseResult, void> {
  const result: TurnParseResult = {};
  let buffered = "";
  const emit = (line: string): ParsedTurnEvent | undefined => {
    if (!line.trim()) return undefined;
    if (line.startsWith("token:")) {
      result.resumeToken = line.slice("token:".length).trim();
      return undefined;
    }
    if (line.startsWith("approval:")) {
      return { kind: "approval_request", source: "profile-adapter", raw: line, metadata: { approvalId: line.slice("approval:".length).trim() } };
    }
    return { kind: "assistant_message", source: "profile-adapter", raw: line };
  };
  for await (const chunk of stdout) {
    buffered += chunk.toString("utf8");
    let index = buffered.indexOf("\n");
    while (index !== -1) {
      const event = emit(buffered.slice(0, index));
      buffered = buffered.slice(index + 1);
      if (event) yield event;
      index = buffered.indexOf("\n");
    }
  }
  const tail = emit(buffered);
  if (tail) yield tail;
  return result;
}

function makeTurn(turnId: string, prompt: string, script: string, args: string[] = []): TurnInput {
  return {
    turnId,
    prompt,
    buildCommand: async () => ({ command: process.execPath, args: [script, ...args], cwd: fixtureDir, env: { PATH: process.env.PATH ?? "" } }),
    parseOutput: parseLines
  };
}

// 带审批应答通道的轮次：Adapter 声明 stdin 决定格式（ports.TurnInput.buildApprovalResponse）
function makeApprovalTurn(turnId: string, prompt: string, script: string): TurnInput {
  return { ...makeTurn(turnId, prompt, script), buildApprovalResponse: (_approvalId, decision) => `decision:${decision}\n` };
}

async function waitFor(predicate: () => boolean, timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const turnEnded = (events: RecordedEvent[], turnId: string) =>
  events.some((event) => event.kind === "lifecycle" && typeof event.metadata?.status === "string" && String(event.metadata.status).startsWith("turn-") && event.metadata?.turnId === turnId);

describe("runtime orchestrator chat turns", () => {
  it("marks a completed backend result as failed when its event stream gaps", async () => {
    const { orchestrator } = createHarness();
    await orchestrator.submitTurn("backend-gap", {
      turnId: "turn-gap",
      prompt: "stream gap",
      runBackend: async () => ({
        events: (async function* () {
          yield { kind: "assistant_message" as const, occurredAt: new Date().toISOString(), text: "partial" };
          throw new Error("stream secret=stream-canary");
        })(),
        result: Promise.resolve({ status: "completed" as const }),
        cancel: async () => undefined
      })
    });
    const result = await orchestrator.waitForTurn("backend-gap", "turn-gap");
    expect(result).toMatchObject({ status: "failed", sideEffect: { state: "unknown" } });
  });

  it("marks parser failures as parse failures with unknown side effects", async () => {
    const { orchestrator } = createHarness();
    await orchestrator.submitTurn("parse-gap", {
      turnId: "turn-parse-gap",
      prompt: "parse gap",
      buildCommand: async () => ({ command: process.execPath, args: ["-e", "process.exit(0)"], cwd: fixtureDir, env: {} }),
      parseOutput: async function* () {
        throw new Error("parser prompt=parse-canary");
      }
    });
    const result = await orchestrator.waitForTurn("parse-gap", "turn-parse-gap");
    expect(result).toMatchObject({ status: "failed", sideEffect: { state: "unknown" }, error: { code: "TURN_FAILED", phase: "parse" } });
  });

  it("redacts failure canaries before persisting the error transcript", async () => {
    const { orchestrator, events, loggerCalls } = createHarness();
    await orchestrator.submitTurn("transcript-canary", {
      turnId: "turn-transcript-canary",
      prompt: "failure",
      runBackend: async () => {
        return {
          events: (async function* () { throw new Error("backend secret=transcript-canary prompt=hidden"); })(),
          result: Promise.resolve({ status: "completed" as const }),
          cancel: async () => undefined
        };
      }
    });
    await waitFor(() => turnEnded(events, "turn-transcript-canary"));
    const error = events.find((event) => event.kind === "error" && event.metadata?.turnId === "turn-transcript-canary");
    expect(error?.raw).not.toContain("transcript-canary");
    expect(error?.raw).not.toContain("hidden");
    expect(loggerCalls.every(({ metadata }) => typeof metadata?.error !== "string" || !metadata.error.includes("transcript-canary"))).toBe(true);
  });

  it("treats unknown vendor diagnostics and missing effect declarations conservatively", async () => {
    const { orchestrator } = createHarness();
    await orchestrator.submitTurn("unknown-vendor", {
      turnId: "turn-unknown-vendor",
      prompt: "unknown vendor",
      runBackend: async () => ({
        events: (async function* () {
          yield { kind: "diagnostic" as const, occurredAt: new Date().toISOString(), text: "vendor event", metadata: { code: "UNKNOWN_VENDOR_EVENT" } };
        })(),
        result: Promise.resolve({ status: "completed" as const }),
        cancel: async () => undefined
      })
    });
    await expect(orchestrator.waitForTurn("unknown-vendor", "turn-unknown-vendor")).resolves.toMatchObject({ status: "completed", sideEffect: { state: "unknown" } });

    await orchestrator.submitTurn("missing-effect", {
      turnId: "turn-missing-effect",
      prompt: "missing effect",
      runBackend: async () => ({
        events: (async function* () {
          yield { kind: "tool" as const, occurredAt: new Date().toISOString(), text: "read tool" };
        })(),
        result: Promise.resolve({ status: "completed" as const }),
        cancel: async () => undefined
      })
    });
    await expect(orchestrator.waitForTurn("missing-effect", "turn-missing-effect")).resolves.toMatchObject({ status: "completed", sideEffect: { state: "possible" } });
  });

  it("redacts direct AgentEvent components before transcript persistence", async () => {
    const { orchestrator, events } = createHarness();
    await orchestrator.submitTurn("event-canary", {
      turnId: "turn-event-canary",
      prompt: "canary",
      runBackend: async () => ({
        events: (async function* () {
          yield { kind: "tool" as const, occurredAt: new Date().toISOString(), text: "path=/tmp/project", metadata: { token: "event-token-canary" }, component: { type: "tool" as const, title: "title", text: "prompt=event-prompt-canary", data: { secret: "event-secret-canary", path: "/tmp/project/file.ts" } } };
        })(),
        result: Promise.resolve({ status: "completed" as const }),
        cancel: async () => undefined
      })
    });
    await expect(orchestrator.waitForTurn("event-canary", "turn-event-canary")).resolves.toMatchObject({ status: "completed" });
    const persisted = events.find((event) => event.sessionId === "event-canary" && event.kind === "tool_activity");
    expect(JSON.stringify(persisted)).not.toMatch(/event-token-canary|event-prompt-canary|event-secret-canary/);
    expect(JSON.stringify(persisted)).toContain("/tmp/project/file.ts");
  });

  it("projects compatibility PTY diagnostics into replay output without treating them as assistant text", async () => {
    const { orchestrator, events } = createHarness();
    await orchestrator.submitTurn("backend-session", {
      turnId: "backend-turn-1",
      prompt: "backend prompt",
      runBackend: async () => ({
        events: (async function* () {
          yield {
            kind: "diagnostic" as const,
            occurredAt: new Date().toISOString(),
            text: "cli-raw backend prompt",
            metadata: { code: "COMPATIBILITY_EVENT", compatibilityKind: "pty_output" }
          };
        })(),
        result: Promise.resolve({ status: "completed" as const }),
        cancel: async () => undefined
      })
    });
    await waitFor(() => turnEnded(events, "backend-turn-1"));

    expect(events.some((event) => event.kind === "pty_output" && event.raw === "cli-raw backend prompt")).toBe(true);
    expect(events.some((event) => event.kind === "assistant_message" && event.raw === "cli-raw backend prompt")).toBe(false);
  });

  it("runs multiple sequential turns, streams events, and reports resumeToken on success only", async () => {
    const { orchestrator, events, statusCalls, turnStatuses } = createHarness();
    await orchestrator.submitTurn("s1", makeTurn("turn-1", "first prompt", echoScript, ["thread-1"]));
    await waitFor(() => turnEnded(events, "turn-1"));

    const kinds = events.map((event) => `${event.kind}:${event.metadata?.status ?? event.metadata?.code ?? ""}`);
    expect(kinds).toEqual([
      "lifecycle:running",
      "user_message:",
      "assistant_message:",
      "lifecycle:turn-completed"
    ]);
    const userMessage = events.find((event) => event.kind === "user_message")!;
    expect(userMessage.raw).toBe("first prompt");
    expect(userMessage.metadata?.turnId).toBe("turn-1");
    expect(events.find((event) => event.kind === "assistant_message")!.metadata?.turnId).toBe("turn-1");
    const completed = events.find((event) => event.metadata?.status === "turn-completed")!;
    expect(completed.metadata?.exitCode).toBe(0);
    expect(statusCalls).toContainEqual({ sessionId: "s1", status: "running", extra: { resumeToken: "thread-1" } });
    // turn-status 回调序：running → completed（api-spec §4.2）
    expect(turnStatuses.filter((item) => item.turnId === "turn-1").map((item) => item.status)).toEqual(["running", "completed"]);
    // chat Worker 轮次间驻留：running ≠ 有子进程存活
    expect(orchestrator.isRunning("s1")).toBe(true);
    expect(orchestrator.runningCount()).toBe(1);

    await orchestrator.submitTurn("s1", makeTurn("turn-2", "second prompt", echoScript, ["thread-2"]));
    await waitFor(() => turnEnded(events, "turn-2"));
    expect(statusCalls).toContainEqual({ sessionId: "s1", status: "running", extra: { resumeToken: "thread-2" } });
  });

  it("enforces turn mutual exclusion and allows a new turn after cancellation", async () => {
    const { orchestrator, events } = createHarness();
    await orchestrator.submitTurn("s2", makeTurn("turn-a", "long task", sleepScript, ["5000"]));
    await expect(orchestrator.submitTurn("s2", makeTurn("turn-b", "too early", echoScript))).rejects.toMatchObject({ status: 409, code: "TURN_IN_PROGRESS" });

    await orchestrator.cancelTurn("s2", "turn-a");
    const cancelled = events.find((event) => event.metadata?.status === "turn-cancelled");
    expect(cancelled?.metadata?.turnId).toBe("turn-a");
    const cancelError = events.find((event) => event.kind === "error" && event.metadata?.code === "TURN_CANCELLED");
    expect(cancelError?.metadata?.turnId).toBe("turn-a");
    // 取消后会话保持可用，可立即提交下一轮
    expect(orchestrator.isRunning("s2")).toBe(true);
    await orchestrator.submitTurn("s2", makeTurn("turn-c", "retry", echoScript));
    await waitFor(() => turnEnded(events, "turn-c"));
    expect(events.some((event) => event.metadata?.status === "turn-completed" && event.metadata?.turnId === "turn-c")).toBe(true);
  });

  it("escalates SIGTERM to SIGKILL for a stubborn CLI and rejects stale cancel requests", async () => {
    const { orchestrator, events } = createHarness({ cancelGraceMs: 100 });
    await orchestrator.submitTurn("s3", makeTurn("turn-a", "cancel me", stubbornScript));
    await waitFor(() => events.some((event) => event.kind === "assistant_message" && event.raw === "stubborn working"));

    await expect(orchestrator.cancelTurn("s3", "turn-of-someone-else")).rejects.toMatchObject({ status: 409, code: "TURN_NOT_ACTIVE" });
    await orchestrator.cancelTurn("s3", "turn-a");
    expect(events.some((event) => event.metadata?.status === "turn-cancelled" && event.metadata?.turnId === "turn-a")).toBe(true);
    expect(events.some((event) => event.metadata?.code === "TURN_CANCELLED")).toBe(true);
    // 终态后再取消 → TURN_NOT_ACTIVE
    await expect(orchestrator.cancelTurn("s3", "turn-a")).rejects.toMatchObject({ status: 409, code: "TURN_NOT_ACTIVE" });
  });

  it("times out a hanging turn with TURN_TIMEOUT and keeps the session usable", async () => {
    const { orchestrator, events, statusCalls } = createHarness({ turnTimeoutMs: 200, cancelGraceMs: 100 });
    await orchestrator.submitTurn("s4", makeTurn("turn-a", "hang forever", sleepScript, ["30000"]));
    await waitFor(() => turnEnded(events, "turn-a"));

    expect(events.some((event) => event.metadata?.status === "turn-failed" && event.metadata?.turnId === "turn-a")).toBe(true);
    const timeoutError = events.find((event) => event.kind === "error" && event.metadata?.code === "TURN_TIMEOUT");
    expect(timeoutError?.metadata?.turnId).toBe("turn-a");
    // 失败轮不回写 resumeToken
    expect(statusCalls.every((call) => call.extra?.resumeToken === undefined)).toBe(true);

    await orchestrator.submitTurn("s4", makeTurn("turn-b", "retry after timeout", echoScript));
    await waitFor(() => turnEnded(events, "turn-b"));
    expect(events.some((event) => event.metadata?.status === "turn-completed" && event.metadata?.turnId === "turn-b")).toBe(true);
  });

  it("reports TURN_SPAWN_FAILED for missing executables and allows retry", async () => {
    const { orchestrator, events } = createHarness();
    const broken: TurnInput = {
      turnId: "turn-a",
      prompt: "no binary",
      buildCommand: async () => ({ command: "/nonexistent/fake-cli-binary", args: [], cwd: fixtureDir, env: {} }),
      parseOutput: parseLines
    };
    await orchestrator.submitTurn("s5", broken);
    await waitFor(() => turnEnded(events, "turn-a"));

    expect(events.some((event) => event.metadata?.status === "turn-failed" && event.metadata?.turnId === "turn-a")).toBe(true);
    expect(events.some((event) => event.kind === "error" && event.metadata?.code === "TURN_SPAWN_FAILED")).toBe(true);
    // 会话保持可用可重试
    expect(orchestrator.isRunning("s5")).toBe(true);
    await orchestrator.submitTurn("s5", makeTurn("turn-b", "retry", echoScript));
    await waitFor(() => turnEnded(events, "turn-b"));
    expect(events.some((event) => event.metadata?.status === "turn-completed" && event.metadata?.turnId === "turn-b")).toBe(true);
  });

  it("redacts legacy parsed event canaries at the persistence boundary", async () => {
    const { orchestrator, events } = createHarness();
    await orchestrator.submitTurn("legacy-canary", {
      turnId: "turn-legacy-canary",
      prompt: "legacy",
      buildCommand: async () => ({ command: process.execPath, args: ["-e", "process.exit(0)"], cwd: fixtureDir, env: {} }),
      parseOutput: async function* () {
        yield { kind: "tool_activity", source: "profile-adapter", raw: "prompt=legacy-prompt-canary path=/tmp/project", metadata: { token: "legacy-token-canary" }, component: { type: "tool", text: "secret=legacy-secret-canary", data: { path: "/tmp/project/file.ts" } }, effect: "read" };
        return {};
      }
    });
    await waitFor(() => turnEnded(events, "turn-legacy-canary"));
    const persisted = events.find((event) => event.sessionId === "legacy-canary" && event.kind === "tool_activity");
    expect(JSON.stringify(persisted)).not.toMatch(/legacy-prompt-canary|legacy-token-canary|legacy-secret-canary/);
    expect(JSON.stringify(persisted)).toContain("/tmp/project/file.ts");
  });

  it("marks non-zero exits as turn-failed with a stderr summary and withholds resumeToken", async () => {
    const { orchestrator, events, statusCalls } = createHarness();
    await orchestrator.submitTurn("s6", makeTurn("turn-a", "crash please", crashScript));
    await waitFor(() => turnEnded(events, "turn-a"));

    const failed = events.find((event) => event.metadata?.status === "turn-failed")!;
    expect(failed.metadata?.exitCode).toBe(3);
    const error = events.find((event) => event.kind === "error" && event.metadata?.code === "TURN_FAILED")!;
    expect(error.raw).toContain("boom: fake cli exploded");
    expect(statusCalls.every((call) => call.extra?.resumeToken === undefined)).toBe(true);
  });

  it("rejects chat calls against terminal sessions with INTERACTION_MODE_MISMATCH", async () => {
    const ptyProcess: PtyProcess = { write() {}, resize() {}, kill() {}, onData() {}, onExit() {} };
    const { orchestrator } = createHarness({ ptyProcess });
    await orchestrator.start("s7", async () => ({ command: "/bin/true", args: [], cwd: fixtureDir, env: {} }));
    await expect(orchestrator.submitTurn("s7", makeTurn("turn-a", "wrong mode", echoScript))).rejects.toMatchObject({ status: 400, code: "INTERACTION_MODE_MISMATCH" });
    await expect(orchestrator.cancelTurn("s7", "turn-a")).rejects.toMatchObject({ status: 400, code: "INTERACTION_MODE_MISMATCH" });
  });

  it("cancels the in-flight turn before stopping a chat worker", async () => {
    const { orchestrator, events } = createHarness({ cancelGraceMs: 100 });
    await orchestrator.submitTurn("s8", makeTurn("turn-a", "stop me", sleepScript, ["30000"]));
    const stopped = await orchestrator.stop("s8");
    expect(stopped).toBe(true);
    expect(events.some((event) => event.metadata?.status === "turn-cancelled" && event.metadata?.turnId === "turn-a")).toBe(true);
    expect(events.some((event) => event.metadata?.code === "TURN_CANCELLED")).toBe(true);
    expect(orchestrator.isRunning("s8")).toBe(false);
  });
});

// issue-018：终端会话进程异常退出 → 会话失败态（而非被误判为「已停止」），并捕获崩溃信息（runtime-orchestrator-spec §5）
describe("terminal session crash reporting", () => {
  function createTerminalHarness() {
    const events: RecordedEvent[] = [];
    const statusCalls: RecordedStatus[] = [];
    const orchestrator = createRuntimeOrchestrator({
      ptyRuntime: {
        spawn(options) {
          const { spawn } = require("node:child_process") as typeof import("node:child_process");
          const child = spawn(options.command, options.args, { cwd: options.cwd, env: options.env });
          let dataListener: ((data: string) => void) | undefined;
          let exitListener: ((event: { exitCode: number }) => void) | undefined;
          child.stdout.on("data", (chunk) => dataListener?.(chunk.toString("utf8")));
          child.stderr.on("data", (chunk) => dataListener?.(chunk.toString("utf8")));
          child.on("close", (code) => exitListener?.({ exitCode: code ?? -1 }));
          return {
            write: (data: string) => child.stdin.write(data),
            resize: () => undefined,
            kill: () => { try { child.kill(); } catch { /* already exited */ } },
            onData: (listener) => { dataListener = listener; },
            onExit: (listener) => { exitListener = listener; }
          } satisfies PtyProcess;
        },
        async shutdown() {}
      },
      clock: { now: () => new Date().toISOString() },
      logger: { info() {}, warn() {}, error() {} },
      callbacks: {
        async appendEvent(sessionId, input) {
          events.push({ sessionId, ...input });
          return { id: `event-${events.length}`, sessionId, sequence: events.length, occurredAt: input.occurredAt, kind: input.kind, source: input.source, raw: input.raw, rawBytes: Buffer.byteLength(input.raw, "utf8"), truncated: false, metadata: input.metadata, clientMessageId: input.clientMessageId };
        },
        async onRuntimeStatus(sessionId, status, extra) {
          statusCalls.push({ sessionId, status, extra });
        },
        onActivity() {},
        hasSession: () => true
      }
    });
    return { orchestrator, events, statusCalls };
  }

  it("reports an error status (not stopped) when the CLI process exits non-zero, and captures the stderr", async () => {
    const { orchestrator, events, statusCalls } = createTerminalHarness();
    await orchestrator.start("crash-1", async () => ({ command: process.execPath, args: [crashScript], cwd: fixtureDir, env: { PATH: process.env.PATH ?? "" } }));
    await waitFor(() => statusCalls.some((call) => call.status === "error" || call.status === "stopped"));

    // 异常退出不应被误判为「已停止」
    expect(statusCalls).toContainEqual({ sessionId: "crash-1", status: "error", extra: expect.objectContaining({ exitCode: 3 }) });
    expect(statusCalls.some((call) => call.status === "stopped")).toBe(false);
    // 崩溃信息被捕获为 error 事件，便于前端直接报错
    const errorEvent = events.find((event) => event.kind === "error" && event.metadata?.code === "SESSION_START_FAILED");
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.raw).toContain("boom: fake cli exploded");
    expect(errorEvent!.raw).toContain("exited with code 3");
  });

  it("reports stopped (not error) on a clean zero exit and never flags a process we terminated as error", async () => {
    const { orchestrator, statusCalls } = createTerminalHarness();
    await orchestrator.start("clean-1", async () => ({ command: process.execPath, args: [echoScript], cwd: fixtureDir, env: { PATH: process.env.PATH ?? "" } }));
    await waitFor(() => statusCalls.some((call) => call.status === "stopped"));
    expect(statusCalls.some((call) => call.status === "error")).toBe(false);

    // 主动 stop 标记 terminatedByUs：即使进程随后以非 0 退出，也不应误判为 error（崩溃诊断仅限非我们终止）
    await orchestrator.start("clean-2", async () => ({ command: process.execPath, args: [sleepScript, "30000"], cwd: fixtureDir, env: { PATH: process.env.PATH ?? "" } }));
    await waitFor(() => statusCalls.some((call) => call.status === "running" && call.sessionId === "clean-2"));
    await orchestrator.stop("clean-2");
    // 等待潜在退出事件收敛后，确认 clean-2 未被标为 error
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(statusCalls.filter((call) => call.sessionId === "clean-2").some((call) => call.status === "error")).toBe(false);
  });
});

// issue-012：审批挂起/应答/超时/取消（runtime-orchestrator-spec §3.4，test-spec §3.6）
describe("runtime orchestrator approvals", () => {
  const approvalRequested = (events: RecordedEvent[]) =>
    events.some((event) => event.kind === "approval_request" && event.metadata?.approvalId === "app-1");

  it("suspends on approval_request, pauses the turn timeout, and resumes on allow", async () => {
    // turnTimeoutMs 小于挂起时长：若未暂停计时则必然 TURN_TIMEOUT，据此验证暂停/恢复记账
    const { orchestrator, events, turnStatuses } = createHarness({ turnTimeoutMs: 300 });
    await orchestrator.submitTurn("a1", makeApprovalTurn("turn-1", "approve this", approvalScript));
    await waitFor(() => approvalRequested(events));
    await waitFor(() => turnStatuses.some((item) => item.status === "waiting_approval"));
    // 挂起期间停留超过 turnTimeoutMs，轮次不得超时
    await new Promise((resolve) => setTimeout(resolve, 500));
    // approvalId 不匹配 → 409 APPROVAL_NOT_PENDING
    await expect(orchestrator.respondApproval("a1", "nope", "allow")).rejects.toMatchObject({ status: 409, code: "APPROVAL_NOT_PENDING" });
    await orchestrator.respondApproval("a1", "app-1", "allow");
    await waitFor(() => turnEnded(events, "turn-1"));

    expect(events.some((event) => event.kind === "error" && event.metadata?.code === "TURN_TIMEOUT")).toBe(false);
    expect(events.some((event) => event.metadata?.status === "turn-completed" && event.metadata?.turnId === "turn-1")).toBe(true);
    expect(events.some((event) => event.kind === "assistant_message" && event.raw === "approved work done")).toBe(true);
    const response = events.find((event) => event.kind === "approval_response")!;
    expect(response.metadata).toMatchObject({ approvalId: "app-1", decision: "allow", turnId: "turn-1" });
    // approval_response 事件先于 stdin 回写后的 CLI 输出
    expect(events.findIndex((event) => event.kind === "approval_response")).toBeLessThan(events.findIndex((event) => event.raw === "approved work done"));
    // turn-status 序：running → waiting_approval → running → completed（api-spec §4.2）
    expect(turnStatuses.filter((item) => item.turnId === "turn-1").map((item) => item.status)).toEqual(["running", "waiting_approval", "running", "completed"]);
  });

  it("writes the adapter-declared deny payload to stdin and completes the turn", async () => {
    const { orchestrator, events } = createHarness();
    await orchestrator.submitTurn("a2", makeApprovalTurn("turn-1", "deny this", approvalScript));
    await waitFor(() => approvalRequested(events));
    await orchestrator.respondApproval("a2", "app-1", "deny");
    await waitFor(() => turnEnded(events, "turn-1"));

    expect(events.find((event) => event.kind === "approval_response")!.metadata?.decision).toBe("deny");
    expect(events.some((event) => event.kind === "assistant_message" && event.raw === "denied politely")).toBe(true);
    expect(events.some((event) => event.metadata?.status === "turn-completed" && event.metadata?.turnId === "turn-1")).toBe(true);
  });

  it("expires an unanswered approval as timeout and fails the turn", async () => {
    const { orchestrator, events } = createHarness({ approvalTimeoutMs: 120, cancelGraceMs: 100 });
    await orchestrator.submitTurn("a3", makeApprovalTurn("turn-1", "forget me", approvalScript));
    await waitFor(() => turnEnded(events, "turn-1"));

    // 超时视同拒绝：decision="timeout"（event-protocol-spec 枚举）+ 兼容 code 标注；轮次走超时失败路径
    const response = events.find((event) => event.kind === "approval_response")!;
    expect(response.metadata).toMatchObject({ approvalId: "app-1", decision: "timeout", code: "APPROVAL_TIMEOUT" });
    expect(events.some((event) => event.kind === "error" && event.metadata?.code === "TURN_TIMEOUT" && event.metadata?.turnId === "turn-1")).toBe(true);
    expect(events.some((event) => event.metadata?.status === "turn-failed" && event.metadata?.turnId === "turn-1")).toBe(true);
    // 已超时结算后再应答 → 409
    await expect(orchestrator.respondApproval("a3", "app-1", "allow")).rejects.toMatchObject({ status: 409, code: "APPROVAL_NOT_PENDING" });
  });

  it("treats cancelTurn during waiting_approval as deny then cancellation", async () => {
    const { orchestrator, events, turnStatuses } = createHarness({ cancelGraceMs: 100 });
    await orchestrator.submitTurn("a4", makeApprovalTurn("turn-1", "cancel me", approvalScript));
    await waitFor(() => turnStatuses.some((item) => item.status === "waiting_approval"));
    await orchestrator.cancelTurn("a4", "turn-1");

    const response = events.find((event) => event.kind === "approval_response")!;
    expect(response.metadata).toMatchObject({ approvalId: "app-1", decision: "deny" });
    // 事件序：approval_response(deny) 先于 error(TURN_CANCELLED)（runtime-orchestrator-spec §6 边界表）
    expect(events.findIndex((event) => event.kind === "approval_response")).toBeLessThan(events.findIndex((event) => event.kind === "error" && event.metadata?.code === "TURN_CANCELLED"));
    expect(events.some((event) => event.metadata?.status === "turn-cancelled" && event.metadata?.turnId === "turn-1")).toBe(true);
    expect(turnStatuses.filter((item) => item.turnId === "turn-1").map((item) => item.status)).toEqual(["running", "waiting_approval", "cancelled"]);
  });

  it("passes approval_request through without suspending when no approval channel exists", async () => {
    const { orchestrator, events, turnStatuses } = createHarness();
    // 无 buildApprovalResponse：stdin 立即 EOF，假 CLI 自然退出；事件照常透传、不挂起（supportsApproval=false 路径）
    await orchestrator.submitTurn("a5", makeTurn("turn-1", "no channel", approvalScript));
    await waitFor(() => turnEnded(events, "turn-1"));

    expect(approvalRequested(events)).toBe(true);
    expect(events.some((event) => event.kind === "approval_response")).toBe(false);
    expect(turnStatuses.some((item) => item.status === "waiting_approval")).toBe(false);
    expect(events.some((event) => event.kind === "assistant_message" && event.raw === "no approval channel")).toBe(true);
    expect(events.some((event) => event.metadata?.status === "turn-completed" && event.metadata?.turnId === "turn-1")).toBe(true);
  });
});

// streaming-spec §3.4：常驻运行时优先路径、回落、取消/超时、resumeToken 回写
describe("runtime orchestrator persistent turns", () => {
  type PersistentScript = (handlers: PersistentTurnHandlers) => Promise<TurnParseResult>;

  function makePersistentTurn(turnId: string, prompt: string, script: PersistentScript, options?: { onKill?: () => void }): TurnInput & { kills: number[] } {
    const kills: number[] = [];
    return {
      ...makeTurn(turnId, prompt, echoScript, ["spawn-fallback-token"]),
      kills,
      runPersistent(handlers): PersistentTurnHandle {
        let rejectResult: ((error: Error) => void) | undefined;
        const result = new Promise<TurnParseResult>((resolve, reject) => {
          rejectResult = reject;
          script(handlers).then(resolve, reject);
        });
        return {
          result,
          kill() {
            kills.push(Date.now());
            options?.onKill?.();
            rejectResult?.(new Error("codex mcp-server exited before the turn completed."));
          }
        };
      }
    };
  }

  it("streams deltas and events through the persistent handle without spawning a child process", async () => {
    const { orchestrator, events, statusCalls, turnStatuses, turnDeltas } = createHarness();
    const turn = makePersistentTurn("turn-1", "stream it", async (handlers) => {
      handlers.onDelta("Hel");
      handlers.onDelta("lo!");
      await handlers.onEvent({ kind: "assistant_message", source: "profile-adapter", raw: "Hello!" });
      return { resumeToken: "thread-live", usage: { inputTokens: 10, outputTokens: 2 } };
    });
    await orchestrator.submitTurn("p1", turn);
    await waitFor(() => turnEnded(events, "turn-1"));

    expect(turnDeltas.map((item) => item.delta)).toEqual(["Hel", "lo!"]);
    expect(turnDeltas.every((item) => item.turnId === "turn-1")).toBe(true);
    const assistant = events.find((event) => event.kind === "assistant_message")!;
    // 常驻路径不走 spawn：回落 token 不得出现，resumeToken 来自 handle 结果
    expect(assistant.raw).toBe("Hello!");
    expect(assistant.metadata?.turnId).toBe("turn-1");
    expect(events.some((event) => event.raw === "assistant says hi")).toBe(false);
    expect(statusCalls).toContainEqual({ sessionId: "p1", status: "running", extra: { resumeToken: "thread-live" } });
    expect(events.some((event) => event.metadata?.status === "turn-completed" && event.metadata?.turnId === "turn-1")).toBe(true);
    expect(turnStatuses.filter((item) => item.turnId === "turn-1").map((item) => item.status)).toEqual(["running", "completed"]);
  });

  it("falls back to the spawn path within the same turn when the runtime is unavailable", async () => {
    const { orchestrator, events, statusCalls } = createHarness();
    const turn: TurnInput = {
      ...makeTurn("turn-1", "fall back", echoScript, ["spawn-fallback-token"]),
      runPersistent() {
        throw new PersistentRuntimeUnavailableError("Thread is not resumable in a fresh mcp-server process.");
      }
    };
    await orchestrator.submitTurn("p2", turn);
    await waitFor(() => turnEnded(events, "turn-1"));

    // 同轮回落：echo 脚本经 spawn 路径产出事件与 resumeToken
    expect(events.some((event) => event.kind === "assistant_message" && event.raw === "assistant says hi")).toBe(true);
    expect(statusCalls).toContainEqual({ sessionId: "p2", status: "running", extra: { resumeToken: "spawn-fallback-token" } });
    expect(events.some((event) => event.metadata?.status === "turn-completed" && event.metadata?.turnId === "turn-1")).toBe(true);
  });

  it("falls back when persistent setup rejects asynchronously as unavailable", async () => {
    const { orchestrator, events, statusCalls } = createHarness();
    const turn = makePersistentTurn("turn-1", "late fallback", async () => {
      throw new PersistentRuntimeUnavailableError("mcp handshake failed");
    });
    await orchestrator.submitTurn("p2-async", turn);
    await waitFor(() => turnEnded(events, "turn-1"));

    expect(events.some((event) => event.kind === "assistant_message" && event.raw === "assistant says hi")).toBe(true);
    expect(statusCalls).toContainEqual({ sessionId: "p2-async", status: "running", extra: { resumeToken: "spawn-fallback-token" } });
    expect(events.some((event) => event.kind === "error" && event.metadata?.code === "TURN_FAILED")).toBe(false);
  });

  it("fails the turn without fallback when runPersistent throws a non-availability error", async () => {
    const { orchestrator, events } = createHarness();
    const turn: TurnInput = {
      ...makeTurn("turn-1", "boom", echoScript),
      runPersistent() {
        throw new Error("unexpected wiring bug");
      }
    };
    await orchestrator.submitTurn("p3", turn);
    await waitFor(() => turnEnded(events, "turn-1"));

    expect(events.some((event) => event.kind === "error" && event.metadata?.code === "TURN_SPAWN_FAILED")).toBe(true);
    expect(events.some((event) => event.kind === "assistant_message")).toBe(false);
  });

  it("preserves backend failure code and fallback metadata in the transcript", async () => {
    const { orchestrator, events } = createHarness();
    await orchestrator.submitTurn("backend-failure", {
      turnId: "turn-1",
      prompt: "hello",
      runBackend: async () => ({
        events: (async function* () {})(),
        result: Promise.resolve({
          status: "failed" as const,
          error: {
            code: "CLI_PERMISSION_DENIED",
            message: "app-server failed; fallback CLI failed",
            phase: "spawn" as const,
            fallbackAttempted: true,
            fallbackCode: "CLI_PERMISSION_DENIED"
          }
        }),
        cancel: async () => undefined
      })
    });
    await waitFor(() => turnEnded(events, "turn-1"));

    const error = events.find((event) => event.kind === "error" && event.metadata?.turnId === "turn-1");
    expect(error).toMatchObject({
      metadata: {
        code: "CLI_PERMISSION_DENIED",
        phase: "spawn",
        fallbackAttempted: true,
        fallbackCode: "CLI_PERMISSION_DENIED"
      }
    });
  });

  it("marks a rejected persistent turn as TURN_FAILED and keeps the session usable", async () => {
    const { orchestrator, events, statusCalls } = createHarness();
    const turn = makePersistentTurn("turn-1", "crash", async () => {
      throw new Error("codex mcp-server exited before the turn completed.");
    });
    await orchestrator.submitTurn("p4", turn);
    await waitFor(() => turnEnded(events, "turn-1"));

    expect(events.some((event) => event.kind === "error" && event.metadata?.code === "TURN_FAILED")).toBe(true);
    expect(statusCalls.every((call) => call.extra?.resumeToken === undefined)).toBe(true);
    // 会话保持可用，下一轮可回落 spawn 路径
    expect(orchestrator.isRunning("p4")).toBe(true);
    await orchestrator.submitTurn("p4", makeTurn("turn-2", "retry", echoScript));
    await waitFor(() => turnEnded(events, "turn-2"));
    expect(events.some((event) => event.metadata?.status === "turn-completed" && event.metadata?.turnId === "turn-2")).toBe(true);
  });

  it("cancels a persistent turn through handle.kill and suppresses post-termination deltas", async () => {
    const { orchestrator, events, turnDeltas } = createHarness();
    let capturedHandlers: PersistentTurnHandlers | undefined;
    const turn = makePersistentTurn("turn-1", "cancel me", (handlers) => {
      capturedHandlers = handlers;
      handlers.onDelta("before-cancel");
      return new Promise<TurnParseResult>(() => {});
    });
    await orchestrator.submitTurn("p5", turn);
    await waitFor(() => turnDeltas.length > 0);

    await orchestrator.cancelTurn("p5", "turn-1");
    // 终态后的迟到增量被丢弃（turn-delta 临时帧语义）
    capturedHandlers?.onDelta("after-cancel");
    expect(turn.kills).toHaveLength(1);
    expect(turnDeltas.map((item) => item.delta)).toEqual(["before-cancel"]);
    expect(events.some((event) => event.metadata?.status === "turn-cancelled" && event.metadata?.turnId === "turn-1")).toBe(true);
    expect(events.some((event) => event.kind === "error" && event.metadata?.code === "TURN_CANCELLED")).toBe(true);
  });

  it("times out a hanging persistent turn with TURN_TIMEOUT", async () => {
    const { orchestrator, events } = createHarness({ turnTimeoutMs: 150 });
    const turn = makePersistentTurn("turn-1", "hang", () => new Promise<TurnParseResult>(() => {}));
    await orchestrator.submitTurn("p6", turn);
    await waitFor(() => turnEnded(events, "turn-1"));

    expect(turn.kills).toHaveLength(1);
    expect(events.some((event) => event.kind === "error" && event.metadata?.code === "TURN_TIMEOUT" && event.metadata?.turnId === "turn-1")).toBe(true);
    expect(events.some((event) => event.metadata?.status === "turn-failed" && event.metadata?.turnId === "turn-1")).toBe(true);
  });
});
