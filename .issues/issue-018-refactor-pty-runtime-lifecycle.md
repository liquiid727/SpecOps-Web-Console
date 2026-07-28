# Refactor PTY runtime lifecycle

## Description
Move process ownership into an injected PTY runtime and correct start, stop, exit, and shutdown race conditions.

## Acceptance Criteria
- [ ] Add a per-session start lock.
- [ ] Assign a generation token to each started runtime and ignore stale callbacks.
- [ ] Broadcast stopped status before removing runtime subscribers.
- [ ] Prevent a stale onExit callback from mutating a deleted, stopped, or newer session.
- [ ] Preserve direct argument-array launch, ANSI, input, Ctrl+C, and resize behavior.
- [ ] Clamp terminal dimensions to documented limits.
- [ ] Stop all active PTYs during application shutdown.
- [ ] Add race, isolation, stop, exit, and shutdown tests.

## Dependencies
Issues #12, #15, #16

## Type
backend

## Priority
high

## SPEC Reference
SPEC §5.1

## Source

- Traceability: legacy/unmapped
