# Add drag-and-keyboard manual session ordering

## Description
Implement pointer/touch reordering while retaining a complete keyboard alternative.

## Acceptance Criteria
- [ ] Add @dnd-kit/core, sortable, and utilities in cli-gui only.
- [ ] Show drag handles only in Manual mode.
- [ ] Restrict movement to the current pinned/unpinned organization section.
- [ ] Persist the final complete order through the reorder API.
- [ ] Provide explicit Move up and Move down controls.
- [ ] Announce keyboard moves through an accessible live region.
- [ ] Handle revision conflicts by refreshing and asking the user to retry.
- [ ] Add component and browser interaction tests.

## Dependencies
Issues #22, #33

## Type
frontend

## Priority
medium

## SPEC Reference
SPEC §5.6, §12

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
