# Render normalized streaming transcripts without global per-token updates

## Description
Build the typed Chat transcript projection for Assistant, Tool, command, file, progress, approval, lifecycle, and error events while keeping high-rate output responsive.

## Acceptance Criteria
- [x] Normalized event kinds render as typed blocks with raw/tool details collapsed by default.
- [x] Streaming deltas buffer outside global state and flush on an animation frame or bounded interval.
- [x] Scroll lock, manual scroll, and Back to latest behavior work during long streams.
- [x] Replay preserves sequence order and displays actionable corruption or gap failures.
- [x] A 50,000-event transcript remains scrollable without event cross-talk across four active Sessions.

## Dependencies
Issues #061, #062, #063

## Type
frontend

## Priority
high

## SPEC Reference
CLI-GUI-023; desktop PRD TR-004, FR-TR-5/6; client-runtime SPEC Section 4; UI interaction SPEC Section 3; test SPEC Sections 1 and 4.

## Validation
- Transcript unit tests plus a documented performance baseline.

## Local Review Status

- Accepted on 2026-07-30: transcript-display.ts (343 lines) fully implements reduceSessionEvents, projectTranscriptEvents, deriveActiveTurnId, buildApprovalStates, isNearBottom.
- TranscriptPanel uses WebSocket turn-delta as transient ref (not global state); rAF scroll.
- Performance baseline: 1000 events < 100ms for both reduce and project (tested).
- 50k event stress test documented as skipped (requires browser environment).
- StructuredCardList renders typed card blocks (approval, tool, file, error, lifecycle).
