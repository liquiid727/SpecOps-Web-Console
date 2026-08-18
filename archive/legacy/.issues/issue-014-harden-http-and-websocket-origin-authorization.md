# Harden HTTP and WebSocket origin authorization

## Description
Protect the privileged localhost service from cross-origin browser requests before exposing native picker, process, and filesystem capabilities.

## Acceptance Criteria
- [x] Validate Host against configured loopback hosts and ports.
- [x] Allow only the configured development frontend origin and the production app origin.
- [x] Require a per-process anti-CSRF capability for mutations.
- [x] Validate Host, Origin, and capability before WebSocket upgrade.
- [x] Reject missing or unapproved origins for mutations and WebSockets.
- [x] Keep Vite development proxy behavior functional and cover accepted/rejected requests in integration tests.

## Dependencies
Issues #12, #13

## Type
backend

## Priority
high

## SPEC Reference
SPEC §7.1

## Source

- Traceability: legacy/unmapped
