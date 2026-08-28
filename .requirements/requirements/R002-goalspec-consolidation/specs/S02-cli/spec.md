---
requirement: R002
spec_package: S02
spec_id: SPEC-R002-S02
title: CLI
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: approved
owner: implementation-agent
---

# Spec Package S02 — CLI

## Traceability

| Contract | Behavior |
|---|---|
| SPEC-R002-S02-001 | init has no mode selector; intake requires an R id, slug, and request and creates a GoalSpec workspace. |
| SPEC-R002-S02-002 | test and gate resolve only canonical R/S selectors or child-package paths. |
| SPEC-R002-S02-003 | CLI entrypoints resolve workspace, child package, issue, design, and workflow templates. |

## SPEC-R002-S02-001 — Initialization and intake

Implements: REQ-R002-003

Given the approved GoalSpec consolidation, when this surface is used, then init has no mode selector; intake requires an R id, slug, and request and creates a GoalSpec workspace.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## SPEC-R002-S02-002 — Selection and gates

Implements: REQ-R002-003

Given the approved GoalSpec consolidation, when this surface is used, then test and gate resolve only canonical R/S selectors or child-package paths.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## SPEC-R002-S02-003 — CLI entrypoint contract

Implements: REQ-R002-003

Given the approved GoalSpec consolidation, when this surface is used, then CLI entrypoints resolve workspace, child package, issue, design, and workflow templates.

Error semantics: invalid input fails explicitly; it is never reinterpreted.

Acceptance mapping: AC-R002-001, AC-R002-002, AC-R002-003

## Change Delta

Added: the GoalSpec contracts above.

Removed: conflicting fields, paths, mode selectors, aliases, and fallback reads.

Unchanged guarantees: unrelated source, user changes, Git history, and Bugrail remain untouched.
