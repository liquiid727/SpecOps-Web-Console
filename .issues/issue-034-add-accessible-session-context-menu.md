# Add accessible session context menu

## Description
Expose session organization and lifecycle actions through a compact keyboard-accessible context menu.

## Acceptance Criteria
- [x] Open from right-click and a visible keyboard-accessible trigger.
- [x] Include Rename, Pin/Unpin, Archive/Restore, Complete/Reopen, Fork, and Delete.
- [x] Use role=menu with roving arrow-key focus.
- [x] Close on Escape or outside interaction and restore trigger focus.
- [x] Use inverse labels that match current state.
- [x] Route destructive or runtime-affecting actions through confirmation dialogs.
- [x] Refresh or reconcile the active session after mutation.
- [x] Add English/Chinese, focus, keyboard, and action tests.

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
