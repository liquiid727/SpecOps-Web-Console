# Harden HTTP and WebSocket origin authorization

## Description
Protect the privileged localhost service from cross-origin browser requests before exposing native picker, process, and filesystem capabilities.

## Acceptance Criteria
- [ ] Validate Host against configured loopback hosts and ports.
- [ ] Allow only the configured development frontend origin and the production app origin.
- [ ] Require a per-process anti-CSRF capability for mutations.
- [ ] Validate Host, Origin, and capability before WebSocket upgrade.
- [ ] Reject missing or unapproved origins for mutations and WebSockets.
- [ ] Keep Vite development proxy behavior functional and cover accepted/rejected requests in integration tests.

## Dependencies
Issues #12, #13

## Type
backend

## Priority
high

## SPEC Reference
SPEC §7.1

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
