---
testSpecId: "CLI-GUI-022.test-spec"
testSpecVersion: "1.0"
status: approved
sourceSpec: ".features/CLI-GUI-022-agent-backend-normalized-events/spec.md"
sourceSpecId: "CLI-GUI-022"
sourceSpecVersion: "1.0"
sourceSpecHash: "5fd7cdf314d9ecdf7fa3981344d8a2de912c4cccf4d1f2d14e47b08445dd13e6"
sourceApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04"
testSpecApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04-approved-for-planning"
---

# Independent Test Spec: CLI-GUI-022

Traceability inputs: `cli-gui/doc/mvp02/spec/`,
`cli-gui/doc/mvp02-check-qa/`, `design/cli-gui-platform-design.md`, and
`.issues/issue-062-agent-backend-normalized-events-and-schema-v4.md`,
`.issues/issue-070-native-session-resume-and-recovery.md`.

## Coverage Matrix

| Requirement | Branches | Owner | Required evidence | Gate |
|---|---|---|---|---|
| AgentBackend session/turn contract | happy, error, flow | `unit-test-agent` | trace | blocking |
| Event normalization and diagnostics | happy, edge, error | `test-editor` | trace, raw-report | blocking |
| Approval/cancel/timeout settlement | error, limit, flow | `concurrency-test-agent` | trace, raw-report | blocking |
| Schema migration and native resume | happy, error, edge | `specialized-check-agent` | trace, raw-report | blocking |
| Real engine JSON-stream behavior | happy, flow | `e2e-test-agent` | trace, log | blocking |
| ACP/native SDK capability claim | edge | `test-editor` | raw-report | blocking until fixture exists |

## Scenarios

- Happy: Codex and Claude structured streams produce normalized assistant, usage, lifecycle, and resume facts.
- Limit: every supported event category, large delta, reconnect, and duplicate terminal frame.
- Error: malformed/unknown vendor event, rejected resume, persistent runtime failure, and compatibility bridge.
- Security: native/session references are non-secret; raw environment and credential values never enter events.
- Concurrency: cancel versus completion, approval versus timeout, and retry versus duplicate submit settle once.

## Fixtures And Seams

Use vendor JSON fixtures, `AgentBackend` fake handles, migration snapshots, real-engine
probe scripts, and an explicit ACP protocol fixture. A typed ACP interface without the
fixture is an unaccepted extension, not a passing test.

## Execution And Normalization

Normalized items must identify backend, transport, real/mock mode, event sequence,
fallback/bridge status, and artifact refs. Raw CLI logs are supporting evidence only.
