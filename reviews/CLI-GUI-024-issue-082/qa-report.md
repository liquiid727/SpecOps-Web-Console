# QA Report — Issue #082 / CLI-GUI-024

## Decision

`blocked`

## Evidence summary

- Focused deterministic local contracts: **79 passed**.
- `typecheck`, `build`, and `ui:check`: **passed**.
- Codex `0.146.0` and Claude `2.1.220`: **version detection only**; this is not real-engine journey evidence.
- `smoke:real-cli`: **exit 1** because Codex authenticated prompt validation was unavailable and the abnormal lifecycle timed out.
- Historical first/resume/stop records are **historical/partial** and cannot be promoted to current independent verification.
- Current complete Stop/Retry/restart/resume trace is missing.
- Real Codex and Claude approval/Diff evidence is missing, including browser Approval → Diff traces.

The issue checkboxes, historical records, and raw command output do not establish `accepted` or `independently verified` status. The normalized result correctly remains `blocked`.

## Recovery conditions

1. Provide an authenticated Codex prompt and run both engines in an isolated environment.
2. Re-run the complete current Stop/Retry/restart/resume journey and retain engine logs, transcript, and trace artifacts.
3. In an isolated writable Git workspace, capture real Codex and Claude approval decisions and resulting Diff state.
4. Capture browser Approval → Diff DOM/trace evidence and update the normalized result with environment, owners, attempts, and artifact references.

## Remaining risks

- Real-engine behavior, approval protocol, retry idempotency, restart recovery, and native resume are not currently proven for this run.
- The Approval → Diff UI and resulting workspace changes have no browser or real-engine evidence.
- Historical environment/version differences and the lifecycle timeout leave reproducibility unresolved.

