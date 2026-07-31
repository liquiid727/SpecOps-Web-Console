# CLI-GUI-021 Issue 072 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-021`
- Source Issue: `.issues/issue-072-in-app-setup-terminal-fallback.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/server/engine-readiness.ts`: `toEngineReadiness` maps detection results to remediation kinds including `open-setup-terminal`.
- `cli-gui/client/components/QuestHome.tsx`: Remediation UI shows reason + "回到 Chat" route when `open-setup-terminal` is triggered.
- `cli-gui/client/app/App.tsx`: `centerView` defaults to "transcript" (not terminal) for structured-engine profiles.
- `cli-gui/client/components/TitleBar.tsx`: Terminal/Chat view toggle with keyboard shortcut.
- `cli-gui/client/i18n.tsx`: `setupTerminalFallback`, `authRequired`, `unsupportedTransport`, `protocolFallback` keys (en+zh).

## Design Decisions

- Terminal is NOT the default view for ready structured engines; only shown as fallback via remediation action.
- `open-setup-terminal` remediation kind is triggered for: auth-required, unsupported-transport, protocol-fallback scenarios.
- Each remediation kind maps to a typed recovery state with specific i18n messaging.
- "Back to Chat" action resets centerView to "transcript" without destroying the terminal session.

## Validation

- `npm --prefix cli-gui run test -- --run`: 50 files, 388 tests passed.
- Engine readiness tests cover all remediation kind mappings.
- QuestHome rendering tested for all 4 states (empty/loading/ready/failed).
