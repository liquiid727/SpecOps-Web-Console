# Implement transcript replay API

## Description
Expose bounded visible transcript history for stopped and running sessions.

## Acceptance Criteria
- [x] Add GET /api/sessions/:id/transcript with afterSequence and limit.
- [x] Return events in visible sequence order with hasMore and nextAfterSequence.
- [x] Cap limits at 200 events and 1 MiB per response.
- [x] Return retention visibility information.
- [x] Return defined not-found and corrupt-transcript errors.
- [x] Support empty, partial, complete, retained, and Fork-prefix histories.
- [x] Add API integration tests.

## Dependencies
Issue #23

## Type
backend

## Priority
high

## SPEC Reference
SPEC §4.2–4.3

## Source

- Traceability: legacy/unmapped
