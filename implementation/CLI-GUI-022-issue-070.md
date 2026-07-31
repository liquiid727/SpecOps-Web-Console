# CLI-GUI-022 Issue 070 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-022`
- Source Issue: `.issues/issue-070-native-session-resume-and-recovery.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/server/orchestrator.ts`: resumeToken writeback via `onRuntimeStatus` (persistent + spawn paths), runs before finishTurn for state consistency.
- `cli-gui/server/application.ts` L72-92: `onRuntimeStatus` callback writes `chatContext.resumeToken` + `backendSessionRef.nativeSessionId`.
- `cli-gui/server/profile-adapters.ts` L148/157: `--resume <token>` injection in buildTurn for claude-family and codex adapters.
- `cli-gui/server/terminal-resume.ts`: `discoverTerminalResumeToken` scans native CLI session directories (codex/claude).
- `cli-gui/server/chat-api.test.ts` L512-541: Multi-turn resume integration test (fake Claude CLI).
- `cli-gui/shared/store.ts`: v3→v4 migration with backup; `BackendSessionRef` persistence.

## Design Decisions

- Resume token is written BEFORE the turn-completed lifecycle event to avoid race conditions between observers and state.
- Rejected resume (PersistentRuntimeUnavailableError) falls back to cold spawn path transparently.
- Terminal resume scans native session directories by mtime+cwd matching; chat resume uses persisted `chatContext.resumeToken`.
- Migration v3→v4 is non-destructive: original file backed up as `.v3.backup`.

## Validation

- `npm --prefix cli-gui run test -- --run`: 50 files, 388 tests passed, 4 skipped.
- Claude multi-turn resume test verifies token progression: sess-1 → sess-2.
- Store migration test covers v3→v4 round-trip with backup preservation.
