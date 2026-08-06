import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { createCodexMcpRuntime, type McpChildProcess, type McpSpawnOptions } from "./codex-mcp-runtime.js";
import { PersistentRuntimeUnavailableError } from "./ports.js";
import type { ParsedTurnEvent, PersistentTurnHandlers } from "./ports.js";

// —— fake codex mcp-server（test-spec 风格：结构子集注入，不依赖真实 codex）——
class FakeMcpProcess implements McpChildProcess {
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  requests: { id: number; method: string; params: Record<string, unknown> }[] = [];
  notificationsSent: string[] = [];
  killedWith: NodeJS.Signals | undefined;
  private closeListeners: ((code: number | null) => void)[] = [];
  private errorListeners: ((error: Error) => void)[] = [];
  private buffered = "";

  constructor(private readonly options?: { autoInitialize?: boolean }) {
    this.stdin.on("data", (chunk: Buffer) => {
      this.buffered += chunk.toString("utf8");
      let index = this.buffered.indexOf("\n");
      while (index !== -1) {
        const line = this.buffered.slice(0, index);
        this.buffered = this.buffered.slice(index + 1);
        index = this.buffered.indexOf("\n");
        if (!line.trim()) continue;
        const message = JSON.parse(line) as { id?: number; method?: string; params?: Record<string, unknown> };
        if (typeof message.id === "number" && message.method) {
          this.requests.push({ id: message.id, method: message.method, params: message.params ?? {} });
          if (message.method === "initialize" && this.options?.autoInitialize !== false) {
            this.respond(message.id, { protocolVersion: "2025-03-26", serverInfo: { name: "fake-codex" } });
          }
        } else if (message.method) {
          this.notificationsSent.push(message.method);
        }
      }
    });
  }

  respond(id: number, result: unknown) {
    this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
  }

  respondError(id: number, message: string) {
    this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message } })}\n`);
  }

  notify(msg: Record<string, unknown>, meta?: Record<string, unknown>) {
    this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", method: "codex/event", params: { _meta: meta ?? {}, msg } })}\n`);
  }

  kill(signal?: NodeJS.Signals) {
    this.killedWith = signal;
    this.emitClose(0);
  }

  emitClose(code: number | null) {
    for (const listener of this.closeListeners.splice(0)) listener(code);
  }

  emitError(error: Error) {
    for (const listener of this.errorListeners.splice(0)) listener(error);
  }

  once(event: "close" | "error", listener: ((code: number | null) => void) | ((error: Error) => void)): void {
    if (event === "close") this.closeListeners.push(listener as (code: number | null) => void);
    else this.errorListeners.push(listener as (error: Error) => void);
  }

  async waitForToolCall(): Promise<{ id: number; params: Record<string, unknown> }> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const call = this.requests.find((request) => request.method === "tools/call");
      if (call) return call;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error("tools/call was never issued");
  }
}

function createHarness(options?: { autoInitialize?: boolean; failSpawn?: boolean; handshakeTimeoutMs?: number }) {
  const processes: FakeMcpProcess[] = [];
  const spawnCalls: McpSpawnOptions[] = [];
  const runtime = createCodexMcpRuntime({
    logger: { info() {}, warn() {}, error() {} },
    handshakeTimeoutMs: options?.handshakeTimeoutMs,
    spawnProcess(spawnOptions) {
      spawnCalls.push(spawnOptions);
      if (options?.failSpawn) throw new Error("ENOENT: codex not found");
      const child = new FakeMcpProcess({ autoInitialize: options?.autoInitialize });
      processes.push(child);
      return child;
    }
  });
  return { runtime, processes, spawnCalls };
}

function makeTurn(overrides?: Partial<Parameters<ReturnType<typeof createCodexMcpRuntime>["runTurn"]>[1]>) {
  return {
    turnId: "turn-1",
    prompt: "hello",
    cwd: "/tmp/workspace",
    env: { PATH: "/usr/bin" },
    command: "codex",
    model: null,
    sandboxMode: null,
    approvalPolicy: null,
    ...overrides
  };
}

function collectHandlers() {
  const events: ParsedTurnEvent[] = [];
  const deltas: string[] = [];
  const handlers: PersistentTurnHandlers = {
    async onEvent(event) {
      events.push(event);
    },
    onDelta(delta) {
      deltas.push(delta);
    }
  };
  return { handlers, events, deltas };
}

describe("codex mcp runtime", () => {
  it("spawns mcp-server, streams deltas, maps completed items and resolves with resumeToken and usage", async () => {
    const { runtime, processes, spawnCalls } = createHarness();
    const { handlers, events, deltas } = collectHandlers();

    const handle = runtime.runTurn("session-1", makeTurn({ model: "gpt-5", sandboxMode: "workspace-write" }), handlers);
    const child = await waitForProcess(processes);
    const call = await child.waitForToolCall();

    expect(spawnCalls).toEqual([{ command: "codex", args: ["mcp-server"], cwd: "/tmp/workspace", env: { PATH: "/usr/bin" } }]);
    expect(call.params).toMatchObject({ name: "codex", arguments: { prompt: "hello", cwd: "/tmp/workspace", model: "gpt-5", sandbox: "workspace-write", "approval-policy": "never" } });

    child.notify({ type: "agent_message_content_delta", delta: "Hel" });
    child.notify({ type: "agent_message_content_delta", delta: "lo!" });
    child.notify({ type: "item_completed", item: { type: "AgentMessage", content: [{ type: "text", text: "Hello!" }] } });
    child.notify({ type: "item_completed", item: { type: "CommandExecution", command: "ls -la", exit_code: 0 } });
    child.notify({ type: "item_completed", item: { type: "McpToolCall", server: "browser", tool: "click" } });
    child.notify({ type: "item_completed", item: { type: "FileChange", changes: [{ path: "src/a.ts" }, { path: "src/b.ts" }] } });
    child.notify({ type: "item_completed", item: { type: "UserMessage", content: [{ type: "text", text: "hello" }] } });
    child.notify({ type: "token_count", info: { last_token_usage: { input_tokens: 120, output_tokens: 45 } } });
    child.respond(call.id, { structuredContent: { threadId: "thread-abc" } });

    const result = await handle.result;
    expect(result).toEqual({ resumeToken: "thread-abc", usage: { inputTokens: 120, outputTokens: 45 } });
    expect(deltas).toEqual(["Hel", "lo!"]);
    expect(events.map((event) => [event.kind, event.raw])).toEqual([
      ["assistant_message", "Hello!"],
      ["tool_activity", "ls -la"],
      ["tool_activity", "browser.click"],
      ["file_change", "src/a.ts"],
      ["file_change", "src/b.ts"]
    ]);
    expect(events[1]?.metadata).toMatchObject({ turnId: "turn-1", tool: "command_execution", exitCode: 0 });
  });

  it("places transient provider launch args before mcp-server only on first spawn", async () => {
    const { runtime, processes, spawnCalls } = createHarness();
    const first = runtime.runTurn("session-provider", makeTurn({ providerArgs: ["--provider", "openai-compatible", "--base-url", "https://provider.invalid/v1"] }), collectHandlers().handlers);
    const child = await waitForProcess(processes);
    const call = await child.waitForToolCall();
    expect(spawnCalls[0]?.args).toEqual(["--provider", "openai-compatible", "--base-url", "https://provider.invalid/v1", "mcp-server"]);
    expect(JSON.stringify(spawnCalls)).not.toContain("provider-secret");
    child.respond(call.id, { structuredContent: { threadId: "thread-provider" } });
    await first.result;

    const second = runtime.runTurn("session-provider", makeTurn({ turnId: "turn-2", prompt: "again", resumeToken: "thread-provider", providerArgs: ["--provider", "changed"] }), collectHandlers().handlers);
    const secondCall = await waitFor(() => child.requests.filter((request) => request.method === "tools/call")[1]);
    child.respond(secondCall.id, { structuredContent: { threadId: "thread-provider" } });
    await second.result;
    expect(spawnCalls).toHaveLength(1);
  });

  it("reuses the resident process across turns and switches to codex-reply when the thread matches", async () => {
    const { runtime, processes, spawnCalls } = createHarness();
    const first = runtime.runTurn("session-1", makeTurn(), collectHandlers().handlers);
    const child = await waitForProcess(processes);
    const firstCall = await child.waitForToolCall();
    child.respond(firstCall.id, { structuredContent: { threadId: "thread-abc" } });
    await first.result;

    const second = runtime.runTurn("session-1", makeTurn({ turnId: "turn-2", prompt: "again", resumeToken: "thread-abc" }), collectHandlers().handlers);
    const secondCall = await waitFor(() => child.requests.filter((request) => request.method === "tools/call")[1]);
    expect(secondCall.params).toMatchObject({ name: "codex-reply", arguments: { threadId: "thread-abc", prompt: "again" } });
    child.respond(secondCall.id, { structuredContent: { threadId: "thread-abc" } });
    await expect(second.result).resolves.toEqual({ resumeToken: "thread-abc", usage: undefined });
    expect(spawnCalls).toHaveLength(1);
  });

  it("throws PERSISTENT_RUNTIME_UNAVAILABLE when a resumeToken has no matching resident thread", () => {
    const { runtime } = createHarness();
    // 跨进程 threadId 不可恢复（探测证实 Session not found）→ 前置拒绝，orchestrator 回落 exec resume
    expect(() => runtime.runTurn("session-1", makeTurn({ resumeToken: "thread-old" }), collectHandlers().handlers))
      .toThrow(PersistentRuntimeUnavailableError);
  });

  it("throws PERSISTENT_RUNTIME_UNAVAILABLE when spawn fails", async () => {
    const { runtime } = createHarness({ failSpawn: true });
    const handle = runtime.runTurn("session-1", makeTurn(), collectHandlers().handlers);
    await expect(handle.result).rejects.toBeInstanceOf(PersistentRuntimeUnavailableError);
  });

  it("throws PERSISTENT_RUNTIME_UNAVAILABLE when the initialize handshake times out", async () => {
    const { runtime, processes } = createHarness({ autoInitialize: false, handshakeTimeoutMs: 30 });
    const handle = runtime.runTurn("session-1", makeTurn(), collectHandlers().handlers);
    await expect(handle.result).rejects.toBeInstanceOf(PersistentRuntimeUnavailableError);
    expect(processes[0]?.killedWith).toBe("SIGKILL");
  });

  it("rejects the in-flight turn when the resident process closes mid-turn", async () => {
    const { runtime, processes } = createHarness();
    const handle = runtime.runTurn("session-1", makeTurn(), collectHandlers().handlers);
    const child = await waitForProcess(processes);
    await child.waitForToolCall();
    child.emitClose(1);
    await expect(handle.result).rejects.toThrow(/exited/);
  });

  it("kill() terminates the resident process with SIGTERM and rejects the turn", async () => {
    const { runtime, processes } = createHarness();
    const handle = runtime.runTurn("session-1", makeTurn(), collectHandlers().handlers);
    const child = await waitForProcess(processes);
    await child.waitForToolCall();
    handle.kill();
    expect(child.killedWith).toBe("SIGTERM");
    await expect(handle.result).rejects.toThrow();
  });

  it("release() kills the resident process and a later turn starts a fresh one", async () => {
    const { runtime, processes, spawnCalls } = createHarness();
    const first = runtime.runTurn("session-1", makeTurn(), collectHandlers().handlers);
    const child = await waitForProcess(processes);
    const call = await child.waitForToolCall();
    child.respond(call.id, { structuredContent: { threadId: "thread-abc" } });
    await first.result;

    runtime.release("session-1");
    expect(child.killedWith).toBe("SIGTERM");

    const second = runtime.runTurn("session-1", makeTurn({ turnId: "turn-2" }), collectHandlers().handlers);
    const next = await waitFor(() => processes[1]);
    const nextCall = await next.waitForToolCall();
    // 新进程无 thread → 重新走 codex 工具（上下文由回落路径负责，不在此层拼接）
    expect(nextCall.params).toMatchObject({ name: "codex" });
    next.respond(nextCall.id, { structuredContent: { threadId: "thread-new" } });
    await expect(second.result).resolves.toMatchObject({ resumeToken: "thread-new" });
    expect(spawnCalls).toHaveLength(2);
  });

  it("shutdown() releases every resident process and refuses new turns", async () => {
    const { runtime, processes } = createHarness();
    const first = runtime.runTurn("session-1", makeTurn(), collectHandlers().handlers);
    const child = await waitForProcess(processes);
    const call = await child.waitForToolCall();
    child.respond(call.id, { structuredContent: { threadId: "thread-abc" } });
    await first.result;

    await runtime.shutdown();
    expect(child.killedWith).toBe("SIGTERM");
    expect(() => runtime.runTurn("session-2", makeTurn(), collectHandlers().handlers)).toThrow(PersistentRuntimeUnavailableError);
  });

  it("surfaces tool call errors as turn failures without killing the entry", async () => {
    const { runtime, processes } = createHarness();
    const handle = runtime.runTurn("session-1", makeTurn(), collectHandlers().handlers);
    const child = await waitForProcess(processes);
    const call = await child.waitForToolCall();
    child.respondError(call.id, "model overloaded");
    await expect(handle.result).rejects.toThrow("model overloaded");
    expect(child.killedWith).toBeUndefined();
  });
});

async function waitForProcess(processes: FakeMcpProcess[]): Promise<FakeMcpProcess> {
  return waitFor(() => processes[0]);
}

async function waitFor<T>(probe: () => T | undefined): Promise<T> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = probe();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("condition was not met in time");
}
