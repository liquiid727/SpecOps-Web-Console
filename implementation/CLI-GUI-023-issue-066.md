# CLI-GUI-023 Issue 066 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-023`
- Source Issue: `.issues/issue-066-chat-first-session-creation.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/client/components/QuestHome.tsx`: Task-first flow (prompt → workspace/engine selection → create). Engine readiness display with remediation actions.
- `cli-gui/client/app/App.tsx`: `quickCreateSession` + `createSession` with interactionMode downgrade support. CHAT_ENABLED feature flag controls availability.
- `cli-gui/client/feature-flags.ts`: `CHAT_ENABLED = false` (off by default; readiness-driven activation).
- `cli-gui/client/i18n.tsx`: Full en/zh coverage for session creation states (empty/loading/ready/failed), downgrade feedback messages.
- `cli-gui/client/components/PromptComposer.tsx`: Integrated with QuestHome for quick-session creation.

## Design Decisions

- Chat is the default mode when CHAT_ENABLED is true AND engine readiness reports "full" guiMode.
- Downgrade from chat to terminal happens transparently when profile doesn't support headless turns; user sees a translated notification.
- Session name auto-derived from first prompt (truncated to 50 chars).
- QuestHome shows 4 states: empty (no profiles), loading (detecting capabilities), ready (profiles available), failed (all probes failed).

## Validation

- `npm --prefix cli-gui run test -- --run`: 50 files, 388 tests passed.
- Engine readiness tests verify all status mappings (installed/missing/auth-required/unsupported/timeout).
- Downgrade path covered by chat-api.test.ts "downgrades generic chat sessions to terminal" test.
