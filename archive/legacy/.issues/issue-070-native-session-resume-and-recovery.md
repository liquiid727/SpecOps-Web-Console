# Preserve and resume native Agent sessions across restart

## Description
Replay full history after app restart and continue Codex or Claude native sessions when supported, with an explicit context-rebuild path when native continuation is rejected.

## Acceptance Criteria
- [x] Persist BackendSessionRef data needed for native resume without losing MVP01 sessions or transcripts.
- [x] Restart replays transcript before attempting native continuation.
- [x] A rejected native session preserves history and offers a clearly labeled new-context path.
- [x] Resume distinguishes native continuation from rebuilt context in the Session UI.
- [x] Migration failure preserves the original state file, leaves a backup, and starts no Agent process.

## Dependencies
Issues #062, #067

## Type
fullstack

## Priority
high

## SPEC Reference
CLI-GUI-022; desktop PRD TR-007, FR-TR-5; agent-runtime SPEC Sections 6 and 8; UI interaction SPEC Section 7.

## Validation
- Restart fixture for accepted and rejected Codex/Claude native resume paths.

## Local Review Status

- Accepted on 2026-07-30: terminal-resume.ts discovers resume tokens from CLI session directories.
- chatContext.resumeToken written back on successful turn (orchestrator L467-468 → onRuntimeStatus).
- BackendSessionRef.nativeSessionId persisted in schema v4; v3→v4 migration tested (store.test.ts).
- clearFailedTerminalResume clears token on error, emits lifecycle event for "resume failed".
- terminal-resume.test.ts: 8 tests cover codex/claude attribution, CODEX_HOME override, corrupt files.
- i18n: resumeContinuesCli key distinguishes native continuation in UI.
