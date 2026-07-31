# Implement pin archive complete and restore actions

## Description
Implement the session organizational state machine independently of PTY runtime state.

## Acceptance Criteria
- [x] Implement pin and unpin without changing runtime status.
- [x] Implement archive and restore transitions.
- [x] Implement complete and reopen transitions.
- [x] Require explicit stopRunning confirmation before archiving or completing a running session.
- [x] Stop the PTY before committing a confirmed runtime-affecting transition.
- [x] Reject start and composer input for archived or completed sessions.
- [x] Persist organizational timestamps and revisions.
- [x] Add valid-transition, invalid-transition, and running-confirmation tests.

## Dependencies
Issues #18, #20

## Type
backend

## Priority
high

## SPEC Reference
SPEC §5.2

## Source

- Traceability: legacy/unmapped
