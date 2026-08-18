# Implement versioned state repository and legacy migration

## Description
Replace implicit state loading with validated schema-v2 persistence and a non-destructive migration from the current bare JSON state.

## Acceptance Criteria
- [x] Recognize both schema-v2 envelopes and legacy unversioned state.
- [x] Preserve legacy IDs, names, references, timestamps, and exit codes.
- [x] Migrate runtime state to stopped and initialize organization, ordering, launch configuration, and revision defaults.
- [x] Canonicalize workspace roots without silently dropping inaccessible entries.
- [x] Never overwrite malformed or unsuccessfully migrated state.
- [x] Create a recovery backup only after migration validation succeeds.
- [x] Perform zero filesystem writes in readonly mode.
- [x] Add migration, corruption, idempotency, backup, and readonly fixtures.

## Dependencies
Issue #15

## Type
backend

## Priority
high

## SPEC Reference
SPEC §3.7

## Source

- Traceability: legacy/unmapped
