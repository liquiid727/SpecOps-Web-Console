# Standardize API errors and bounded request parsing

## Description
Introduce a consistent HTTP error contract and safe request parsing for every CLI GUI API route.

## Acceptance Criteria
- [ ] Return structured errors with code, public message, optional details, and request ID.
- [ ] Limit JSON request bodies to 1 MiB and return 413 when exceeded.
- [ ] Require the expected JSON content type for JSON mutation requests.
- [ ] Map validation, authorization, not-found, conflict, and internal failures to the documented status codes.
- [ ] Do not return stack traces, command stderr, or sensitive filesystem details.
- [ ] Handle 204 responses without JSON parsing in the client compatibility layer.

## Dependencies
Issue #12

## Type
backend

## Priority
high

## SPEC Reference
SPEC §4.1, §6

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
