---
requirement: R002
spec_package: S03
spec_id: SPEC-R002-S03
title: Explorer and Catalog
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: approved
owner: implementation-agent
---

# Spec Package S03 — Explorer and Catalog

## Traceability

| Contract | Behavior |
|---|---|
| SPEC-R002-S03-001 | Explorer reads index, PRD, root acceptance, child package documents, issues, and evidence without flat fallback. |
| SPEC-R002-S03-002 | Requirement routes expose explicit loading, empty, success, and failure states. |
| SPEC-R002-S03-003 | Catalog uses GoalSpec asset IDs and no project-mode assets. |

## SPEC-R002-S03-001 — Workspace reader

Implements: REQ-R002-004

Given the approved GoalSpec consolidation, when this surface is used, then Explorer reads index, PRD, root acceptance, child package documents, issues, and evidence without flat fallback.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## SPEC-R002-S03-002 — User states

Implements: REQ-R002-004

Given the approved GoalSpec consolidation, when this surface is used, then Requirement routes expose explicit loading, empty, success, and failure states.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## SPEC-R002-S03-003 — Catalog identity

Implements: REQ-R002-004

Given the approved GoalSpec consolidation, when this surface is used, then Catalog uses GoalSpec asset IDs and no project-mode assets.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## Change Delta

Added: the GoalSpec contracts above.

Removed: conflicting fields, paths, mode selectors, aliases, and fallback reads.

Unchanged guarantees: unrelated source, user changes, Git history, and Bugrail remain untouched.
