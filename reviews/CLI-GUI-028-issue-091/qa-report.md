# QA Report — CLI-GUI-028 / Issue 091

## Handoff and status

Handoff: `implementation/CLI-GUI-028-issue-091.md`.

The normalized result `tests/results/cli-gui-028.issue-091.local.json` is schema `1.0`, standard `specos-test-standard/v1`, with local requirements passed but overall status and release decision `blocked`.

## Evidence matrix

| Requirement | Evidence | Result |
|---|---|---|
| Shared resolver across terminal/backend/persistent paths | Application and chat API integration tests | Passed locally |
| Pre-spawn missing-secret failure and call counts | PTY/backend/persistent zero-execution assertions | Passed locally |
| Persistent provider args and process reuse | Codex MCP runtime test and persistent chat test | Passed locally |
| Canary redaction and concurrent Provider isolation | State/API/transcript/logger/runtime assertions | Passed locally |
| Real engine, platform stores, cross-process, packaged Tauri | No required host/runtime in this workspace; inherited from 089/090 | Blocked |

## Review

`reviews/CLI-GUI-028-issue-091/review-report.md` records the completed review-it helper and no actionable local finding. No standalone `codex review` result is claimed.

## Blockers and minimum recovery

Run the same normalized matrix with a real Codex version and external Provider, then execute Windows/Linux SecretStore, cross-process, and packaged Tauri checks. Do not remove the blocker based only on fake runtimes.

## Decision

**blocked**
