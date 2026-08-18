# Add isolated server integration-test harness

## Description
Provide deterministic test application construction so backend behavior can be exercised without user data, real CLIs, or the source repository.

## Acceptance Criteria
- [x] Use a temporary data root per test.
- [x] Provide fake clock, ID generator, PTY runtime, filesystem, Git, picker, and profile adapters.
- [x] Support starting and stopping an isolated HTTP/WebSocket server.
- [x] Ensure fixtures cannot write to the source checkout or user runtime data.
- [x] Expose helpers for origin, CSRF, readonly, and failure-mode tests.
- [x] Document the integration-test setup pattern.

## Dependencies
Issues #12, #13, #15

## Type
infra

## Priority
high

## SPEC Reference
SPEC §9.2

## Source

- Traceability: legacy/unmapped
