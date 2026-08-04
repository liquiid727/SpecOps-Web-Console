# CLI-GUI-023 MVP02-A Foundation Handoff

## Meta

- Feature Spec: `.features/CLI-GUI-023-chat-composer-transcript-controls/spec.md` v1.0
- Test Spec: `.features/CLI-GUI-023-chat-composer-transcript-controls/test-spec.md` v1.0
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `.issues/issue-066-chat-first-session-creation.md`, `.issues/issue-067-streaming-transcript-rendering-and-performance.md`, `.issues/issue-068-turn-control-and-approval-flow.md`
- Status: `implemented`, `locally-verified`; real-engine `partial`; independent evidence `missing`

## Existing Implementation Evidence

- First-task flow: `cli-gui/client/components/QuestHome.tsx` and `client/app/App.tsx`.
- Transcript projection/performance: `cli-gui/client/transcript-display.ts` and tests.
- Approval/cancel lifecycle: `cli-gui/server/orchestrator.ts`, `client/components/cards/ApprovalCard.tsx`.

## Local Verification

Local component/orchestrator tests cover streaming projection, approval expiry/replay,
cancel races, and draft behavior. The 50k browser stress case and full real-engine
approval/diff/cancel/retry journey remain unverified.

## Handoff To Testing

- Run browser/E2E tests for first task, second interaction, delta/final reconciliation,
  approval, cancel, retry, reconnect, focus, IME, and responsive states.
- Run performance and concurrency tests with normalized evidence.
- Separate transient delta assertions from persisted transcript assertions.

## Blockers

- No independent normalized result.
- 50k transcript evidence is missing.
- Real-engine approval/diff/full control journey is incomplete.
