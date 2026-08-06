# Test Plan — Issue 110

Aggregate the refreshed independent evidence for CLI-GUI-028 issues 089–091 and verify that local gates do not override release blockers.

## Local matrix

- Run the focused SecretStore, store, application, chat API, and persistent MCP runtime suites.
- Run the full Vitest suite and record passed/skipped counts.
- Run typecheck, lint, ui:check, build, `npx specos check`, and `git diff --check`.
- Confirm normalized and raw records contain no credential values.

## Release-boundary matrix

- Confirm source issues 089, 090, and 091 are the latest records and preserve their `blocked` decisions.
- Require real Windows Credential Manager and Linux Secret Service lifecycle evidence.
- Require cross-process credential mutation/rollback evidence.
- Require browser set/replace/delete/readonly/unavailable artifacts with screenshot or trace.
- Require packaged Tauri and real Codex/external Provider evidence.

Missing release-boundary evidence keeps issue 110 `blocked`; local Vitest output is not a substitute for normalized platform or packaged evidence.
