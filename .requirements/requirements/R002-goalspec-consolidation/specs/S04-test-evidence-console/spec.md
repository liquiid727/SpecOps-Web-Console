---
requirement: R002
spec_package: S04
spec_id: SPEC-R002-S04
title: Test Evidence Console
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: approved
owner: testing-agent
---

# Spec Package S04 — Test Evidence Console

## Traceability

| Contract | Behavior |
|---|---|
| SPEC-R002-S04-001 | The console reads and writes plans, schedules, runs, gates, and artifacts under the selected child evidence directory. |
| SPEC-R002-S04-002 | Gate evaluation considers only the selected R/S package and rejects missing or stale blocking evidence. |

## SPEC-R002-S04-001 — Evidence control plane

Implements: REQ-R002-005

Given the approved GoalSpec consolidation, when this surface is used, then The console reads and writes plans, schedules, runs, gates, and artifacts under the selected child evidence directory.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## SPEC-R002-S04-002 — Scoped readiness

Implements: REQ-R002-005

Given the approved GoalSpec consolidation, when this surface is used, then Gate evaluation considers only the selected R/S package and rejects missing or stale blocking evidence.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## Change Delta

Added: the GoalSpec contracts above.

Removed: conflicting fields, paths, mode selectors, aliases, and fallback reads.

Unchanged guarantees: unrelated source, user changes, Git history, and Bugrail remain untouched.
