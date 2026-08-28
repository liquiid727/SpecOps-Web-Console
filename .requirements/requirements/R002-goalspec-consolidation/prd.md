---
id: R002
title: GoalSpec consolidation
type: change
version: 1.0.0
status: approved
priority: P0
owner: pola
created_at: 2026-08-26
updated_at: 2026-08-26
affects: [core, cli, spec-web-ui, test-console, templates, skills, agents]
---

# PRD — GoalSpec consolidation

## Background

The repository already defines Requirement Workspaces and child Spec Packages,
but runtime code, templates, modes, and developer skills still expose the older
flat artifact model. Two valid-looking workflows make generated work drift and
break end-to-end traceability.

## Goals

- G-R002-001: Make GoalSpec the only authoring and execution workflow.
- G-R002-002: Keep PRD, Spec, Test, Issue, Evidence, Review, and Acceptance co-located.
- G-R002-003: Remove compatibility paths so incorrect callers fail visibly.

## Non-Goals

- NG-R002-001: Migrate historical evidence into the current layout.
- NG-R002-002: Publish packages, push branches, or change the Bugrail repository.
- NG-R002-003: Remove unrelated external versioning.

## Requirements

- REQ-R002-001: The project manifest MUST declare `specos/goalspec` and only `requirementsDir` plus `templatesDir`.
- REQ-R002-002: A child Spec Package MUST own Spec, Test Design, Issues, Review, Acceptance, and evidence directories.
- REQ-R002-003: CLI contracts MUST generate and resolve only GoalSpec paths.
- REQ-R002-004: Explorer and catalog MUST render Requirement Workspace and child Spec Package data without flat-layout fallback.
- REQ-R002-005: Test plans, schedules, runs, gates, and artifacts MUST be stored under the selected child package `evidence/`.
- REQ-R002-006: Developer skills and agent prompts MUST implement the PRD → Spec → Test/Issues → Loop → Review → Ship chain using stable R/S/Issue IDs.
- REQ-R002-007: Mode selectors, overlays, note-it HTML, and superseded templates MUST be removed from the active tree.

## Business Rules

- BR-R002-001: There is no compatibility alias, migration command, or read fallback.
- BR-R002-002: Issue numbers are scoped to their owning child Spec Package: `ISSUE-R0NN-S0N-NNN`.
- BR-R002-003: Implementation notes belong to each Issue Completion Record.
- BR-R002-004: Package versions affected by the public cutover use version `0.2.0`.

## Invariants

- INV-R002-001: New work MUST NOT be written to root `spec.md`, `test.md`, or `issues.md` files.
- INV-R002-002: Test evidence MUST NOT be written to repository-root `tests/plans` or `tests/results`.
- INV-R002-003: Shipping MUST NOT bypass test, review, evidence, or acceptance gates.
- INV-R002-004: `bugrail/` and unrelated user changes MUST remain untouched.

## Acceptance Criteria

- AC-R002-001: Fresh init and intake produce the canonical GoalSpec tree.
- AC-R002-002: Core, CLI, Explorer, and test-console tests pass against GoalSpec fixtures.
- AC-R002-003: Static scans find no active project-mode selector, overlay, note-it, or flat-package contract.
- AC-R002-004: A package dry-run resolves all GoalSpec entrypoints and package versions are `0.2.0`.
- AC-R002-005: The repository and user-global developer skills expose the same GoalSpec workflow.

## Spec Package Decomposition

- S01 Artifact Contract: canonical schemas, paths, stable IDs, and evidence layout.
- S02 CLI: init, intake, selection, and gate behavior.
- S03 Explorer and Catalog: GoalSpec readers, routes, states, and asset identities.
- S04 Test Evidence Console: GoalSpec plans, schedules, runs, gates, and artifacts.
- S05 Skills, Agents, and Cleanup: workflow prompts, templates, documentation, and deletion.

## Open Questions

None. The user approved a hard cut with Git history as the recovery mechanism.
