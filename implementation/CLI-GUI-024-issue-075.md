# CLI-GUI-024 Issue 075 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-024`
- Source Issue: `.issues/issue-075-mvp02a-real-engine-no-external-terminal-acceptance.md`
- Status: `skipped-environment`

## Acceptance Matrix

| Step | Description | Status |
|------|-------------|--------|
| 1 | Folder selection via PlatformAdapter | Covered by unit test |
| 2 | Engine readiness detection | Covered by engine-readiness.test.ts |
| 3 | First chat turn (prompt → structured response) | Covered by chat-api.test.ts |
| 4 | Streaming transcript rendering | Covered by transcript-display.test.ts |
| 5 | Approval flow (request → allow/deny) | Covered by orchestrator.test.ts |
| 6 | Readonly diff inspection | Covered by contract-security.test.ts |
| 7 | Cancel turn mid-execution | Covered by orchestrator.test.ts |
| 8 | Retry after failure | Covered by orchestrator.test.ts |
| 9 | Session restart (stop → start) | Covered by chat-api.test.ts |
| 10 | Native session resume | Covered by chat-api.test.ts (Claude multi-turn) |

## Automated Coverage Summary

All 10 acceptance steps have corresponding automated test coverage via unit/integration tests. The automated subset validates the contract, data flow, and state transitions without requiring real engine binaries.

## Skipped Items

- Full end-to-end acceptance with locked Codex CLI binary (requires real $CODEX_HOME).
- Full end-to-end acceptance with locked Claude Code binary (requires real ~/.claude).
- Visual acceptance of streaming rendering in WebView (requires packaged Tauri app).
- Cross-platform validation (macOS/Windows/Linux) (requires CI matrix).

## Validation

- `npm --prefix cli-gui run test -- --run`: 50 files, 388 tests passed, 4 skipped.
- All automated acceptance paths verified through test suite.
- Real-engine acceptance deferred until binary availability and packaging infrastructure are ready.
