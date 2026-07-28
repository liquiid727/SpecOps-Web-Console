import { spawn } from "node:child_process";
import type { Readable, Writable } from "node:stream";
import { PersistentRuntimeUnavailableError } from "./ports.js";
import type { Logger, ParsedTurnEvent, PersistentChatRuntime, PersistentChatTurnRequest, PersistentTurnHandle, PersistentTurnHandlers, TurnParseResult } from "./ports.js";

/**
 * codex mcp-server 常驻运行时（streaming-spec §3.3）：
 * 每个 chat 会话一个常驻子进程，跨轮复用消除冷启动；轮次内把
 * agent_message_content_delta 通知转为增量回调、item_completed 映射为规范事件。
 * codex 专属实现——MCP 协议细节不进入 Orchestrator（runtime-orchestrator-spec §2.1）。
 */

/** node ChildProcess 结构子集，便于测试注入 fake 进程 */
export interface McpChildProcess {
  stdin: Writable | null;
  stdout: Readable | null;
  stderr: Readable | null;
  kill(signal?: NodeJS.Signals): void;
  once(event: "close", listener: (code: number | null) => void): void;
  once(event: "error", listener: (error: Error) => void): void;
}

export interface McpSpawnOptions {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

export type CodexMcpTurnRequest = PersistentChatTurnRequest;

export type CodexMcpRuntime = PersistentChatRuntime;

export interface CodexMcpRuntimeOptions {
  logger: Logger;
  /** 测试注入；默认 spawn(command, ["mcp-server"]) */
  spawnProcess?(options: McpSpawnOptions): McpChildProcess;
  /** initialize 握手超时（默认 10s） */
  handshakeTimeoutMs?: number;
}

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: number;
  method?: string;
  params?: { msg?: Record<string, unknown>; [key: string]: unknown };
  result?: unknown;
  error?: { code?: number; message?: string };
}

interface ActiveTurnState {
  requestId: number;
  handlers: PersistentTurnHandlers;
  turnId: string;
  usage?: TurnParseResult["usage"];
  resolve(result: TurnParseResult): void;
  reject(error: Error): void;
}

interface ProcessEntry {
  child: McpChildProcess;
  nextRequestId: number;
  pending: Map<number, { resolve(msg: JsonRpcMessage): void; reject(error: Error): void }>;
  /** 本进程内已建立的 codex 线程；跨进程不可恢复（探测证实 "Session not found"） */
  threadId?: string;
  activeTurn?: ActiveTurnState;
  ready: Promise<void>;
  closed: boolean;
}

const HANDSHAKE_TIMEOUT_MS = 10_000;

export function createCodexMcpRuntime(options: CodexMcpRuntimeOptions): CodexMcpRuntime {
  const { logger } = options;
  const handshakeTimeoutMs = options.handshakeTimeoutMs ?? HANDSHAKE_TIMEOUT_MS;
  const spawnProcess = options.spawnProcess ?? ((spawnOptions: McpSpawnOptions): McpChildProcess =>
    spawn(spawnOptions.command, spawnOptions.args, { cwd: spawnOptions.cwd, env: spawnOptions.env, stdio: ["pipe", "pipe", "pipe"] }));
  const entries = new Map<string, ProcessEntry>();
  let closing = false;

  function send(entry: ProcessEntry, message: Record<string, unknown>) {
    entry.child.stdin?.write(`${JSON.stringify(message)}\n`);
  }

  function request(entry: ProcessEntry, method: string, params: Record<string, unknown>): { id: number; response: Promise<JsonRpcMessage> } {
    const id = entry.nextRequestId++;
    const response = new Promise<JsonRpcMessage>((resolve, reject) => {
      entry.pending.set(id, { resolve, reject });
    });
    send(entry, { jsonrpc: "2.0", id, method, params });
    return { id, response };
  }

  function failEntry(sessionId: string, entry: ProcessEntry, reason: Error) {
    if (entry.closed) return;
    entry.closed = true;
    for (const pending of entry.pending.values()) pending.reject(reason);
    entry.pending.clear();
    if (entries.get(sessionId) === entry) entries.delete(sessionId);
  }

  /** 通知分发：_meta.requestId / msg 内容关联到进行中轮次（streaming-spec §3.3 第 3 点） */
  function handleNotification(entry: ProcessEntry, message: JsonRpcMessage) {
    const turn = entry.activeTurn;
    const msg = message.params?.msg;
    if (!turn || !msg || typeof msg !== "object") return;
    const type = typeof msg.type === "string" ? msg.type : "";
    if (type === "agent_message_content_delta" && typeof msg.delta === "string") {
      turn.handlers.onDelta(msg.delta);
      return;
    }
    if (type === "item_completed" && msg.item && typeof msg.item === "object") {
      const events = mapCompletedItem(msg.item as Record<string, unknown>, turn.turnId);
      for (const event of events) void turn.handlers.onEvent(event);
      return;
    }
    if (type === "token_count" && msg.info && typeof msg.info === "object") {
      const usage = (msg.info as { last_token_usage?: { input_tokens?: unknown; output_tokens?: unknown } }).last_token_usage;
      if (usage && typeof usage === "object") {
        turn.usage = {
          inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : undefined,
          outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : undefined
        };
      }
      return;
    }
    // item_started/raw_response_item/mcp_startup_*/task_*/agent_message 终帧等：忽略（映射表见 streaming-spec §3.3）
  }

  function attachStdout(sessionId: string, entry: ProcessEntry) {
    let buffer = "";
    entry.child.stdout?.on("data", (chunk: Buffer | string) => {
      buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (!line.trim()) continue;
        let message: JsonRpcMessage;
        try {
          message = JSON.parse(line) as JsonRpcMessage;
        } catch {
          logger.warn("codex mcp-server emitted non-JSON line", { sessionId, line: line.slice(0, 200) });
          continue;
        }
        if (typeof message.id === "number" && entry.pending.has(message.id)) {
          const pending = entry.pending.get(message.id)!;
          entry.pending.delete(message.id);
          pending.resolve(message);
        } else if (message.method) {
          handleNotification(entry, message);
        }
      }
    });
  }

  async function ensureEntry(sessionId: string, turn: CodexMcpTurnRequest): Promise<ProcessEntry> {
    const existing = entries.get(sessionId);
    if (existing && !existing.closed) {
      await existing.ready;
      return existing;
    }
    let child: McpChildProcess;
    try {
      child = spawnProcess({ command: turn.command, args: ["mcp-server"], cwd: turn.cwd, env: turn.env });
    } catch (error) {
      throw new PersistentRuntimeUnavailableError(`Failed to spawn codex mcp-server: ${error instanceof Error ? error.message : String(error)}`);
    }
    const entry: ProcessEntry = { child, nextRequestId: 1, pending: new Map(), closed: false, ready: Promise.resolve() };
    attachStdout(sessionId, entry);
    child.once("error", (error: Error) => {
      const active = entry.activeTurn;
      entry.activeTurn = undefined;
      failEntry(sessionId, entry, error);
      active?.reject(error);
    });
    child.once("close", () => {
      const active = entry.activeTurn;
      entry.activeTurn = undefined;
      failEntry(sessionId, entry, new Error("codex mcp-server exited."));
      active?.reject(new Error("codex mcp-server exited before the turn completed."));
    });
    entry.ready = (async () => {
      const handshake = request(entry, "initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "specos-cli-gui", version: "1.0.0" }
      });
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`initialize handshake timed out after ${handshakeTimeoutMs}ms`)), handshakeTimeoutMs).unref?.();
      });
      const response = await Promise.race([handshake.response, timeout]);
      if (response.error) throw new Error(response.error.message ?? "initialize failed");
      send(entry, { jsonrpc: "2.0", method: "notifications/initialized" });
    })();
    entries.set(sessionId, entry);
    try {
      await entry.ready;
    } catch (error) {
      entry.child.kill("SIGKILL");
      failEntry(sessionId, entry, error instanceof Error ? error : new Error(String(error)));
      throw new PersistentRuntimeUnavailableError(`codex mcp-server handshake failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return entry;
  }

  return {
    runTurn(sessionId, turn, handlers) {
      if (closing) throw new PersistentRuntimeUnavailableError("Runtime is shutting down.");
      // resumeToken 跨进程不可恢复：驻留进程无匹配 thread 时回落 exec resume 冷路径（streaming-spec §3.3 第 2 点）
      const existing = entries.get(sessionId);
      if (turn.resumeToken && (!existing || existing.closed || existing.threadId !== turn.resumeToken)) {
        throw new PersistentRuntimeUnavailableError("Thread is not resumable in a fresh mcp-server process.");
      }
      let killed = false;
      let entryRef: ProcessEntry | undefined;
      const result = (async (): Promise<TurnParseResult> => {
        const entry = await ensureEntry(sessionId, turn);
        entryRef = entry;
        if (killed) throw new Error("Turn was cancelled before dispatch.");
        if (entry.activeTurn) throw new Error("Another turn is already active on this session runtime.");
        const useReply = Boolean(turn.resumeToken && entry.threadId === turn.resumeToken);
        const args: Record<string, unknown> = useReply
          ? { threadId: turn.resumeToken, prompt: turn.prompt }
          : { prompt: turn.prompt, cwd: turn.cwd };
        if (!useReply) {
          if (turn.model) args.model = turn.model;
          if (turn.sandboxMode) args.sandbox = turn.sandboxMode;
          args["approval-policy"] = turn.approvalPolicy ?? "never";
        }
        const call = request(entry, "tools/call", { name: useReply ? "codex-reply" : "codex", arguments: args });
        const turnState: ActiveTurnState = {
          requestId: call.id,
          handlers,
          turnId: turn.turnId,
          resolve: () => undefined,
          reject: () => undefined
        };
        entry.activeTurn = turnState;
        try {
          const settled = await new Promise<JsonRpcMessage>((resolve, reject) => {
            turnState.resolve = () => undefined;
            turnState.reject = reject;
            call.response.then(resolve, reject);
          });
          if (settled.error) throw new Error(settled.error.message ?? "codex tool call failed");
          const structured = (settled.result as { structuredContent?: { threadId?: unknown } } | undefined)?.structuredContent;
          const threadId = typeof structured?.threadId === "string" ? structured.threadId : entry.threadId;
          if (threadId) entry.threadId = threadId;
          return { resumeToken: entry.threadId, usage: turnState.usage };
        } finally {
          if (entry.activeTurn === turnState) entry.activeTurn = undefined;
        }
      })();
      return {
        result,
        kill() {
          killed = true;
          const entry = entryRef ?? entries.get(sessionId);
          // 取消 = 杀常驻进程（MCP cancellation 未验证，streaming-spec 设计决策）；close 回调负责 reject 进行中轮次
          entry?.child.kill("SIGTERM");
        }
      };
    },
    release(sessionId) {
      const entry = entries.get(sessionId);
      if (!entry) return;
      entries.delete(sessionId);
      entry.closed = true;
      try { entry.child.kill("SIGTERM"); } catch { /* already exited */ }
    },
    async shutdown() {
      closing = true;
      for (const sessionId of [...entries.keys()]) this.release(sessionId);
    }
  };
}

/** item_completed → 规范事件；映射语义与 exec --json 解析一致（streaming-spec FR-4） */
function mapCompletedItem(item: Record<string, unknown>, turnId: string): ParsedTurnEvent[] {
  const type = typeof item.type === "string" ? item.type : "";
  if (type === "AgentMessage" && Array.isArray(item.content)) {
    const text = item.content
      .filter((block): block is { type: string; text: string } => Boolean(block) && typeof (block as { text?: unknown }).text === "string")
      .map((block) => block.text)
      .join("");
    if (text) return [{ kind: "assistant_message", source: "profile-adapter", raw: text, metadata: { turnId } }];
    return [];
  }
  if (type === "CommandExecution") {
    const command = typeof item.command === "string" ? item.command : "";
    if (!command) return [];
    const metadata: Record<string, string | number | boolean> = { turnId, tool: "command_execution" };
    if (typeof item.exit_code === "number") metadata.exitCode = item.exit_code;
    return [{ kind: "tool_activity", source: "profile-adapter", raw: command, metadata }];
  }
  if (type === "McpToolCall") {
    const tool = typeof item.tool === "string" ? item.tool : "";
    if (!tool) return [];
    const qualified = typeof item.server === "string" ? `${item.server}.${tool}` : tool;
    return [{ kind: "tool_activity", source: "profile-adapter", raw: qualified, metadata: { turnId, tool: qualified } }];
  }
  if (type === "FileChange" && Array.isArray(item.changes)) {
    return item.changes
      .filter((change): change is { path: string } => Boolean(change) && typeof (change as { path?: unknown }).path === "string")
      .map((change) => ({ kind: "file_change" as const, source: "profile-adapter" as const, raw: change.path, metadata: { turnId, path: change.path } }));
  }
  // UserMessage（提交侧已落 user_message）与未识别 item：忽略
  return [];
}
