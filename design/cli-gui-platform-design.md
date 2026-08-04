# CLI GUI Platform Design

## Meta

- Platform: `cli-gui`
- Status: `draft`
- Owner: `cli-gui-agent`
- Inputs: MVP01 Agent Console, MVP02 Client Platform, Desktop Terminal Replacement,
  `.prd/prd-chat-streaming-and-persistent-runtime.md`, and
  `.prd/prd-cli-gui-multi-provider-model-routing.md`
- Reference inputs: Remote Control PRD/specs and `cli-gui/doc/research/`; these are
  not normative implementation sources.

## Purpose

This document is the durable architecture source of truth for the CLI GUI platform.
Feature-level behavior belongs in the referenced MVP SPECs.

## Scope

- shared TypeScript client architecture for browser, Tauri, and remote Web
- local Session Manager and append-only transcript
- Runtime Orchestrator and Agent Backend integration
- application-owned model deployment registry, priority route resolution, and
  auditable execution attempts over official CLI engines
- Tauri desktop host and local TypeScript runtime
- deferred Remote Control Server and outbound device connector reference

## Non-Goals

- replacing official CLI agent loops or directly executing Provider HTTP/SDK APIs
- treating Model Providers as Agent Engines
- duplicating Session or transcript semantics at transport boundaries
- granting remote clients arbitrary shell or filesystem access

## Architecture

```text
Desktop Shell / Remote Shell / Mock Preview
                    |
               ClientRuntime
                    |
       Session / Event / Workspace Ports
                    |
       Local Runtime or Control Server
                    |
             Session Manager
                    |
      Route Resolver / Attempt Coordinator
                    |
          Runtime Orchestrator
                    |
              Agent Backend
                    |
    native-sdk / ACP / JSON stream / PTY
                    |
       Codex / Claude / Kimi / Grok

Model Provider registry is orthogonal:
OpenAI / Anthropic / Moonshot / xAI / GLM / custom
```

### Client

- React 19 + TypeScript strict + Vite 6
- Zustand as the only global state library
- existing semantic design system and EN/ZH i18n
- xterm.js for the in-app fallback Terminal
- react-markdown + GFM for sanitized transcript rendering
- Desktop and Remote may use different Shell layouts but share business modules

### Local Runtime

- Node.js/TypeScript remains the MVP02 Session Manager and Agent Runtime.
- Tauri starts and supervises the packaged local runtime and loads local UI assets.
- Rust owns shell lifecycle and scoped OS integration; it does not duplicate Agent logic.
- Local HTTP/WS remains the first transport between WebView and the TypeScript runtime.

### Execution

- Session Manager owns persistent Session identity and metadata.
- Runtime Orchestrator owns concurrency, process/session handles, cancellation,
  timeout, approval waiting, and lifecycle ordering.
- Route Resolver owns deterministic candidate filtering and configuration
  provenance; it does not launch processes or interpret vendor events.
- Attempt Coordinator owns one immutable execution record per real model run,
  plus the product policy for at most one safe technical fallback.
- Agent Backend owns vendor protocol behavior and creates backend session handles.
- Transport implementations own protocol I/O mechanics.
- Model Provider configuration never shares an enum with Agent Engines.

## Data And Contracts

- `AgentEvent` is the normalized runtime event.
- `TranscriptEvent` is the persisted event envelope with stable ID and sequence.
- `Session.id` is a Product AI OS identity.
- `BackendSessionRef.nativeSessionId` is a vendor identity.
- `ModelDeployment.id` identifies one Provider + Profile/Engine + model target.
- `ExecutionTask` represents one accepted user turn; every real backend invocation
  is a separate `ExecutionAttempt` with a frozen resolved configuration snapshot.
- Client transports and remote envelopes preserve existing Session/event/turn/approval IDs.
- State migrations are versioned, backed up, and non-destructive.

## Operational Constraints

- no external system Terminal is required for the supported daily-use path
- local mode works without network or Control Server
- remote outages never terminate local Agent processes
- high-frequency deltas are buffered and remain outside global state
- all filesystem and Git access remains Workspace-scoped
- Tauri loads local assets and uses least-privilege capabilities

## Rebaseline Domain Boundaries

The platform has four product/runtime concepts and one integration identity. They
must not be collapsed into a generic `session` object:

| Concept | Meaning | Owner | Persistence |
|---|---|---|---|
| Product Session | User-visible workspace conversation and lifecycle identity | Session Manager | session state + append-only transcript |
| Backend Session | Native/vendor runtime identity and capability snapshot for one backend | AgentBackend | `BackendSessionRef`, native id/reference only |
| Turn | One accepted user request and its product lifecycle | Runtime Orchestrator | lifecycle/transcript facts |
| Execution Attempt | One concrete backend invocation with frozen resolved configuration | Attempt Coordinator / Orchestrator | append-only execution history |
| Provider/Deployment/Route | Model-management facts used to resolve an attempt | Model Management domain | versioned state and execution snapshot |

`Product Session.id` is stable across transport and restart. `BackendSessionRef`
may change when native resume is rejected or a cold fallback starts. A Turn can
produce one primary Attempt and at most one policy-permitted technical fallback;
those are separate Attempts even when the user sees one request.

### Ownership Map

| Boundary | Owns | Must not own |
|---|---|---|
| ClientRuntime | Client ports, adapter composition, optimistic UI state, reconnect projection | HTTP/WS/Tauri details in domain components, backend policy, transcript persistence |
| Session Manager | Product Session identity, metadata, revision, workspace scope, transcript repository access | Vendor protocol parsing, route resolution, UI card rendering |
| Runtime Orchestrator | Turn queue, concurrency, cancellation, timeout, approval wait, lifecycle ordering | Vendor-specific JSON/ACP semantics, visual projection |
| Attempt Coordinator | Frozen resolved config, Attempt state, failure/effect classification, safe fallback policy | UI decisions, raw transport I/O, automatic fallback after side effects without policy |
| AgentBackend | Backend Session handle, vendor protocol, normalized AgentEvent, native resume | Product Session persistence, route policy, UI state |
| Transport | JSON stream, PTY, future ACP/native wire I/O | Product entities, authorization, transcript truth |
| Tauri Host | Sidecar process, health, shutdown, scoped OS capabilities | Session, Agent, PTY, transcript, Git business logic |

## Runtime State And Invariants

The normal turn state machine is:

```text
idle -> submitting -> running -> waiting_approval -> running
                       |             |
                       v             v
                    cancelling -> cancelled
                       |
                       v
                 completed | failed | timed_out
```

The following invariants are normative:

1. A Product Session has one lifecycle owner and one revision source.
2. A Session accepts at most one active Turn unless an explicit future feature changes the contract.
3. A Turn has one terminal settlement. Late completion, cancel, timeout, or approval frames are idempotently ignored or classified.
4. Approval is single-flight per Session. Allow, Deny, expiry, and cancellation settle the same approval id at most once; expiry is deny-by-default.
5. Cancellation is idempotent. It cannot duplicate the user message or silently start a fallback Attempt.
6. Resume writes the native token/reference before observers receive the successful terminal lifecycle event.
7. Rejected native resume preserves Product Session history and enters an explicit new-context or cold-fallback state.
8. A technical transport fallback stays inside the current Attempt; a model/route fallback creates a new immutable Attempt.
9. A fallback is automatic only when failure classification proves no forbidden side effect. Unknown or possible side effect requires confirmation.
10. Read-only monitor and Diff paths cannot mutate Workspace or Git state.

Timeout, crash, and shutdown paths must end with a visible lifecycle/error state.
No loading state may remain indefinitely without a health or recovery explanation.

## Event And Projection Pipeline

The only supported direction from vendor wire data to UI is:

```text
raw vendor event
  -> vendor codec / transport parser
  -> normalized AgentEvent
  -> TranscriptEvent or transient TurnDelta
  -> ClientRuntime event port
  -> session/event reducer
  -> Transcript projection
  -> domain card / UI state
```

- `AgentEvent` is backend-neutral and may contain an extension namespace for vendor metadata.
- `TranscriptEvent` is the persisted product fact with stable id, sequence, turn id, and timestamp.
- `TurnDelta` is transient high-rate data. It is not replayed as history and must not be written to global persisted state.
- Unknown vendor events become `diagnostic` with a stable code and raw payload redaction policy.
- Domain components consume projection data, never raw vendor events or transport frames.

## Sequence, Snapshot, Reconnect, And Gap Recovery

Every persisted event has a monotonic Session sequence and stable event id. A client
connection uses this order:

1. Request a snapshot with the last acknowledged sequence.
2. Receive snapshot version and replay cursor.
3. Replay events after the cursor.
4. Subscribe to live events using the same Session/event identity.
5. Deduplicate by event id and sequence; a duplicate must not render a second card.
6. If the requested cursor is below the retention floor or a sequence gap is detected,
   enter `reconnecting`/`gap` state and request a fresh snapshot instead of guessing.

Live, persisted, and optimistic values reconcile as follows:

| State | Source | Rule |
|---|---|---|
| Live | WebSocket/event port | Fast and transient; may be dropped on disconnect |
| Persisted | Session/transcript/attempt repository | Canonical after reload and replay |
| Optimistic | Client action pending | Visible as pending only; replaced by server fact or translated failure |

An optimistic mutation never overwrites a newer persisted revision. A reconnect
must converge to persisted facts, clear stale optimistic actions, and preserve a
diagnostic for any unrecoverable gap.

## Tauri Sidecar Contract

The desktop sequence is:

```text
Tauri launch
  -> create ephemeral launch capability
  -> select/validate packaged sidecar
  -> start exactly one sidecar
  -> wait for bounded /health handshake
  -> inject local endpoint/capability into WebView
  -> serve ClientRuntime over authenticated loopback HTTP/WS
  -> stop new work -> close clients -> stop sidecar -> release host capabilities
```

- Health must report protocol/runtime version and readiness, not secrets or raw paths.
- Restart is bounded. Exhaustion enters `recovery-required` and requires a user-visible action.
- A crash must not create duplicate sidecars or orphan Agent processes.
- Sidecar and UI versions negotiate a compatible protocol before normal mounting.
- The current Rust supervisor and Node HTTP/WS security tests are local evidence;
  a packaged artifact, executable sidecar, WebView, crash recovery, and shutdown run
  are required for `packaged-verified`.

## Local Security Contract

- Runtime binds to loopback only; public listeners and implicit LAN exposure are prohibited.
- Host, Origin, CORS, CSRF, bearer, and WebSocket subprotocol checks are explicit and fail closed.
- The per-launch bearer/CSRF capability is ephemeral, scoped to the WebView, never persisted, and redacted from logs.
- Workspace paths are canonicalized and symlink-checked before file/Git inspection.
- Secret values are resolved only at the server launch boundary. Provider/Secret facts use references and status, never plaintext.
- Tauri capabilities are allowlisted to the declared dialog, notification, clipboard, window, and sidecar actions.
- Web/remote clients cannot invoke arbitrary shell, filesystem, Tauri, or vendor protocol operations.
- Origin and capability failures produce stable local errors and an actionable UI recovery state.

## Observability Contract

The runtime emits bounded, redacted measurements for:

- `runtime_start_ms`, `health_handshake_ms`, and `runtime_shutdown_ms`;
- `turn_first_delta_ms`, `turn_latency_ms`, `event_lag_ms`, and replay/gap counts;
- failure class, retry count, fallback/bridge use, approval wait, cancellation reason;
- sidecar restart count, runtime health state, version compatibility, and recovery-required reason.

Logs and normalized results identify Session/Turn/Attempt by stable ids or redacted
references. They never include credential values, raw auth headers, or unbounded vendor
payloads. Environment, engine version, host OS, WebView, and artifact version are
mandatory metadata for real-engine and packaged runs.

## Capability Truth Table

| Capability | Current declaration | Evidence/exit condition |
|---|---|---|
| Local Web Chat via JSON stream | Supported for declared Codex/Claude paths | Keep real-engine versioned smoke and normalized acceptance current |
| PTY terminal fallback | Supported as explicit local/setup fallback | Preserve scope, readonly, and remediation semantics |
| Native session resume | Compatible where engine/profile records a native token | Real-engine resume evidence per engine; rejected resume must be visible |
| Approval/diff/cancel/retry full journey | Contract and fixture support; real-engine acceptance incomplete | Locked real-engine workspace and normalized journey result |
| Tauri packaged sidecar/WebView | Local supervisor/security implementation; packaged support unverified | Real packaged artifact, crash/restart/shutdown and platform matrix |
| 50k transcript / large Diff | Intended performance target with local small-baseline tests | Browser-backed stress run and normalized performance result |
| `GenericAcpBackend` / ACP | Extension contract only; not supported | Real ACP transport, protocol fixtures, version matrix, and acceptance environment |
| Native SDK | Extension contract only; not supported | Vendor SDK fixture, lifecycle/approval/cancel/resume tests, and real acceptance |
| Remote Control | Deferred Remote reference | New roadmap entry, separate Feature/Test Specs, and explicit security/product approval |

The UI and release notes must use these exact capability statuses. “Compatible” or
“typed” does not mean “supported” when the transport/fixture exit condition is absent.

## Feature Spec Mapping

- MVP02 client/runtime/UI/desktop specifications:
  `cli-gui/doc/mvp02/spec/`
- MVP02 remote-control PRD and specifications:
  `cli-gui/doc/mvp02/`
- Multi-provider routing Feature Specs:
  `.features/CLI-GUI-028-secret-store-provider-connections/` through
  `.features/CLI-GUI-032-model-routing-gui/`
- MVP01 baseline contracts:
  `cli-gui/doc/mvp01/spec/`

## Open Questions

- The first ACP vendor implementations require verified command/protocol fixtures.
- Direct Provider HTTP/SDK connectivity remains deferred; CLI-compatible Provider
  credentials use platform credential stores through `CLI-GUI-028`.
