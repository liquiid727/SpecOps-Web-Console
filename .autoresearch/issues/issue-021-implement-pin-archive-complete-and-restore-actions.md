# Implement pin archive complete and restore actions

## Description
Implement the session organizational state machine independently of PTY runtime state.

## Acceptance Criteria
- [ ] Implement pin and unpin without changing runtime status.
- [ ] Implement archive and restore transitions.
- [ ] Implement complete and reopen transitions.
- [ ] Require explicit stopRunning confirmation before archiving or completing a running session.
- [ ] Stop the PTY before committing a confirmed runtime-affecting transition.
- [ ] Reject start and composer input for archived or completed sessions.
- [ ] Persist organizational timestamps and revisions.
- [ ] Add valid-transition, invalid-transition, and running-confirmation tests.

## Dependencies
Issues #18, #20

## Type
backend

## Priority
high

## SPEC Reference
SPEC §5.2

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
