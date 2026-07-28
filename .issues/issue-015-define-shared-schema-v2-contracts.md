# Define shared schema-v2 contracts

## Description
Create shared implementation contracts for persisted state, session organization, transcripts, profile capabilities, HTTP DTOs, and WebSocket frames.

## Acceptance Criteria
- [ ] Define AppStateEnvelope schema version 2.
- [ ] Separate session runtime status from organizational status.
- [ ] Define pinned state, manual order, launch configuration, revision, and Fork lineage fields.
- [ ] Define transcript event, replay-page, profile-capability, inspection, API-error, and WebSocket frame types.
- [ ] Provide a temporary compatibility status alias or adapter for existing components.
- [ ] Compile client and server against the same shared contracts.

## Dependencies
None

## Type
fullstack

## Priority
high

## SPEC Reference
SPEC §3.1–3.4, §4

## Source

- Traceability: legacy/unmapped
