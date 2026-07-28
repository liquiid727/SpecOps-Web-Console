# Add accessible session context menu

## Description
Expose session organization and lifecycle actions through a compact keyboard-accessible context menu.

## Acceptance Criteria
- [ ] Open from right-click and a visible keyboard-accessible trigger.
- [ ] Include Rename, Pin/Unpin, Archive/Restore, Complete/Reopen, Fork, and Delete.
- [ ] Use role=menu with roving arrow-key focus.
- [ ] Close on Escape or outside interaction and restore trigger focus.
- [ ] Use inverse labels that match current state.
- [ ] Route destructive or runtime-affecting actions through confirmation dialogs.
- [ ] Refresh or reconcile the active session after mutation.
- [ ] Add English/Chinese, focus, keyboard, and action tests.

## Dependencies
Issues #20, #21, #28, #33

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §2.3; PRD US-008–011

## Source

- Traceability: legacy/unmapped
