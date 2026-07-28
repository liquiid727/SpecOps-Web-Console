# Extract injectable server application composition

## Description
Refactor the CLI GUI server from module-level singletons into testable application and transport factories while preserving existing runtime behavior.

## Acceptance Criteria
- [ ] Add an injectable application composition accepting state/transcript repositories, PTY runtime, filesystem, Git, directory picker, profile adapters, clock, ID generator, runtime policy, and logger.
- [ ] Make server/index.ts bootstrap-only and prevent listening at module import time.
- [ ] Return explicit listen and graceful-close lifecycle controls.
- [ ] Stop active PTYs and drain persistence queues during shutdown.
- [ ] Preserve the existing loopback host and configurable port behavior.
- [ ] Add unit or integration coverage for application construction and shutdown.

## Dependencies
None

## Type
backend

## Priority
high

## SPEC Reference
SPEC §2.2, §2.5, §10 Phase 1

## Source

- Traceability: legacy/unmapped
