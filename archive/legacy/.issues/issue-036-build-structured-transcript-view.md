# Build structured transcript view

## Description
Replace the terminal-only center experience with a replayable message-first transcript while retaining neutral classifications.

## Acceptance Criteria
- [x] Load historical pages when a session is selected.
- [x] Subscribe to the live event channel after replay.
- [x] Deduplicate by immutable event ID and highest contiguous sequence.
- [x] Render user input, neutral CLI output, lifecycle, error, tool activity, and permission requests distinctly.
- [x] Keep stopped, completed, and archived transcripts readable.
- [x] Show loading, empty, reconnecting, retention, truncation, recording-warning, and failure states.
- [x] Provide message copy actions and English/Chinese labels.
- [x] Add replay/live/reconnect component and browser tests.

## Dependencies
Issues #25, #26, #30

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §2.3–2.4, §4.4

## Source

- Traceability: legacy/unmapped
