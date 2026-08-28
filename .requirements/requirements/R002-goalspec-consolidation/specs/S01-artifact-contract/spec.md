---
requirement: R002
spec_package: S01
spec_id: SPEC-R002-S01
title: Artifact Contract
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: approved
owner: architecture-agent
---

# Spec Package S01 — Artifact Contract

## Traceability

| Contract | Behavior |
|---|---|
| SPEC-R002-S01-001 | The manifest exposes schemaVersion specos/goalspec and only requirementsDir/templatesDir. |
| SPEC-R002-S01-002 | Every child package owns evidence/index.yaml plus plans, schedules, runs, gates, and artifacts. |

## SPEC-R002-S01-001 — Manifest schema

Implements: REQ-R002-001, REQ-R002-002

Given the approved GoalSpec consolidation, when this surface is used, then The manifest exposes schemaVersion specos/goalspec and only requirementsDir/templatesDir.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## SPEC-R002-S01-002 — Evidence schema

Implements: REQ-R002-001, REQ-R002-002

Given the approved GoalSpec consolidation, when this surface is used, then Every child package owns evidence/index.yaml plus plans, schedules, runs, gates, and artifacts.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## Change Delta

Added: the GoalSpec contracts above.

Removed: conflicting fields, paths, mode selectors, aliases, and fallback reads.

Unchanged guarantees: unrelated source, user changes, Git history, and Bugrail remain untouched.
