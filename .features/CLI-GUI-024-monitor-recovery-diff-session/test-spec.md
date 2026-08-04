---
testSpecId: "CLI-GUI-024.test-spec"
testSpecVersion: "1.0"
status: approved
sourceSpec: ".features/CLI-GUI-024-monitor-recovery-diff-session/spec.md"
sourceSpecId: "CLI-GUI-024"
sourceSpecVersion: "1.0"
sourceSpecHash: "ae54f44e74509af61403643484636c2b6262a0d016f9ca0445f74150e2921276"
sourceApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04"
testSpecApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04-approved-for-planning"
---

# Independent Test Spec: CLI-GUI-024

Traceability inputs: `cli-gui/doc/mvp02/spec/`,
`cli-gui/doc/mvp02-check-qa/`, `design/cli-gui-platform-design.md`, and
`.issues/issue-069-runtime-monitor-and-readonly-diff.md`,
`.issues/issue-073-responsive-workbench-and-accessible-i18n-states.md`,
`.issues/issue-074-mvp02a-contract-performance-and-security-suites.md`,
`.issues/issue-075-mvp02a-real-engine-no-external-terminal-acceptance.md`.

## Coverage Matrix

| Requirement | Branches | Owner | Required evidence | Gate |
|---|---|---|---|---|
| Read-only monitor and Diff contract | happy, error, edge | `test-editor` | trace, raw-report | blocking |
| Workspace/symlink/bounded output security | error, limit | `specialized-check-agent` | raw-report | blocking |
| State, i18n, a11y, and responsive UI | happy, error, edge, flow | `playwright-test-agent` | trace, screenshot | blocking |
| Multi-session and live/persisted reconciliation | limit, flow | `concurrency-test-agent` | trace, raw-report | blocking |
| 50k transcript and large Diff performance | limit | `performance-test-agent` | raw-report, trace | blocking |
| Real-engine full journey | happy, error, flow | `e2e-test-agent` | trace, log | blocking |

## Scenarios

- Happy: inspect Summary/Progress/Files/Diff/Git and recover a Session without mutation.
- Limit: non-Git, binary, truncated, large, partial, and timeout responses.
- Error: symlink escape, readonly mutation, stale revision, offline/reconnect, and notification failure.
- Browser: desktop three-column and narrow drill-in states with no overflow or focus loss.
- Real engine: Codex/Claude approval, diff, cancel, retry, restart, and resume are separate outcomes.

## Fixtures And Seams

Use canonical workspace fixtures, fake Git inspector, bounded response fixtures, MockClientRuntime,
browser viewport matrix, and locked real-engine workspaces. Do not infer packaged acceptance from unit tests.

## Execution And Normalization

Every skipped platform, 50k stress run, and real-engine step must carry environment,
reason, owner, and follow-up gate. QA consumes the normalized record only.
