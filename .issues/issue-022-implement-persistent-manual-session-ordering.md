# Implement persistent manual session ordering

## Description
Persist accessible user-defined ordering independently within pinned and unpinned organizational sections.

## Acceptance Criteria
- [x] Accept the complete ordered membership for one organization-status and pinned section.
- [x] Require expected revisions for every member.
- [x] Reject missing, duplicate, foreign, or stale members.
- [x] Assign normalized section-local manualOrder values.
- [x] Do not change lastActiveAt when reordering.
- [x] Return current section metadata on revision conflict.
- [x] Add normalization, conflict, and independent-section tests.

## Dependencies
Issues #20, #21

## Type
backend

## Priority
high

## SPEC Reference
SPEC §3.2, §4.3, §5.6

## Source

- Traceability: legacy/unmapped
