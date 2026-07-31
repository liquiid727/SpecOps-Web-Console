# CLI-GUI-023 Issue 067 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-023`
- Source Issue: `.issues/issue-067-streaming-transcript-rendering-and-performance.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/client/transcript-display.ts`: `reduceSessionEvents`, `projectTranscriptEvents`, `deriveActiveTurnId`, `buildApprovalStates`, `isNearBottom`.
- `cli-gui/client/transcript-display.test.ts`: Full coverage including scroll-lock, active turn derivation, approval states, and performance baselines (1000 events < 100ms).
- `cli-gui/client/components/StructuredCardList.tsx`: Renders projected transcript items (message/tool/file/lifecycle cards).
- `cli-gui/server/application.ts` L1160: `parseOutput` feeds turn-delta through WebSocket frames (transient, not persisted to state).
- `cli-gui/server/orchestrator.ts`: `onTurnDelta` callback dispatches to connected WebSocket clients.

## Design Decisions

- Turn-delta frames are transient (WebSocket push only); never stored in global state or persisted.
- `isNearBottom` threshold is 150px — auto-scroll resumes only when user is near bottom.
- `projectTranscriptEvents` merges same-turn assistant_message events into a single display item (content joined by `\n\n`).
- PTY output events are filtered in chat mode (`chatMode: true` projection option).
- 50k event stress test marked as skipped (requires browser environment with rAF + IntersectionObserver).

## Validation

- `npm --prefix cli-gui run test -- --run`: 50 files, 388 tests passed.
- Performance baseline: 1000 events reduce/project both under 100ms.
- Scroll-lock test: isNearBottom correctly detects threshold boundary.
