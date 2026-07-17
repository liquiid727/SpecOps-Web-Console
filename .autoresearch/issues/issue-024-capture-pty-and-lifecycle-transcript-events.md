# Capture PTY and lifecycle transcript events

## Description
Connect the session runtime to transcript persistence without reducing raw terminal responsiveness.

## Acceptance Criteria
- [ ] Record PTY output as neutral pty_output events.
- [ ] Record runtime lifecycle transitions and public error events.
- [ ] Retain raw source and never infer an assistant role for ambiguous output.
- [ ] Serialize transcript appends per session.
- [ ] Broadcast raw terminal output without awaiting disk writes.
- [ ] Keep PTY operation active when transcript append fails.
- [ ] Publish or log a visible recording warning on append failure.
- [ ] Batch lastActiveAt persistence to avoid a state write per output chunk.

## Dependencies
Issues #18, #23

## Type
backend

## Priority
high

## SPEC Reference
SPEC §2.4, §5.5

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
