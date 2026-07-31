# SPEC: Agent Runtime

> Parent: [architecture-spec.md](./architecture-spec.md)
> PRD requirements: TR-002–TR-007, FR-TR-2–FR-TR-9

## 1. Domain Separation

- **Agent Engine:** executable session manager, for example Codex or Claude.
- **Transport:** `native-sdk`, `acp`, `json-stream`, or `pty`.
- **Model Provider:** OpenAI, Anthropic, Moonshot, xAI, GLM, or custom.

These are separate registries and types. Provider configuration may constrain
models but cannot be selected as an Engine.

## 2. Backend Contracts

```ts
interface AgentBackend {
  readonly id: string;
  readonly supportedTransports: readonly AgentTransportKind[];
  probe(config: AgentBackendConfig): Promise<AgentCapabilities>;
  openSession(input: OpenBackendSessionInput): Promise<BackendSessionHandle>;
}

interface BackendSessionHandle {
  readonly ref: BackendSessionRef;
  readonly selectedTransport: AgentTransportKind;
  runTurn(input: AgentInput): Promise<AgentTurnHandle>;
  close(): Promise<void>;
}

interface AgentTurnHandle {
  readonly events: AsyncIterable<AgentEvent>;
  readonly result: Promise<AgentTurnResult>;
  cancel(): Promise<void>;
  approve?(approvalId: string, decision: ApprovalDecision): Promise<void>;
}
```

## 3. Implementations

- `CodexBackend`: native integration, structured stream and native resume.
- `ClaudeBackend`: native integration, structured stream and native resume.
- `GenericJsonStreamBackend`: configured JSON-lines process.
- `GenericPtyBackend`: compatibility fallback with limited capabilities.
- `GenericAcpBackend`: frozen extension contract in MVP02; Kimi/Grok are
  configuration plus optional vendor extensions, not duplicate clients.

Transport selection is capability negotiation in declared preference order,
not a product-name conditional.

## 4. Readiness

```ts
interface EngineReadiness {
  engineId: "codex" | "claude";
  installation: "available" | "missing";
  authentication: "ready" | "required" | "unknown";
  compatibility: "supported" | "unsupported" | "unknown";
  version?: string;
  selectedTransport?: AgentTransportKind;
  capabilities?: AgentCapabilities;
  remediation?: EngineRemediation;
}
```

Probe has a bounded timeout, does not mutate authentication, and returns
structured remediation. Missing binaries never trigger automatic install
scripts.

## 5. Ownership

The Orchestrator owns queueing, concurrency, timeouts, cancellation ordering,
approval waiting, Session status, and transcript append. A backend owns only
vendor protocol/session behavior. A transport owns I/O framing and process or
connection mechanics.

## 6. State Schema v4

```ts
interface BackendSessionRef {
  backendId: string;
  nativeSessionId?: string;
  transport: AgentTransportKind;
  resumeData?: Record<string, unknown>;
}
```

Migration maps legacy `adapterId` to `backendId` and a legacy `resumeToken` to
`nativeSessionId`/`resumeData`. Unknown fields are retained in migration
metadata. Original state is backed up before atomic replacement.

## 7. Event Rules

Required normalized categories are text delta, reasoning/progress, tool,
command, file change, approval request/result, usage, completion, cancellation,
and structured error. Unknown vendor events become diagnostic events and never
crash the turn stream.

## 8. Failure Handling

- Probe timeout: readiness `unknown`, retry action.
- Native resume rejected: preserve transcript and offer context rebuild.
- Structured approval unavailable: safe configuration suggestion or in-app PTY.
- Process exits: emit one terminal result, close handles idempotently.
- Cancellation race: first terminal transition wins; later events are ignored.

