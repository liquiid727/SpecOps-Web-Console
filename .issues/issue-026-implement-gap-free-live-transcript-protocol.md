# Implement gap-free live transcript protocol

## Description
Add a typed session event WebSocket channel that bridges replay and live events without gaps or duplicates.

## Acceptance Criteria
- [ ] Add the events channel with sessionId and afterSequence.
- [ ] Register a paused subscriber before querying missed events.
- [ ] Send missed persisted events, buffered events, then subscription-ready.
- [ ] Publish transcript events, session updates, runtime status, and recording warnings.
- [ ] Validate Host, Origin, capability token, frame size, session, and cursor.
- [ ] Close invalid subscriptions with defined protocol errors.
- [ ] Add fetch-to-subscribe gap, reconnect, ordering, and deduplication integration tests.

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
