import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRuntimeOrchestrator } from "./orchestrator.js";
import type { AppendEventInput, ParsedTurnEvent, PtyProcess, TurnInput, TurnParseResult } from "./ports.js";

// —— fake CLI 脚本（test-spec §3.6：server 集成，假 CLI 驱动，不依赖真实 codex）——
let fixtureDir = "";
let echoScript = "";
let sleepScript = "";
let stubbornScript = "";
let crashScript = "";

beforeAll(async () => {
  fixtureDir = await mkdtemp(path.join(tmpdir(), "orchestrator-fake-cli-"));
  echoScript = path.join(fixtureDir, "echo.cjs");
  sleepScript = path.join(fixtureDir, "sleep.cjs");
  stubbornScript = path.join(fixtureDir, "stubborn.cjs");
  crashScript = path.join(fixtureDir, "crash.cjs");
  await writeFile(echoScript, 'const token = process.argv[2] || "t-1";\nconsole.log("assistant says hi");\nconsole.log("token:" + token);\n');
  await writeFile(sleepScript, 'console.log("still working");\nsetTimeout(() => {}, Number(process.argv[2] || "5000"));\n');
  await writeFile(stubbornScript, 'process.on("SIGTERM", () => {});\nconsole.log("stubborn working");\nsetInterval(() => {}, 1000);\n');
  await writeFile(crashScript, 'process.stderr.write("boom: fake cli exploded\\n");\nprocess.exit(3);\n');
});

afterAll(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

type RecordedEvent = AppendEventInput & { sessionId: string };
type RecordedStatus = { sessionId: string; status: string; extra?: { exitCode?: number; resumeToken?: string } };

function createHarness(options?: { turnTimeoutMs?: number; cancelGraceMs?: number; ptyProcess?: PtyProcess }) {
  const events: RecordedEvent[] = [];
  const statusCalls: RecordedStatus[] = [];
  const turnStatuses: { sessionId: string; turnId: string; status: string }[] = [];
  const orchestrator = createRuntimeOrchestrator({
    ptyRuntime: {
      spawn() {
        if (!options?.ptyProcess) throw new Error("PTY runtime is not exercised by this test");
        return options.ptyProcess;
      },
      async shutdown() {}
    },
    clock: { now: () => new Date().toISOString() },
    logger: { info() {}, warn() {}, error() {} },
    turnTimeoutMs: options?.turnTimeoutMs,
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
      }
    }
  });
  return { orchestrator, events, statusCalls, turnStatuses };
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
