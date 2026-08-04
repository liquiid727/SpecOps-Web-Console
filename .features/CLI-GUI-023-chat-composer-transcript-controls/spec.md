---
id: CLI-GUI-023
version: "1.0"
title: "CLI-GUI-023 Capability-Driven Chat, Composer, and Transcript Controls"
status: rebaseline
goals:
  - "Let a ready user create a Chat Session from a first task without an external terminal."
  - "Render normalized streaming transcript events as stable domain cards and messages."
  - "Provide explicit cancel, retry, approval, and resume controls with one terminal outcome."
nonGoals:
  - "Make Terminal the default structured-engine view."
  - "Persist per-token deltas as transcript facts."
  - "Implement model routing, Remote Control, or arbitrary shell access."
actors:
  - "CLI GUI user"
  - "Quest Home"
  - "Transcript projection"
  - "Runtime Orchestrator"
userFlows:
  - name: "First task to structured Chat"
    steps:
      - "Enter a task and choose Workspace/Profile/Model/Permission"
      - "Create a Chat Session when readiness permits"
      - "Receive streaming deltas and a final persisted assistant message"
      - "Inspect tool, file, approval, usage, lifecycle, and diagnostic cards"
      - "Cancel, retry, approve, deny, or resume using explicit controls"
systemFlows:
  - name: "Transient delta and persisted transcript reconciliation"
    steps:
      - "Buffer turn-delta outside global persisted state"
      - "Project normalized events into domain cards"
      - "Reconcile final TranscriptEvent by turn id without duplication"
      - "Keep scroll lock and Back to latest behavior stable"
rules:
  - id: "chat.readiness-first"
    description: "The first task enters Chat only when the selected engine advertises supported structured capability."
  - id: "chat.delta-transient"
    description: "High-rate deltas are transient UI data and the final assistant message is the persisted fact."
  - id: "chat.approval-single-flight"
    description: "One approval decision wins; expiry and replay are terminal and understandable."
  - id: "chat.cancel-idempotent"
    description: "Cancel is idempotent and cannot create a duplicate user message or fallback attempt."
edgeCases:
  - "No profiles, readiness loading, all probes failed, or structured Chat is unavailable."
  - "No delta arrives before final message, reconnect occurs during a turn, or final event is replayed."
  - "User scrolls away while deltas arrive."
  - "Approval expires, is replayed, or cancel races with approval settlement."
observability:
  - "Record first-task duration, first delta latency, turn latency, delta lag, approval wait, cancel reason, and retry outcome."
  - "Record dropped/replayed/gap events without storing raw secret or vendor payloads."
tests:
  requiredBranches:
    - happy
    - error
    - edge
    - limit
    - flow
traceability:
  prd: ".prd/prd-chat-streaming-and-persistent-runtime.md"
api:
  - name: "Create Chat Session"
    method: "POST"
    path: "/api/sessions"
  - name: "Submit or control turn"
    method: "POST"
    path: "/api/sessions/:id/chat"
ui:
  - name: "Quest Home first-task flow"
    route: "client/components/QuestHome"
  - name: "Transcript and control cards"
    route: "client/components/TranscriptPanel and client/components/cards"
---

# CLI-GUI-023 Capability-Driven Chat, Composer, and Transcript Controls

## Meta

- Spec ID: `CLI-GUI-023`
- Spec Version: `1.0`
- Epic: `MVP02-A Desktop Terminal Replacement`
- Status: `rebaseline`
- Source contracts: `cli-gui/doc/mvp02/spec/ui-interaction-spec.md`, `cli-gui/doc/mvp02/spec/client-runtime-spec.md`
- Source PRD: `.prd/prd-chat-streaming-and-persistent-runtime.md`
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `#066`, `#067`, `#068`
- Implementation handoff: `implementation/CLI-GUI-023-mvp02a-foundation.md`
- Review entry: `reviews/CLI-GUI-023/review-entry.md`
- Test Spec: `.features/CLI-GUI-023-chat-composer-transcript-controls/test-spec.md`

## Goal

Make the first useful interaction task-first and Chat-first for supported engines,
while preserving a raw Terminal fallback and a recoverable structured transcript.

## Why This Exists

The current UI implementation includes Quest Home, structured cards, transient deltas,
approval controls, and resume behavior. The old docs describe them in separate slices,
so the cross-layer invariants were easy to overstate from local tests.

## Out of Scope

- Full real-engine approval/diff/retry acceptance, which remains a gate obligation.
- Persisting incremental deltas or exposing reasoning content as a separate contract.
- Direct browser access to execution transports.

## Deliverables

- Capability-driven Quest Home flow with task draft preservation.
- Transcript projection for user/assistant/tool/command/file/approval/progress/usage/lifecycle/error.
- Scroll lock, bounded delta buffering, final-message deduplication, and replay/gap handling.
- Idempotent cancel, explicit retry, approval wait/expiry/settlement, and resume UI states.
- EN/ZH, responsive, focus, and reduced-motion coverage.

## Domain

The UI projects Product Session, Turn, and Attempt facts. It does not decide routing,
fallback safety, approval authorization, or native resume policy; those are server/runtime facts.

## Application

Quest Home asks ClientRuntime for readiness and session creation. TranscriptPanel consumes
normalized events and transient deltas. Control actions call runtime ports and render the
resulting state, including pending, offline, reconnecting, and readonly states.

## Repository

No new persistent store. Final transcript events use the existing append-only repository;
delta buffers and optimistic control state are bounded to the active client session.

## API

Existing session/chat/event/approval routes remain stable. Each mutating action preserves
client idempotency and stable error codes such as `TURN_IN_PROGRESS`, `TURN_NOT_ACTIVE`,
and `APPROVAL_NOT_PENDING`.

## Database Impact

None. Resume metadata follows `CLI-GUI-022`; UI preferences do not store transcript or
execution facts.

## Test Plan

- Component tests for all primary card states, projection determinism, scroll lock, and i18n.
- Browser tests for first task, second interaction, cancel/retry, approval, reconnect, and responsive states.
- E2E tests cover UI action, API response, persisted transcript, and cleanup.
- Performance tests include 50k synthetic normalized events and high-rate delta batching.
- Real-engine evidence must be reported separately from mock/fixture coverage.

## Definition of Done

- Chat-first path is readiness-driven and does not silently downgrade.
- Delta and final transcript reconciliation has no duplicate message.
- Approval/cancel/retry state machines are explicit and idempotent.
- Independent normalized browser/E2E evidence exists for blocking flows.
