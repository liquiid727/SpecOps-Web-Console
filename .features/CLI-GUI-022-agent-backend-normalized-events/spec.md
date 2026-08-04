---
id: CLI-GUI-022
version: "1.0"
title: "CLI-GUI-022 AgentBackend and Normalized AgentEvent"
status: rebaseline
goals:
  - "Make AgentBackend the explicit stateful boundary for vendor execution."
  - "Normalize vendor events into stable AgentEvent categories and transcript facts."
  - "Persist native session identity without confusing it with Product Session identity."
nonGoals:
  - "Advertise native SDK or ACP transport without protocol fixtures."
  - "Move vendor parsing into React components."
  - "Replace the existing ProfileAgentBackend compatibility bridge in this documentation task."
actors:
  - "Runtime Orchestrator"
  - "AgentBackend"
  - "vendor CLI"
  - "testing-agent"
userFlows:
  - name: "Structured Agent turn"
    steps:
      - "Open or resume a Backend Session"
      - "Run one turn through AgentBackend"
      - "Normalize raw vendor output into AgentEvent"
      - "Persist TranscriptEvent facts and transient deltas separately"
      - "Settle completion, cancellation, approval, timeout, or error once"
systemFlows:
  - name: "Raw event normalization"
    steps:
      - "Read JSON stream, PTY, or future ACP transport"
      - "Apply vendor codec and schema validation"
      - "Map known events to AgentEvent"
      - "Degrade unknown events to diagnostic"
      - "Emit ordered lifecycle and status frames"
rules:
  - id: "backend.session-stateful"
    description: "BackendSessionHandle owns native session state and capabilities for one backend session."
  - id: "backend.product-native-identity"
    description: "Product Session id and nativeSessionId are distinct and both remain traceable."
  - id: "backend.unknown-diagnostic"
    description: "Unknown vendor events become diagnostics and never silently claim a supported capability."
  - id: "backend.single-terminal-settlement"
    description: "A turn has one authoritative terminal outcome even when completion, cancel, timeout, or approval races."
edgeCases:
  - "Malformed or unknown vendor event."
  - "Native resume token is rejected or unavailable."
  - "Persistent runtime fails and a compatibility spawn path is used."
  - "ACP/native SDK metadata exists only as an extension contract without fixtures."
observability:
  - "Record backend id, transport, session id hash/reference, event lag, normalization fallback, and terminal reason."
  - "Expose bridge/fallback use as a classified runtime status."
tests:
  requiredBranches:
    - happy
    - error
    - edge
    - limit
    - flow
traceability:
  prd: "cli-gui/doc/mvp02/spec/agent-runtime-spec.md"
api:
  - name: "Agent event WebSocket stream"
    method: "WS"
    path: "/ws/sessions/:id/events"
  - name: "Chat turn submission"
    method: "POST"
    path: "/api/sessions/:id/chat"
ui:
  - name: "Normalized transcript projection"
    route: "client/transcript-display and client/components/cards"
---

# CLI-GUI-022 AgentBackend and Normalized AgentEvent

## Meta

- Spec ID: `CLI-GUI-022`
- Spec Version: `1.0`
- Epic: `MVP02-A Desktop Terminal Replacement`
- Status: `rebaseline`
- Source contracts: `cli-gui/doc/mvp02/spec/agent-runtime-spec.md`, `cli-gui/doc/mvp02/spec/architecture-spec.md`
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `#062`, `#070`
- Implementation handoff: `implementation/CLI-GUI-022-mvp02a-foundation.md`
- Review entry: `reviews/CLI-GUI-022/review-entry.md`
- Test Spec: `.features/CLI-GUI-022-agent-backend-normalized-events/test-spec.md`

## Goal

Freeze the runtime boundary from raw vendor output to product facts. The
Orchestrator owns turn lifecycle and concurrency; AgentBackend owns backend session
and vendor protocol behavior; the UI only consumes normalized events and projections.

## Why This Exists

The implementation has moved beyond the old one-shot parser path, and Codex/Claude
real-engine notes prove only a subset of the intended boundary. A root Feature Spec
is needed to distinguish the proven JSON-stream path from ACP/native SDK extension points.

## Out of Scope

- Direct Provider HTTP/SDK execution.
- A production ACP transport without a real fixture, version matrix, and acceptance environment.
- Replacing all historical ProfileAgentBackend fallback code in this slice.

## Deliverables

- `AgentBackend.openSession`, backend session handle, and turn execution contracts.
- Normalization for text, progress, tool, command, file change, approval, usage,
  completed, cancelled, error, and diagnostic events.
- Schema v4 BackendSessionRef migration and native resume writeback.
- Explicit fallback/bridge status and unknown-vendor diagnostic behavior.
- Real-engine fixture contract for future ACP/native transport exit criteria.

## Domain

The bounded context contains Product Session, Backend Session, Turn, and Execution
Attempt. Backend Session is an integration identity; Turn is the product request
lifecycle; Attempt is the concrete backend invocation and immutable configuration snapshot.

## Application

`RuntimeOrchestrator` serializes turns, handles approval/cancel/timeout, and settles
state. `AgentBackend` does not own UI projections or persisted transcript policy.

## Repository

Schema v3 to v4 migration remains non-destructive and backed up. Native session ids
are persisted as references; raw credentials and transient deltas are excluded.

## API

Existing chat and event routes retain their IDs, lifecycle ordering, and stable errors.
`turn-delta` remains transient; `TranscriptEvent` is the persisted replay contract.

## Database Impact

No database. AppState schema v4 and transcript append/replay behavior are the migration
surface; migration failure must preserve the original state and start no process.

## Test Plan

- Contract tests for every normalized event kind and unknown-event diagnostics.
- Orchestrator races for approval, cancel, timeout, duplicate completion, and retry.
- Migration/resume tests for v3 to v4, rejected native resume, and cold fallback.
- Real Codex/Claude evidence for the supported JSON-stream path.
- ACP fixture tests remain blocking before any ACP/native SDK capability is advertised.

## Definition of Done

- Production composition uses AgentBackend where the contract declares it.
- Native and Product identities remain distinct and recoverable.
- All bridge/fallback use is observable and not presented as ACP support.
- Independent normalized evidence covers P0 lifecycle and redaction requirements.
