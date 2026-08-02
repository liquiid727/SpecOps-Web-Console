import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type {
  AgentBackend,
  AgentBackendConfig,
  AgentCapabilities,
  AgentEvent,
  AgentTurnError,
  AgentInput,
  AgentTransportKind,
  AgentTurnResult,
  BackendSessionHandle,
  CliAdapterId,
  CliProfileV3,
  OpenBackendSessionInput,
  TranscriptStructuredComponent,
  TranscriptStructuredComponentValue
} from "../shared/types.js";
import type { AgentEffect, RoutingFailure, RoutingFailureClass } from "../shared/execution-attempt.js";
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPermissionFailure(message: string): boolean {
  return /operation not permitted|permission denied|\b(?:eacces|eperm)\b/i.test(message);
}

function classifySpawnFailure(message: string, spawnError = false): AgentTurnError {
  return {
    code: isPermissionFailure(message) ? "CLI_PERMISSION_DENIED" : spawnError ? "TURN_SPAWN_FAILED" : "TURN_FAILED",
    message,
    phase: "spawn"
  };
}

function isAgentEffect(value: unknown): value is AgentEffect {
  return value === "none" || value === "read" || value === "write" || value === "external" || value === "unknown";
}

function failureClassForCode(code: string): RoutingFailureClass {
  if (["PROVIDER_RATE_LIMITED", "RATE_LIMITED", "HTTP_429"].includes(code)) return "rate-limited";
  if (["PROVIDER_UNAVAILABLE", "CONNECTION_FAILED", "HTTP_502", "HTTP_503", "HTTP_504"].includes(code)) return "provider-unavailable";
  if (["MODEL_TEMPORARILY_UNAVAILABLE", "MODEL_OVERLOADED"].includes(code)) return "model-temporarily-unavailable";
  if (["TURN_TIMEOUT", "REQUEST_TIMEOUT"].includes(code)) return "timeout";
  if (["CLI_PERMISSION_DENIED", "APPROVAL_DENIED"].includes(code)) return code === "APPROVAL_DENIED" ? "approval-denied" : "policy";
  if (["PROVIDER_SECRET_MISSING", "PROVIDER_CREDENTIAL_MISSING", "SECRET_STORE_UNAVAILABLE"].includes(code)) return "secret-missing";
  if (["AUTHENTICATION_FAILED", "HTTP_401", "HTTP_403"].includes(code)) return "authentication";
  if (["INVALID_REQUEST", "HTTP_400", "MODEL_NOT_FOUND", "CLI_OPTION_UNSUPPORTED"].includes(code)) return "configuration";
  if (["TURN_SPAWN_FAILED", "APP_SERVER_INIT_FAILED"].includes(code)) return "startup";
  if (["TURN_CANCELLED", "TASK_CANCELLED"].includes(code)) return "cancelled";
  return "unknown";
}

export function classifyAgentTurnFailure(error: AgentTurnError | undefined): RoutingFailure | undefined {
  if (!error) return undefined;
  const className = error.failureClass ?? failureClassForCode(error.code);
  return {
    code: error.code,
    class: className,
    message: error.message,
    phase: error.phase,
    fallbackEligible: ["startup", "connection", "timeout", "rate-limited", "provider-unavailable", "model-temporarily-unavailable"].includes(className)
  };
}

function classifyPersistentFailure(error: unknown): AgentTurnError {
  const message = errorMessage(error);
  return {
    code: isPermissionFailure(message) ? "CLI_PERMISSION_DENIED" : "APP_SERVER_INIT_FAILED",
    message,
    phase: "app-server"
  };
}

function withFallbackFailure(initial: AgentTurnError, fallback: AgentTurnError): AgentTurnError {
  return {
    ...fallback,
    message: `App-server failed (${initial.code}): ${initial.message}\nFallback CLI failed (${fallback.code}): ${fallback.message}`,
    fallbackAttempted: true,
    fallbackCode: fallback.code
  };
}

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

      const startSpawn = async (fallbackFailure?: AgentTurnError) => {
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
        child = spawn(spec.command, [...spec.args, ...(turn.launchArgs ?? [])], {
          cwd: session.workspacePath,
          env: { ...definedEnvironment(options.processEnvironment), ...spec.env, ...turn.launchEnv },
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
            const failure = classifySpawnFailure(outcome.error.message, true);
            resolveResult({ status: "failed", error: fallbackFailure ? withFallbackFailure(fallbackFailure, failure) : failure });
          } else if (outcome.exitCode !== 0) {
            const failure = classifySpawnFailure(stderrSummary.trim() || `Turn failed with exit code ${outcome.exitCode}.`);
            resolveResult({ status: "failed", error: fallbackFailure ? withFallbackFailure(fallbackFailure, failure) : failure });
          } else {
            resolveResult({ status: "completed", nativeSessionId: parseResult.resumeToken, usage: parseResult.usage });
          }
        })().catch((error) => {
          queue.fail(error);
          const failure: AgentTurnError = { code: "TURN_FAILED", message: errorMessage(error), phase: "parse" };
          resolveResult({ status: "failed", error: fallbackFailure ? withFallbackFailure(fallbackFailure, failure) : failure });
        });
      };

      let persistentFailure: AgentTurnError | undefined;
      const startPersistent = () => {
        const runtime = options.persistentChatRuntime;
        if (!runtime || profile.adapterId !== "codex") return false;
        try {
          persistentHandle = runtime.runTurn(session.sessionId, {
            turnId: turn.turnId ?? turn.clientMessageId ?? "backend-turn",
            prompt: turn.prompt,
            cwd: session.workspacePath,
            env: { ...definedEnvironment(options.processEnvironment), ...turn.launchEnv },
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
          if (error instanceof PersistentRuntimeUnavailableError) {
            persistentFailure = classifyPersistentFailure(error);
            return false;
          }
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
            const initialFailure = classifyPersistentFailure(error);
            options.logger?.info("Persistent backend unavailable; falling back to adapter spawn", { sessionId: session.sessionId, reason: error.message });
            try {
              await startSpawn(initialFailure);
            } catch (fallbackError) {
              const failure = classifySpawnFailure(errorMessage(fallbackError), false);
              resolveResult({ status: "failed", error: withFallbackFailure(initialFailure, failure) });
            }
            return;
          }
          queue.fail(error);
          resolveResult({ status: cancelled ? "cancelled" : "failed", error: classifyPersistentFailure(error) });
        });
        return true;
      };

      if (!startPersistent()) {
        try {
          await startSpawn(persistentFailure);
        } catch (error) {
          const fallback = classifySpawnFailure(errorMessage(error), false);
          resolveResult({ status: "failed", error: persistentFailure ? withFallbackFailure(persistentFailure, fallback) : fallback });
        }
      }

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
    const declaredEffect = isAgentEffect(record?.effect)
      ? record.effect
      : isAgentEffect(asRecord(record?.metadata)?.effect)
        ? asRecord(record?.metadata)?.effect as AgentEffect
        : undefined;
    const component = readStructuredComponent(record?.component) ?? componentForAgentEvent(declaredKind as AgentEvent["kind"], record, metadata);
    return {
      kind: declaredKind as AgentEvent["kind"],
      occurredAt,
      ...(readEventText(record) !== undefined ? { text: readEventText(record) } : {}),
      metadata,
      ...(declaredEffect ? { effect: declaredEffect } : {}),
      ...(component ? { component } : {})
    };
  }

  const normalized = eventKindFor(normalizedType);
  if (normalized) {
    const text = readEventText(record);
    addKnownMetadata(record, metadata);
    const component = componentForAgentEvent(normalized, record, metadata, text);
    return { kind: normalized, occurredAt, ...(text !== undefined ? { text } : {}), metadata, ...(isAgentEffect(record?.effect) ? { effect: record.effect } : {}), ...(component ? { component } : {}) };
  }

  return {
    kind: "diagnostic",
    occurredAt,
    text: safePreview(input),
    metadata: { ...metadata, code: "UNKNOWN_VENDOR_EVENT" },
    component: { type: "diagnostic", title: vendorType ?? "Unknown vendor event", text: safePreview(input), data: componentData(record ?? input) }
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

function readStructuredComponent(value: unknown): TranscriptStructuredComponent | undefined {
  const record = asRecord(value);
  const type = readString(record, "type");
  if (!type) return undefined;
  const data = componentData(record?.data);
  return {
    type: type as TranscriptStructuredComponent["type"],
    ...(readString(record, "title") ? { title: readString(record, "title") } : {}),
    ...(readString(record, "text") ? { text: readString(record, "text") } : {}),
    ...(readString(record, "language") ? { language: readString(record, "language") } : {}),
    ...(readString(record, "status") ? { status: readString(record, "status") } : {}),
    ...(data ? { data } : {})
  };
}

function componentForAgentEvent(kind: AgentEvent["kind"], record: Record<string, unknown> | undefined, metadata: Record<string, string | number | boolean>, text = readEventText(record)): TranscriptStructuredComponent | undefined {
  switch (kind) {
    case "assistant_message":
      return { type: "message", text };
    case "progress":
      return { type: "progress", title: readString(record, "name") ?? readString(record, "tool"), text, data: componentData(record) };
    case "tool":
      return { type: "tool", title: String(metadata.tool ?? metadata.name ?? text ?? "tool"), text, data: componentData(record?.input ?? record) };
    case "command":
      return { type: "command", title: text, text, status: metadata.exitCode !== undefined ? String(metadata.exitCode) : undefined, data: componentData(record) };
    case "file_change":
      return { type: "file_change", title: String(metadata.path ?? text ?? "file"), text, data: componentData(record) };
    case "approval_request":
      return { type: "approval", title: String(metadata.approvalId ?? "approval"), text, data: componentData(record) };
    case "approval_result":
      return { type: "turn_status", status: String(metadata.decision ?? "recorded"), text, data: componentData(record) };
    case "usage":
      return { type: "usage", text, data: componentData(metadata) };
    case "error":
      return { type: "turn_status", status: "error", text, data: componentData(record) };
    case "completed":
      return { type: "turn_status", status: "turn-completed", text };
    case "cancelled":
      return { type: "turn_status", status: "turn-cancelled", text };
    case "diagnostic":
      return { type: "diagnostic", title: String(metadata.vendorType ?? metadata.code ?? "diagnostic"), text, data: componentData(record) };
    case "text_delta":
      return undefined;
  }
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
      return { kind: "assistant_message", occurredAt: now(), text: event.raw, metadata, ...(event.effect ? { effect: event.effect } : {}), component: event.component };
    case "tool_activity":
      return { kind: metadata.tool === "command_execution" ? "command" : "tool", occurredAt: now(), text: event.raw, metadata, ...(event.effect ? { effect: event.effect } : {}), component: event.component };
    case "file_change":
      return { kind: "file_change", occurredAt: now(), text: event.raw, metadata, ...(event.effect ? { effect: event.effect } : {}), component: event.component };
    case "approval_request":
      return { kind: "approval_request", occurredAt: now(), text: event.raw, metadata, component: event.component };
    case "approval_response":
      return { kind: "approval_result", occurredAt: now(), text: event.raw, metadata, component: event.component };
    case "error":
      return { kind: "error", occurredAt: now(), text: event.raw, metadata, component: event.component };
    case "lifecycle":
      return { kind: "progress", occurredAt: now(), text: event.raw, metadata, component: event.component };
    case "pty_output":
    case "retention_marker":
    case "user_message":
      return { kind: "diagnostic", occurredAt: now(), text: event.raw, metadata: { ...metadata, code: "COMPATIBILITY_EVENT", compatibilityKind: event.kind }, component: event.component };
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

function componentData(value: unknown): Record<string, TranscriptStructuredComponentValue> | undefined {
  const record = safeComponentValue(value);
  return record && typeof record === "object" && !Array.isArray(record) ? record as Record<string, TranscriptStructuredComponentValue> : undefined;
}

function safeComponentValue(value: unknown, depth = 0): TranscriptStructuredComponentValue | undefined {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 4096);
  if (depth >= 4) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, 20)
      .map((item) => safeComponentValue(item, depth + 1))
      .filter((item): item is TranscriptStructuredComponentValue => item !== undefined);
  }
  if (value && typeof value === "object") {
    const output: Record<string, TranscriptStructuredComponentValue> = {};
    for (const [key, item] of Object.entries(value).slice(0, 30)) {
      const safe = safeComponentValue(item, depth + 1);
      if (safe !== undefined) output[key] = safe;
    }
    return output;
  }
  return undefined;
}

function safePreview(value: unknown) {
  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    return (serialized ?? String(value)).slice(0, 4_096);
  } catch {
    return String(value).slice(0, 4_096);
  }
}
