# Add deterministic MockClientRuntime contract fixtures

## Description
Make browser development independent of Rust, CLI binaries, or network access by adding deterministic mock implementations for all ClientRuntime ports.

## Acceptance Criteria
- [x] Mock fixtures cover streaming text, tools, files, approvals, failures, offline, reconnect, and native-session-expired states.
- [x] The same port contract suite runs against MockClientRuntime and LocalHttpRuntime.
- [x] Deltas remain transient and persisted events replace transient content in fixture replay.
- [x] Test setup does not require Tauri, real CLI binaries, or network access.

## Dependencies
Issue #061

## Type
frontend

## Priority
high

## SPEC Reference
CLI-GUI-020; client-platform PRD CP-002, FR-CP-3/5/6/7; client-runtime SPEC Sections 2, 4, and 8.

## Validation
- Runtime contract suite for Mock and Local implementations.

## Local Acceptance

- Accepted locally on 2026-07-29.
- Focused suite: 2 files, 14 tests passed.
- Full suite: 49 files, 363 tests passed.
- Build and UI governance passed; build retains the existing chunk-size warning.
- GitHub shipping remains pending in local-loop mode.
