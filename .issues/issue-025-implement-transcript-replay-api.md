# Implement transcript replay API

## Description
Expose bounded visible transcript history for stopped and running sessions.

## Acceptance Criteria
- [ ] Add GET /api/sessions/:id/transcript with afterSequence and limit.
- [ ] Return events in visible sequence order with hasMore and nextAfterSequence.
- [ ] Cap limits at 200 events and 1 MiB per response.
- [ ] Return retention visibility information.
- [ ] Return defined not-found and corrupt-transcript errors.
- [ ] Support empty, partial, complete, retained, and Fork-prefix histories.
- [ ] Add API integration tests.

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
