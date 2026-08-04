---
id: CLI-GUI-020
version: "1.0"
title: "CLI-GUI-020 ClientRuntime and Shared Client Ports"
status: rebaseline
goals:
  - "Make the WebView UI depend on one transport-neutral ClientRuntime contract."
  - "Keep HTTP, WebSocket, Tauri, mock, and future remote transport details behind ports."
  - "Preserve workspace, session, transcript, and i18n behavior across local client forms."
nonGoals:
  - "Implement Remote Control or a second remote Session Manager."
  - "Expose raw HTTP, WebSocket, browser, or Tauri APIs to domain components."
  - "Add a new transcript or state store."
actors:
  - "CLI GUI user"
  - "cli-gui-agent"
  - "implementation-agent"
userFlows:
  - name: "Runtime-backed workspace and session flow"
    steps:
      - "Mount a ClientRuntime provider"
      - "Open or restore a workspace through PlatformPort"
      - "Read and mutate session state through SessionPort"
      - "Subscribe to ordered events through EventPort"
      - "Render empty, loading, success, failure, offline, and reconnecting states"
systemFlows:
  - name: "Transport-neutral runtime composition"
    steps:
      - "Compose LocalHttpRuntime, MockClientRuntime, or Tauri platform capabilities"
      - "Translate wire frames into shared port values"
      - "Deduplicate replayed events by event id and sequence"
      - "Expose a recoverable gap state when replay cannot continue"
rules:
  - id: "runtime.ui-uses-ports"
    description: "Business components call ClientRuntime ports and never import transport or platform implementations."
  - id: "runtime.single-session-owner"
    description: "The local runtime remains the owner of Product Session identity, transcript persistence, and lifecycle."
  - id: "runtime.sequence-preserved"
    description: "Event sequence, snapshot, reconnect, replay, deduplication, and gap semantics survive each transport adapter."
edgeCases:
  - "Mock and local runtimes return equivalent port-contract results."
  - "Workspace picker is cancelled, unavailable, timed out, or rejected by the scope policy."
  - "A reconnect receives a duplicate event, stale snapshot, or cursor gap."
  - "A readonly client attempts a mutation."
observability:
  - "Record runtime implementation, transport, connection state, snapshot sequence, reconnect count, and gap reason."
  - "Expose runtime health and last event lag without exposing credentials or absolute remote paths."
tests:
  requiredBranches:
    - happy
    - error
    - edge
    - limit
    - flow
traceability:
  prd: "cli-gui/doc/mvp02/client-platform-prd.md"
api:
  - name: "ClientRuntime session port"
    method: "port"
    path: "client/runtime/ClientRuntime.sessions"
  - name: "ClientRuntime event port"
    method: "port"
    path: "client/runtime/ClientRuntime.events"
ui:
  - name: "Runtime-backed workspace and session shell"
    route: "client/runtime and client/app"
---

# CLI-GUI-020 ClientRuntime and Shared Client Ports

## Meta

- Spec ID: `CLI-GUI-020`
- Spec Version: `1.0`
- Epic: `MVP02-A Desktop Terminal Replacement`
- Status: `rebaseline`
- Source contracts: `cli-gui/doc/mvp02/spec/client-runtime-spec.md`, `cli-gui/doc/mvp02/spec/architecture-spec.md`
- Source PRD: `cli-gui/doc/mvp02/client-platform-prd.md`
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `#061`, `#063`, `#064`
- Implementation handoff: `implementation/CLI-GUI-020-mvp02a-foundation.md`
- Review entry: `reviews/CLI-GUI-020/review-entry.md`
- Test Spec: `.features/CLI-GUI-020-client-runtime-shared-ports/test-spec.md`

## Goal

Give the CLI GUI one stable client-facing runtime contract. React domain components
must be able to run with a deterministic mock, the local HTTP/WebSocket runtime, or
the Tauri platform adapter without changing business logic.

## Why This Exists

The existing implementation has the correct port direction in several places, but
the contract was not represented in the root GoalSpec chain. The rebaseline makes
the boundary reviewable and makes sequence/reconnect behavior part of the feature
contract instead of an implicit adapter detail.

## Out of Scope

- Remote device control, cloud identity, or a second transcript repository.
- Replacing the current local REST and WebSocket protocols.
- Native ACP transport implementation.

## Deliverables

- `ClientRuntime` context and `EnginePort`, `SessionPort`, `EventPort`, `TerminalPort`, `WorkspacePort`, and `PlatformPort` contracts.
- Mock and local runtime contract fixtures with equivalent state and event behavior.
- Workspace selection and desktop capabilities routed through `PlatformPort`.
- Import-guard tests for direct transport access from domain components.
- Sequence, snapshot, replay, deduplication, reconnect, and gap-recovery notes.

## Domain

`Product Session` is a user-facing identity owned by the local runtime. ClientRuntime
is an application boundary, not a domain aggregate. A transport may carry snapshots
and events, but cannot create a competing Session or transcript model.

## Application

The runtime composition selects an implementation once at application bootstrap.
Components call ports, port implementations translate wire data, and the runtime
normalizes event identity before the UI projection layer sees it.

## Repository

No persistence schema change. Existing `state.json`, transcript storage, and WebSocket
contracts remain the source of local facts. Mock state is test-only and deterministic.

## API

The feature defines TypeScript ports rather than new HTTP endpoints. Existing local
endpoints and WebSocket frames remain behind `LocalHttpRuntime`; transport errors
retain stable API error codes and cursor/gap metadata.

## Database Impact

None. Any future runtime metadata must use the existing versioned state migration
contract and must not put transient deltas into persisted session state.

## Test Plan

- Run the same contract suite against `MockClientRuntime` and `LocalHttpRuntime`.
- Assert workspace picker success, cancel, unsupported, timeout, and failure paths.
- Assert replay ordering, duplicate suppression, snapshot reconciliation, reconnect,
  readonly rejection, and cursor gap recovery.
- Use DOM/import guard tests to reject direct HTTP, WebSocket, Tauri invoke, browser
  globals, and raw controls in business components.

## Definition of Done

- Feature and Test Spec are version-bound and linked to Issues `061/063/064`.
- Port contract and mock/local parity have implementation-coupled and independent test entries.
- No feature component imports a transport implementation directly.
- Empty, loading, success, failure, offline, and reconnecting states are mapped in EN/ZH.
- Gate Report exists and remains blocked until normalized independent evidence is produced.
