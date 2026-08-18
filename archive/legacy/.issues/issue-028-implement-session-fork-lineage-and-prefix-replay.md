# Implement session Fork lineage and prefix replay

## Description
Create session branches that share an immutable visible parent transcript prefix without cloning a running process.

## Acceptance Criteria
- [x] Fork at the latest fully persisted visible event.
- [x] Inherit workspace, profile, and effective launch configuration.
- [x] Create a distinct stopped active child session with parent and boundary metadata.
- [x] Resolve parent prefix followed by child events during replay.
- [x] Prevent later parent events from appearing in the child.
- [x] Protect referenced parent prefixes from retention.
- [x] Reject parent deletion while dependent forks exist.
- [x] Materialize history when Fork depth would exceed 32.
- [x] Add Fork, replay, retention, deletion, and depth tests.

## Dependencies
Issues #21, #23, #25

## Type
backend

## Priority
high

## SPEC Reference
SPEC §2.4, §3.5, §5.10

## Source

- Traceability: legacy/unmapped
