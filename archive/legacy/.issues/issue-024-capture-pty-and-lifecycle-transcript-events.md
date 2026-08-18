# Capture PTY and lifecycle transcript events

## Description
Connect the session runtime to transcript persistence without reducing raw terminal responsiveness.

## Acceptance Criteria
- [x] Record PTY output as neutral pty_output events.
- [x] Record runtime lifecycle transitions and public error events.
- [x] Retain raw source and never infer an assistant role for ambiguous output.
- [x] Serialize transcript appends per session.
- [x] Broadcast raw terminal output without awaiting disk writes.
- [x] Keep PTY operation active when transcript append fails.
- [x] Publish or log a visible recording warning on append failure.
- [x] Batch lastActiveAt persistence to avoid a state write per output chunk.

## Dependencies
Issues #18, #23

## Type
backend

## Priority
high

## SPEC Reference
SPEC §2.4, §5.5

## Source

- Traceability: legacy/unmapped
