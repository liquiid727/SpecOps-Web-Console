# Implement versioned state repository and legacy migration

## Description
Replace implicit state loading with validated schema-v2 persistence and a non-destructive migration from the current bare JSON state.

## Acceptance Criteria
- [ ] Recognize both schema-v2 envelopes and legacy unversioned state.
- [ ] Preserve legacy IDs, names, references, timestamps, and exit codes.
- [ ] Migrate runtime state to stopped and initialize organization, ordering, launch configuration, and revision defaults.
- [ ] Canonicalize workspace roots without silently dropping inaccessible entries.
- [ ] Never overwrite malformed or unsuccessfully migrated state.
- [ ] Create a recovery backup only after migration validation succeeds.
- [ ] Perform zero filesystem writes in readonly mode.
- [ ] Add migration, corruption, idempotency, backup, and readonly fixtures.

## Dependencies
Issue #15

## Type
backend

## Priority
high

## SPEC Reference
SPEC §3.7

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
