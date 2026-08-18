# Implement AgentBackend contracts, normalized events, and schema v4 migration

## Description
Separate Engine, Transport, and Model Provider ownership. Add stateful backend session/turn handles and migrate persisted session references without breaking MVP01 data.

## Acceptance Criteria
- [x] Implement Codex, Claude, JSON-stream, PTY, and ACP backend boundaries under the AgentBackend contract.
- [x] Normalize text, tool, command, file, approval, usage, completion, cancellation, and structured-error events.
- [x] Persist BackendSessionRef schema v4 and perform a non-destructive v3 migration with backup.
- [x] Make cancellation, approval, timeout, and terminal-state ownership explicit in the Orchestrator.
- [x] Unknown vendor events become diagnostics and never crash a running turn.

## Dependencies
Issue #061

## Type
backend

## Priority
high

## SPEC Reference
CLI-GUI-022; desktop PRD TR-004/TR-007, FR-TR-5; agent-runtime SPEC Sections 1-8.

## Validation
- Unit and integration tests for migration, cancellation race, approval wait, and vendor-event fallback.

## Local Review Status

- Partial on 2026-07-29: full suite passed 48 files and 351 tests; build, UI governance, and diff checks passed.
- Schema v4, exact v3 backup, legacy identity mapping, unknown-field retention, and Orchestrator ownership are accepted locally.
- Accepted on 2026-07-30: production.ts injects createAgentBackendRegistry; application.ts routes turns through AgentBackend when available.
- 49 test files, 369 tests passed. All 12 vendor event categories normalized; unknown events → diagnostic confirmed.
- Native SDK and real ACP protocol fixtures remain unimplemented and are not advertised by the current backend registry.
- Real-engine verified on 2026-07-30 (macOS, codex-cli 0.146.0): `CHAT_ENABLED` turned on; chat session created via API and via Quest Home UI both ran on `backendId: codex / transport: json-stream` with normalized `assistant_message` + `usage` events and zero `pty_output`; `nativeSessionId` persisted (schema v4) and a second turn resumed the native session with context intact. Probe script: `cli-gui/scripts/issue062-real-engine-check.mjs`. Full suite 402 tests passed; build passed.
- Real-engine verified on 2026-07-30 (macOS, claude-code 2.1.211): same probe with `profile-claude` passed both turns — `backendId: claude / transport: json-stream` (`claude -p --output-format stream-json`), normalized `assistant_message` + `usage` events, zero `pty_output`; `nativeSessionId` (claude session UUID) persisted and `--resume` kept context on the second turn.
