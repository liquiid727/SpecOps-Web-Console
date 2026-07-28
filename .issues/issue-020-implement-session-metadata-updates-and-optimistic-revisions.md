# Implement session metadata updates and optimistic revisions

## Description
Add authoritative session rename and launch-configuration mutation with conflict detection.

## Acceptance Criteria
- [ ] Accept expectedRevision on semantic session updates.
- [ ] Increment revision after every successful metadata mutation.
- [ ] Reject whitespace-only names and enforce the documented length limit.
- [ ] Validate permission, mode, and model values through the selected profile adapter.
- [ ] Persist settings that apply on the next start without claiming live application.
- [ ] Return a typed revision conflict containing refreshed session metadata.
- [ ] Add update, unsupported-option, and conflict tests.

## Dependencies
Issues #15, #16

## Type
backend

## Priority
high

## SPEC Reference
SPEC §3.2–3.3, §4.3

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
