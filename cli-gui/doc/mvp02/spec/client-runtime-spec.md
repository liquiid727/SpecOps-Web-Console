# SPEC: Client Runtime

> Parent: [architecture-spec.md](./architecture-spec.md)
> PRD requirements: CP-001–CP-005, FR-CP-1–FR-CP-10

## 1. Contract

```ts
interface ClientRuntime {
  readonly kind: "mock" | "local" | "remote";
  capabilities(): Promise<ClientCapabilities>;
  readonly engines: EnginePort;
  readonly sessions: SessionPort;
  readonly events: EventPort;
  readonly terminal: TerminalPort;
  readonly workspace: WorkspacePort;
  readonly platform: PlatformPort;
}
```

Ports own serialization and transport details. Feature components receive a
runtime from React context and use only domain values.

## 2. Implementations

| Runtime | Transport | Purpose |
|---|---|---|
| `MockClientRuntime` | deterministic in-memory fixtures | Browser preview of every state |
| `LocalHttpRuntime` | local HTTP + WebSocket | Browser development and Tauri WebView |
| `RemoteRuntime` | Control Server HTTPS + SSE | Remote Web/mobile control |

`TauriPlatformPort` is composed with the selected runtime and owns desktop-only
folder selection, notifications, clipboard, window, and update operations.

## 3. Port Responsibilities

- `EnginePort`: readiness list, probe, setup action, model/capability catalog.
- `SessionPort`: list, create, read, mutate lifecycle, run/cancel/retry/approve.
- `EventPort`: transcript read and ordered live subscription with reconnect.
- `TerminalPort`: create, input, resize, close, and attach to setup/fallback.
- `WorkspacePort`: recent folders, scoped tree/preview, Git status and read-only diff.
- `PlatformPort`: folder picker, notification, clipboard, shell/window metadata.

## 4. Event Subscription

The subscriber supplies `sessionId` and last seen sequence. Reconnect performs
bounded exponential backoff, requests missing persisted events, deduplicates by
event ID, then resumes live delivery. A client must never invent ordering.

High-frequency deltas are buffered outside global state and flushed to the
visible transcript on an animation-frame or bounded interval.

## 5. Capability Contract

```ts
interface ClientCapabilities {
  sessionStreaming: boolean;
  terminal: boolean;
  nativeFolderPicker: boolean;
  notifications: boolean;
  remoteControl: boolean;
  gitDiff: "none" | "read-only";
}
```

The Shell uses capabilities to expose navigation; feature modules use domain
readiness/capabilities for action availability.

## 6. Error Semantics

Transport errors map to `ClientError`. `401/403` are not retried silently.
Idempotent reads retry up to three times. Mutations retry only with an
idempotency key. Offline mode preserves drafts and cached transcript.

## 7. Migration Strategy

1. Introduce runtime context and a compatibility facade over the existing API.
2. Move Session and Event consumers first.
3. Move workspace, terminal, and platform consumers.
4. Add a lint/test guard that rejects direct transport imports in feature code.
5. Remove the legacy facade after all callers migrate.

## 8. Tests

- One contract suite runs against Mock, Local, and Remote.
- Ordered replay/reconnect and duplicate suppression are mandatory.
- Runtime-specific tests cover folder picker and notification degradation.
- Components run with a fake runtime and no global network/Tauri objects.

