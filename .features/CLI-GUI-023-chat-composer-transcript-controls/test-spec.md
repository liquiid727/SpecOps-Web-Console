---
testSpecId: "CLI-GUI-023.test-spec"
testSpecVersion: "1.0"
status: approved
sourceSpec: ".features/CLI-GUI-023-chat-composer-transcript-controls/spec.md"
sourceSpecId: "CLI-GUI-023"
sourceSpecVersion: "1.0"
sourceSpecHash: "51e0f1f9bfecf25cd02fa30abadcf7c8155f7b416425bf4065a7481123c6a53a"
sourceApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04"
testSpecApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04-approved-for-planning"
---

# Independent Test Spec: CLI-GUI-023

Traceability inputs: `cli-gui/doc/mvp02/spec/`,
`cli-gui/doc/mvp02-check-qa/`, `design/cli-gui-platform-design.md`, and
`.issues/issue-066-chat-first-session-creation.md`,
`.issues/issue-067-streaming-transcript-rendering-and-performance.md`,
`.issues/issue-068-turn-control-and-approval-flow.md`.

## Coverage Matrix

| Requirement | Branches | Owner | Required evidence | Gate |
|---|---|---|---|---|
| First-task Chat flow | happy, error, flow | `e2e-test-agent` | trace, screenshot | blocking |
| Transcript projection and delta reconciliation | happy, edge, limit | `unit-test-agent` | trace | blocking |
| Approval/cancel/retry/resume controls | error, limit, flow | `playwright-test-agent` | trace, screenshot | blocking |
| Cross-layer journey and cleanup | happy, error | `e2e-test-agent` | trace, log | blocking |
| Streaming and 50k transcript baseline | limit, flow | `performance-test-agent` | raw-report, trace | blocking |
| Race and duplicate submit invariants | error, limit | `concurrency-test-agent` | trace, raw-report | blocking |

## Scenarios

- Happy: first task creates Chat, first delta appears, final assistant message settles once.
- Limit: no delta before final, 50k events, long output, user scroll lock, and narrow viewport.
- Error: readiness failure, disconnected WebSocket, cancelled turn, retry failure, expired/replayed approval.
- Security: UI cannot invent route/fallback/approval decisions or inject raw HTML.
- Browser: EN/ZH, keyboard focus, IME composition, reduced motion, and second interaction.

## Fixtures And Seams

Use MockClientRuntime event fixtures and a real local runtime adapter. Browser evidence
must include DOM contracts and screenshots/trace refs for blocking journeys.

## Execution And Normalization

Persisted transcript facts and transient deltas must be asserted separately. A skipped
browser/performance or real-engine item is normalized as skipped/blocked with reason,
never as pass.
