# Implement gap-free live transcript protocol

## Description
Add a typed session event WebSocket channel that bridges replay and live events without gaps or duplicates.

## Acceptance Criteria
- [x] Add the events channel with sessionId and afterSequence.
- [x] Register a paused subscriber before querying missed events.
- [x] Send missed persisted events, buffered events, then subscription-ready.
- [x] Publish transcript events, session updates, runtime status, and recording warnings.
- [x] Validate Host, Origin, capability token, frame size, session, and cursor.
- [x] Close invalid subscriptions with defined protocol errors.
- [x] Add fetch-to-subscribe gap, reconnect, ordering, and deduplication integration tests.

## Dependencies
Issues #14, #24, #25

## Type
backend

## Priority
high

## SPEC Reference
SPEC §4.4

## Source

- Traceability: legacy/unmapped
