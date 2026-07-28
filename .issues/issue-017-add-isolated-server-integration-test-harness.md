# Add isolated server integration-test harness

## Description
Provide deterministic test application construction so backend behavior can be exercised without user data, real CLIs, or the source repository.

## Acceptance Criteria
- [ ] Use a temporary data root per test.
- [ ] Provide fake clock, ID generator, PTY runtime, filesystem, Git, picker, and profile adapters.
- [ ] Support starting and stopping an isolated HTTP/WebSocket server.
- [ ] Ensure fixtures cannot write to the source checkout or user runtime data.
- [ ] Expose helpers for origin, CSRF, readonly, and failure-mode tests.
- [ ] Document the integration-test setup pattern.

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
