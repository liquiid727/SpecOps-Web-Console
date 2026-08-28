---
requirement: R002
spec_package: S05
spec_id: SPEC-R002-S05
title: Skills, Agents, and Cleanup
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: approved
owner: qa-agent
---

# Spec Package S05 — Skills, Agents, and Cleanup

## Traceability

| Contract | Behavior |
|---|---|
| SPEC-R002-S05-001 | PRD, Spec, Test, Issues, Loop, Review, and Ship skills share the GoalSpec identity and path contract. |
| SPEC-R002-S05-002 | Implementation decisions and deviations are recorded in Issue Completion Records; note-it does not exist. |
| SPEC-R002-S05-003 | Only GoalSpec documentation, agents, templates, and active artifacts remain. |
| SPEC-R002-S05-004 | User-global same-name skills match repository GoalSpec skills. |

## SPEC-R002-S05-001 — Workflow prompts

Implements: REQ-R002-006, REQ-R002-007

Given the approved GoalSpec consolidation, when this surface is used, then PRD, Spec, Test, Issues, Loop, Review, and Ship skills share the GoalSpec identity and path contract.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## SPEC-R002-S05-002 — Completion notes

Implements: REQ-R002-006, REQ-R002-007

Given the approved GoalSpec consolidation, when this surface is used, then Implementation decisions and deviations are recorded in Issue Completion Records; note-it does not exist.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## SPEC-R002-S05-003 — Single mode

Implements: REQ-R002-006, REQ-R002-007

Given the approved GoalSpec consolidation, when this surface is used, then Only GoalSpec documentation, agents, templates, and active artifacts remain.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## SPEC-R002-S05-004 — Global parity

Implements: REQ-R002-006, REQ-R002-007

Given the approved GoalSpec consolidation, when this surface is used, then User-global same-name skills match repository GoalSpec skills.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## Change Delta

Added: the GoalSpec contracts above.

Removed: conflicting fields, paths, mode selectors, aliases, and fallback reads.

Unchanged guarantees: unrelated source, user changes, Git history, and Bugrail remain untouched.
