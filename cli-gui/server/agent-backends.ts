import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type {
  AgentBackend,
  AgentBackendConfig,
  AgentCapabilities,
  AgentEvent,
  AgentInput,
  AgentTransportKind,
  AgentTurnResult,
  BackendSessionHandle,
  CliAdapterId,
  CliProfileV3,
  OpenBackendSessionInput
} from "../shared/types.js";
import { AGENT_EVENT_KINDS } from "../shared/agent-runtime.js";
import { PersistentRuntimeUnavailableError, type ParsedTurnEvent, type PersistentChatRuntime, type PersistentTurnHandle, type TurnParseResult } from "./ports.js";
import type { Logger, ProfileAdapterRegistry } from "./ports.js";

export interface BackendTurnHandle {
  readonly events: AsyncIterable<unknown>;
  readonly result: Promise<AgentTurnResult>;
  cancel(): Promise<void>;
  approve?(approvalId: string, decision: "allow" | "deny"): Promise<void>;
}

export interface BackendTurnExecutor {
  run(input: {
    backendId: string;
    session: OpenBackendSessionInput;
    turn: AgentInput;
    adapters: ProfileAdapterRegistry;
  }): Promise<BackendTurnHandle>;
}

export interface AgentBackendRegistry {
  get(backendId: string): AgentBackend | undefined;
  forProfile(profile: CliProfileV3): AgentBackend;
  probe(profile: CliProfileV3): Promise<AgentCapabilities>;
  readonly ids: readonly string[];
}

export interface ProfileAdapterTurnExecutorOptions {
  processEnvironment: Readonly<Record<string, string | undefined>>;
  persistentChatRuntime?: PersistentChatRuntime;
  logger?: Logger;
}

const MAX_BACKEND_STDERR_CHARS = 2_000;

export function createProfileAdapterTurnExecutor(options: ProfileAdapterTurnExecutorOptions): BackendTurnExecutor {
  return {
    async run({ session, turn, adapters }) {
      if (!adapters.buildTurn || !adapters.parseEvents) throw new Error("Profile adapter does not support structured turns.");
      const profile = session.config.profile;
      const queue = new AsyncEventQueue<AgentEvent>();
      let child: ChildProcessWithoutNullStreams | undefined;
      let persistentHandle: PersistentTurnHandle | undefined;
      let cancelled = false;
      let approvalResponder: ((approvalId: string, decision: "allow" | "deny") => string) | undefined;
      let resolveResult!: (result: AgentTurnResult) => void;
      const result = new Promise<AgentTurnResult>((resolve) => { resolveResult = resolve; });

      const startSpawn = async () => {
        const spec = await adapters.buildTurn!(profile, {
          workspacePath: session.workspacePath,
          prompt: turn.prompt,
          permission: turn.permission ?? null,
          mode: turn.mode ?? null,
          model: turn.model ?? null,
          resumeToken: typeof session.resume?.nativeSessionId === "string" ? session.resume.nativeSessionId : undefined
        });
        approvalResponder = adapters.buildApprovalResponse
          ? (approvalId, decision) => adapters.buildApprovalResponse!(profile, approvalId, decision)
          : undefined;
        child = spawn(spec.command, spec.args, {
          cwd: session.workspacePath,
          env: { ...definedEnvironment(options.processEnvironment), ...spec.env },
          stdio: ["pipe", "pipe", "pipe"]
        });
        if (!approvalResponder) child.stdin.end();
        let stderrSummary = "";
        child.stderr.on("data", (chunk: Buffer) => {
          if (stderrSummary.length < MAX_BACKEND_STDERR_CHARS) stderrSummary += chunk.toString("utf8").slice(0, MAX_BACKEND_STDERR_CHARS - stderrSummary.length);
        });
        const exit = new Promise<{ type: "exit"; exitCode: number } | { type: "spawn-error"; error: Error }>((resolve) => {
          child!.once("error", (error) => resolve({ type: "spawn-error", error }));
          child!.once("close", (code) => resolve({ type: "exit", exitCode: code ?? -1 }));
        });
        void (async () => {
          let parseResult: TurnParseResult = {};
          try {
            const iterator = adapters.parseEvents!(profile, child!.stdout, { turnId: turn.turnId ?? turn.clientMessageId ?? "backend-turn" }, {
              onDelta(delta) {
                queue.push({ kind: "text_delta", occurredAt: now(), text: delta, metadata: { source: "profile-adapter" } });
              }
            });
            let next = await iterator.next();
            while (!next.done) {
              queue.push(parsedEventToAgentEvent(next.value));
              next = await iterator.next();
            }
            parseResult = next.value ?? {};
          } catch (error) {
            queue.push({ kind: "diagnostic", occurredAt: now(), text: error instanceof Error ? error.message : String(error), metadata: { code: "PARSER_FAILED" } });
          }
          if (parseResult.usage) {
            queue.push({
              kind: "usage",
              occurredAt: now(),
              metadata: {
                ...(parseResult.usage.inputTokens !== undefined ? { inputTokens: parseResult.usage.inputTokens } : {}),
                ...(parseResult.usage.outputTokens !== undefined ? { outputTokens: parseResult.usage.outputTokens } : {})
              }
            });
          }
          const outcome = await exit;
          queue.close();
          if (cancelled) {
            resolveResult({ status: "cancelled" });
          } else if (outcome.type === "spawn-error") {
            resolveResult({ status: "failed", error: { code: "TURN_SPAWN_FAILED", message: outcome.error.message } });
          } else if (outcome.exitCode !== 0) {
            resolveResult({ status: "failed", error: { code: "TURN_FAILED", message: stderrSummary.trim() || `Turn failed with exit code ${outcome.exitCode}.` } });
          } else {
            resolveResult({ status: "completed", nativeSessionId: parseResult.resumeToken, usage: parseResult.usage });
          }
        })().catch((error) => {
          queue.fail(error);
          resolveResult({ status: "failed", error: { code: "TURN_FAILED", message: error instanceof Error ? error.message : String(error) } });
        });
      };

      const startPersistent = () => {
        const runtime = options.persistentChatRuntime;
        if (!runtime || profile.adapterId !== "codex") return false;
        try {
          persistentHandle = runtime.runTurn(session.sessionId, {
            turnId: turn.turnId ?? turn.clientMessageId ?? "backend-turn",
            prompt: turn.prompt,
            cwd: session.workspacePath,
            env: definedEnvironment(options.processEnvironment),
            command: profile.command,
            model: turn.model ?? null,
            sandboxMode: turn.mode ?? null,
            approvalPolicy: turn.permission ?? null,
            resumeToken: typeof session.resume?.nativeSessionId === "string" ? session.resume.nativeSessionId : undefined
          }, {
            async onEvent(event) {
              queue.push(parsedEventToAgentEvent(event));
            },
            onDelta(delta) {
              queue.push({ kind: "text_delta", occurredAt: now(), text: delta, metadata: { source: "persistent-runtime" } });
            }
          });
        } catch (error) {
          if (error instanceof PersistentRuntimeUnavailableError) return false;
          throw error;
        }
        void persistentHandle.result.then((parseResult) => {
          if (parseResult.usage) {
            queue.push({
              kind: "usage",
              occurredAt: now(),
              metadata: {
                ...(parseResult.usage.inputTokens !== undefined ? { inputTokens: parseResult.usage.inputTokens } : {}),
                ...(parseResult.usage.outputTokens !== undefined ? { outputTokens: parseResult.usage.outputTokens } : {})
              }
            });
          }
          queue.close();
          resolveResult(cancelled ? { status: "cancelled" } : { status: "completed", nativeSessionId: parseResult.resumeToken, usage: parseResult.usage });
        }).catch(async (error) => {
          if (error instanceof PersistentRuntimeUnavailableError) {
            options.logger?.info("Persistent backend unavailable; falling back to adapter spawn", { sessionId: session.sessionId, reason: error.message });
            await startSpawn();
            return;
          }
          queue.fail(error);
          resolveResult({ status: cancelled ? "cancelled" : "failed", error: { code: "TURN_FAILED", message: error instanceof Error ? error.message : String(error) } });
        });
        return true;
      };

      if (!startPersistent()) await startSpawn();

      const handle: BackendTurnHandle = {
        events: queue,
        result,
        async cancel() {
          cancelled = true;
          if (persistentHandle) persistentHandle.kill();
          else if (child) child.kill("SIGTERM");
        }
      };
      return approvalResponder ? {
        ...handle,
        async approve(approvalId, decision) {
          const payload = approvalResponder?.(approvalId, decision);
          if (payload !== undefined && child?.stdin && !child.stdin.destroyed) child.stdin.write(payload);
        }
      } : handle;
    }
  };
}

/**
 * Migration bridge: wraps the existing stateless translators behind the new
 * stateful Backend Session seam. Runtime execution is injected so the
 * Orchestrator remains the lifecycle owner.
 */
export class ProfileAgentBackend implements AgentBackend {
  constructor(
    readonly id: string,
    readonly supportedTransports: readonly AgentTransportKind[],
    private readonly adapters: ProfileAdapterRegistry,
    private readonly executor?: BackendTurnExecutor
  ) {}

  async probe(config: AgentBackendConfig): Promise<AgentCapabilities> {
    if (!this.adapters.capabilities) throw new Error(`Backend ${this.id} does not expose capability probing.`);
    return this.adapters.capabilities(config.profile);
  }

  async openSession(input: OpenBackendSessionInput): Promise<BackendSessionHandle> {
    const selectedTransport = await this.selectTransport(input.config);
    const executor = this.executor;
    const adapters = this.adapters;
    const backendId = this.id;
    let closed = false;
    return {
      ref: input.resume ?? {
        backendId: this.id,
        transport: selectedTransport
      },
      selectedTransport,
      async runTurn(turn) {
        if (closed) throw new Error("Backend session is closed.");
        if (!executor) throw new Error(`Backend ${input.config.profile.adapterId} is not connected to a turn executor.`);
        const handle = await executor.run({ backendId, session: input, turn, adapters });
        return {
          events: normalizeAgentEventStream(handle.events, backendId),
          result: handle.result,
          cancel: () => handle.cancel(),
          ...(handle.approve ? { approve: (approvalId, decision) => handle.approve!(approvalId, decision) } : {})
        };
      },
      async close() {
        closed = true;
      }
    };

  }

  private async selectTransport(config: AgentBackendConfig): Promise<AgentTransportKind> {
    const capabilities = await this.probe(config);
    if (!capabilities.supportsHeadlessTurns) return "pty";
    return this.supportedTransports.find((transport) => transport !== "pty") ?? "pty";
  }
}

export class CodexBackend extends ProfileAgentBackend {
  constructor(adapters: ProfileAdapterRegistry, executor?: BackendTurnExecutor) {
    super("codex", ["json-stream", "pty"], adapters, executor);
  }
}

export class ClaudeBackend extends ProfileAgentBackend {
  constructor(adapters: ProfileAdapterRegistry, executor?: BackendTurnExecutor) {
    super("claude", ["json-stream", "pty"], adapters, executor);
  }
}

export interface GenericAcpBackendOptions {
  id: string;
  command: string;
  args: string[];
}

/** One ACP implementation plus small vendor configuration/extensions. */
export class GenericAcpBackend extends ProfileAgentBackend {
  readonly command: string;
  readonly args: readonly string[];
  constructor(options: GenericAcpBackendOptions, adapters: ProfileAdapterRegistry, executor?: BackendTurnExecutor) {
    // ACP identity is modeled now, but the transport is not advertised until a real ACP fixture/executor exists.
    super(options.id, ["pty"], adapters, executor);
    this.command = options.command;
    this.args = [...options.args];
  }
}

export class GenericJsonStreamBackend extends ProfileAgentBackend {
  constructor(id: string, adapters: ProfileAdapterRegistry, executor?: BackendTurnExecutor) {
    super(id, ["json-stream", "pty"], adapters, executor);
  }
}

export class GenericPtyBackend extends ProfileAgentBackend {
  constructor(adapters: ProfileAdapterRegistry, executor?: BackendTurnExecutor) {
    super("generic-pty", ["pty"], adapters, executor);
  }
}

const BACKEND_BY_ADAPTER: Record<CliAdapterId, string> = {
  codex: "codex",
  "claude-code": "claude",
  kimi: "kimi",
  glm: "glm",
  generic: "generic-pty"
};

export function createAgentBackendRegistry(adapters: ProfileAdapterRegistry, executor?: BackendTurnExecutor): AgentBackendRegistry {
  const backends = new Map<string, AgentBackend>([
    ["codex", new CodexBackend(adapters, executor)],
    ["claude", new ClaudeBackend(adapters, executor)],
    ["kimi", new GenericAcpBackend({ id: "kimi", command: "kimi", args: ["acp"] }, adapters, executor)],
    ["grok", new GenericAcpBackend({ id: "grok", command: "grok", args: ["agent", "stdio"] }, adapters, executor)],
    ["glm", new GenericJsonStreamBackend("glm", adapters, executor)],
    ["generic-json-stream", new GenericJsonStreamBackend("generic-json-stream", adapters, executor)],
    ["generic-pty", new GenericPtyBackend(adapters, executor)]
  ]);

  return {
    ids: [...backends.keys()],
    get: (backendId) => backends.get(backendId),
    forProfile(profile) {
      const backend = backends.get(BACKEND_BY_ADAPTER[profile.adapterId]);
      if (!backend) throw new Error(`No Agent Backend registered for ${profile.adapterId}.`);
      return backend;
    },
    probe(profile) {
      return this.forProfile(profile).probe({ profile });
    }
  };
}

const agentEventKinds = new Set<string>(AGENT_EVENT_KINDS);

export async function* normalizeAgentEventStream(events: AsyncIterable<unknown>, backendId: string): AsyncGenerator<AgentEvent> {
  for await (const event of events) yield normalizeVendorEvent(event, backendId);
}

/** Vendor protocol events cross the AgentBackend boundary only after normalization. */
export function normalizeVendorEvent(input: unknown, backendId: string, now = () => new Date().toISOString()): AgentEvent {
  const record = asRecord(input);
  const vendorType = readString(record, "type") ?? readString(record, "event") ?? readString(record, "kind");
  const normalizedType = vendorType?.toLowerCase().replace(/[.\-]/g, "_");
  const occurredAt = readString(record, "occurredAt") ?? readString(record, "timestamp") ?? now();
  const metadata = compactMetadata(record?.metadata);
  metadata.backendId = backendId;
  if (vendorType) metadata.vendorType = vendorType;

  const declaredKind = readString(record, "kind");
  if (declaredKind && agentEventKinds.has(declaredKind)) {
    return {
      kind: declaredKind as AgentEvent["kind"],
      occurredAt,
      ...(readEventText(record) !== undefined ? { text: readEventText(record) } : {}),
      metadata
    };
  }

  const normalized = eventKindFor(normalizedType);
  if (normalized) {
    const text = readEventText(record);
    addKnownMetadata(record, metadata);
    return { kind: normalized, occurredAt, ...(text !== undefined ? { text } : {}), metadata };
  }

  return {
    kind: "diagnostic",
    occurredAt,
    text: safePreview(input),
    metadata: { ...metadata, code: "UNKNOWN_VENDOR_EVENT" }
  };
}

function eventKindFor(type: string | undefined): AgentEvent["kind"] | undefined {
  if (!type) return undefined;
  if (["text_delta", "content_block_delta", "response_output_text_delta"].includes(type)) return "text_delta";
  if (["assistant_message", "agent_message", "message_completed"].includes(type)) return "assistant_message";
  if (type.includes("reasoning") || type.includes("progress")) return "progress";
  if (type.includes("approval_request") || type === "permission_request") return "approval_request";
  if (type.includes("approval_result") || type.includes("approval_response") || type === "permission_result") return "approval_result";
  if (type.includes("file_change") || type === "file_changed") return "file_change";
  if (type.includes("command_execution") || type === "command") return "command";
  if (type.includes("tool_use") || type.includes("tool_call") || type === "tool") return "tool";
  if (type === "usage" || type.endsWith("_usage")) return "usage";
  if (["turn_completed", "completed", "completion"].includes(type)) return "completed";
  if (["turn_cancelled", "cancelled", "cancellation"].includes(type)) return "cancelled";
  if (type === "error" || type.endsWith("_error") || type === "failed") return "error";
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function readString(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value ? value : undefined;
}

function readEventText(record: Record<string, unknown> | undefined): string | undefined {
  if (!record) return undefined;
  for (const key of ["text", "message", "command", "path", "name", "tool", "raw"]) {
    const value = readString(record, key);
    if (value) return value;
  }
  const delta = asRecord(record.delta);
  return readString(delta, "text");
}

class AsyncEventQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = [];
  private readonly waiters: Array<(value: IteratorResult<T>) => void> = [];
  private closed = false;
  private failure: unknown;

  push(value: T) {
    if (this.closed || this.failure !== undefined) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter({ done: false, value });
    else this.values.push(value);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) waiter({ done: true, value: undefined });
  }

  fail(error: unknown) {
    this.failure = error;
    this.close();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    while (true) {
      if (this.values.length) {
        yield this.values.shift()!;
        continue;
      }
      if (this.failure !== undefined) throw this.failure;
      if (this.closed) return;
      const next = await new Promise<IteratorResult<T>>((resolve) => this.waiters.push(resolve));
      if (next.done) return;
      yield next.value;
    }
  }
}

function parsedEventToAgentEvent(event: ParsedTurnEvent): AgentEvent {
  const metadata = compactTranscriptMetadata(event.metadata);
  if (event.source) metadata.source = event.source;
  switch (event.kind) {
    case "assistant_message":
      return { kind: "assistant_message", occurredAt: now(), text: event.raw, metadata };
    case "tool_activity":
      return { kind: metadata.tool === "command_execution" ? "command" : "tool", occurredAt: now(), text: event.raw, metadata };
    case "file_change":
      return { kind: "file_change", occurredAt: now(), text: event.raw, metadata };
    case "approval_request":
      return { kind: "approval_request", occurredAt: now(), text: event.raw, metadata };
    case "approval_response":
      return { kind: "approval_result", occurredAt: now(), text: event.raw, metadata };
    case "error":
      return { kind: "error", occurredAt: now(), text: event.raw, metadata };
    case "lifecycle":
      return { kind: "progress", occurredAt: now(), text: event.raw, metadata };
    case "pty_output":
    case "retention_marker":
    case "user_message":
      return { kind: "diagnostic", occurredAt: now(), text: event.raw, metadata: { ...metadata, code: "COMPATIBILITY_EVENT", compatibilityKind: event.kind } };
  }
}

function compactTranscriptMetadata(metadata: ParsedTurnEvent["metadata"]): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") output[key] = value;
  }
  return output;
}

function definedEnvironment(environment: Readonly<Record<string, string | undefined>>): Record<string, string> {
  return Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function now() {
  return new Date().toISOString();
}

function compactMetadata(value: unknown): Record<string, string | number | boolean> {
  const metadata: Record<string, string | number | boolean> = {};
  const record = asRecord(value);
  if (!record) return metadata;
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") metadata[key] = item;
  }
  return metadata;
}

function addKnownMetadata(record: Record<string, unknown> | undefined, metadata: Record<string, string | number | boolean>) {
  if (!record) return;
  const mappings: Array<[string, string]> = [
    ["approval_id", "approvalId"], ["approvalId", "approvalId"], ["decision", "decision"],
    ["code", "code"], ["path", "path"], ["name", "name"], ["tool", "tool"],
    ["input_tokens", "inputTokens"], ["output_tokens", "outputTokens"]
  ];
  for (const [source, target] of mappings) {
    const value = record[source];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") metadata[target] = value;
  }
}

function safePreview(value: unknown) {
  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    return (serialized ?? String(value)).slice(0, 4_096);
  } catch {
    return String(value).slice(0, 4_096);
  }
}
