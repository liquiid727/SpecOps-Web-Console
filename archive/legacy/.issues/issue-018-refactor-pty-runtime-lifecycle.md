# Refactor PTY runtime lifecycle

## Description
Move process ownership into an injected PTY runtime and correct start, stop, exit, and shutdown race conditions.

## Acceptance Criteria
- [x] Add a per-session start lock.
- [x] Assign a generation token to each started runtime and ignore stale callbacks.
- [x] Broadcast stopped status before removing runtime subscribers.
- [x] Prevent a stale onExit callback from mutating a deleted, stopped, or newer session.
- [x] Preserve direct argument-array launch, ANSI, input, Ctrl+C, and resize behavior.
- [x] Clamp terminal dimensions to documented limits.
- [x] Stop all active PTYs during application shutdown.
- [x] Add race, isolation, stop, exit, and shutdown tests.

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
