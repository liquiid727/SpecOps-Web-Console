---
name: prd
description: Use when turning a raw product idea, change request, bug, or refactor proposal into an accepted GoalSpec PRD Workspace.
---

# PRD — GoalSpec

Create the root product contract for one Requirement Workspace. This skill owns product intent; it does not design implementation details, generate Issues, or modify code.

## Canonical output

Use the repository's canonical workspace:

```text
.requirements/requirements/R0NN-<slug>/
├── prd.md
├── index.yaml
├── acceptance.md
└── specs/
```

Never create root `spec.md`, `test.md`, or `issues.md`; those responsibilities
belong to child Spec Packages.

Resolve the root from `.specos/manifest.yaml` and the GoalSpec rules. `R0NN` is
permanent: allocate the next unused numeric ID, and never reuse or renumber an
existing Requirement Workspace.

## Workflow

1. Read `README.md`, `rules/`, `docs/spec-modes/GoalSpec/`, relevant `design/`, and the active manifest.
2. Inspect `.requirements/requirements/` and allocate the next unused `R0NN` unless the user named an existing Workspace.
3. Ask only blocking product questions. Record non-blocking assumptions and Open Questions in the PRD.
4. Classify the root as `feature`, `change`, `bug`, or `refactor`.
5. Draft the PRD and present it for review.
6. After approval, create the Workspace and save `prd.md`, `index.yaml`, and root `acceptance.md` from `.requirements/templates/`.
7. Suggest `/prd-to-spec`; do not start implementation.

## PRD contract

The root `prd.md` frontmatter must contain:

```yaml
id: R001
title: <Requirement Title>
type: feature # feature | change | bug | refactor
status: draft # draft | review | approved | implementing | done
priority: P1
owner: <owner>
```

The body must define:

- Background, Goals, Non-Goals, Actors, Scope, and business flows;
- stable `REQ-R0NN-NNN` product requirements;
- `BR-R0NN-NNN` business rules, `INV-R0NN-NNN` invariants, and `EDGE-R0NN-NNN` edge cases;
- `AC-R0NN-NNN` verifiable acceptance criteria;
- for Agent behavior, success metrics, Dataset/sample version, passing
  thresholds, trajectory observability, automatic degradation, and human
  handoff conditions; ordinary requirements explicitly record `Not applicable`;
- a **Spec Package Decomposition** with `S01`, `S02`, each covering explicit REQs and naming an independent business outcome;
- Open Questions and whether each one blocks approval.

`type: feature` describes the kind of requirement. It is not a substitute for a child `S01` Spec Package.

Every functional requirement and AC must identify an observable result. When a
requirement uses an Agent or affects Agent decisions, the PRD cannot be Ready
without the Agent Behavior Contract fields from the template. Do not invent
metrics or thresholds; ask a blocking product question and keep the PRD in
draft/review until decided.

## Root index contract

`index.yaml` summarizes child packages without copying their full content:

```yaml
id: R001
source_prd: ./prd.md
specs:
  - id: S01
    path: ./specs/S01-login/
    status: draft
    covers: [REQ-R001-001]
```

Root `acceptance.md` starts as a draft and is only completed after all required child packages are accepted and PRD AC/UAT is verified.

## Quality gate

Do not mark the PRD approved when scope, acceptance behavior, child-package decomposition, or blocking Open Questions are unresolved.

## Handoff

```text
approved R0NN PRD Workspace
  → /prd-to-spec
  → S0N Spec Package(s)
```
