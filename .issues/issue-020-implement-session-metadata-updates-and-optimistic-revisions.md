# Implement session metadata updates and optimistic revisions

## Description
Add authoritative session rename and launch-configuration mutation with conflict detection.

## Acceptance Criteria
- [x] Accept expectedRevision on semantic session updates.
- [x] Increment revision after every successful metadata mutation.
- [x] Reject whitespace-only names and enforce the documented length limit.
- [x] Validate permission, mode, and model values through the selected profile adapter.
- [x] Persist settings that apply on the next start without claiming live application.
- [x] Return a typed revision conflict containing refreshed session metadata.
- [x] Add update, unsupported-option, and conflict tests.

## Dependencies
Issues #15, #16

## Type
backend

## Priority
high

## SPEC Reference
SPEC §3.2–3.3, §4.3

## Source

- Traceability: legacy/unmapped
