# Implement persistent manual session ordering

## Description
Persist accessible user-defined ordering independently within pinned and unpinned organizational sections.

## Acceptance Criteria
- [ ] Accept the complete ordered membership for one organization-status and pinned section.
- [ ] Require expected revisions for every member.
- [ ] Reject missing, duplicate, foreign, or stale members.
- [ ] Assign normalized section-local manualOrder values.
- [ ] Do not change lastActiveAt when reordering.
- [ ] Return current section metadata on revision conflict.
- [ ] Add normalization, conflict, and independent-section tests.

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
