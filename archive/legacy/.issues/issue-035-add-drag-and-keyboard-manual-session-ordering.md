# Add drag-and-keyboard manual session ordering

## Description
Implement pointer/touch reordering while retaining a complete keyboard alternative.

## Acceptance Criteria
- [x] Add @dnd-kit/core, sortable, and utilities in cli-gui only.
- [x] Show drag handles only in Manual mode.
- [x] Restrict movement to the current pinned/unpinned organization section.
- [x] Persist the final complete order through the reorder API.
- [x] Provide explicit Move up and Move down controls.
- [x] Announce keyboard moves through an accessible live region.
- [x] Handle revision conflicts by refreshing and asking the user to retry.
- [x] Add component and browser interaction tests.

## Dependencies
Issues #22, #33

## Type
frontend

## Priority
medium

## SPEC Reference
SPEC §5.6, §12

## Source

- Traceability: legacy/unmapped
