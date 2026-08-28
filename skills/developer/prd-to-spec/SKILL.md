---
name: prd-to-spec
description: Use when converting an approved GoalSpec root PRD into one or more independently deliverable child Spec Packages.
---

# PRD to Spec — GoalSpec

Transform product intent into executable system contracts. This skill decides the `S01`, `S02` delivery boundaries and writes child `spec.md` files; it does not generate Test Designs or implementation code.

## Inputs and canonical output

Input must be an approved root Workspace:

```text
.requirements/requirements/R0NN-<slug>/
├── prd.md
└── index.yaml
```

For each approved decomposition entry, write exactly one child package:

```text
.requirements/requirements/R0NN-<slug>/specs/S0N-<slug>/
└── spec.md
```

The child package path in `index.yaml` is authoritative. Do not create a root `spec.md` or a competing roadmap as the child Spec output.

## Workflow

1. Read the repository context in order: `README.md`, `rules/`, `docs/spec-modes/GoalSpec/`, relevant `design/`, root `prd.md`, and `index.yaml`.
2. Require PRD status `approved` for canonical output. An explicitly requested
   draft preview may be returned for discussion, but MUST NOT be written as a
   canonical child package or create implementation authority.
3. Validate that every `REQ`, `BR`, `INV`, `EDGE`, and `AC` has an owning child package or an explicit reason to remain root-level.
4. Use one `S0N` per independently deliverable business outcome, actor/lifecycle boundary, authorization boundary, risk profile, or acceptance result. Do not split by frontend/backend/database directory.
5. Allocate the next unused numeric `S0N` within the Workspace. Preserve all
   existing IDs; never reuse, renumber, or silently change a package boundary
   after approval.
6. Present the decomposition and dependency order for review.
7. After approval, copy `.requirements/templates/spec-package/` for each child, fill `spec.md`, and update only the aggregate `index.yaml`.

## Child Spec contract

Each `spec.md` must begin with:

```yaml
requirement: R001
spec_package: S01
title: <Spec Package Name>
status: draft # draft | review | approved | implementing | accepted | blocked
version: 1.0.0
source_prd: ../../prd.md
source_prd_version: 1.0.0
qualityProfile: <backend-api | frontend-ui | fullstack-flow | data-migration | agent-workflow>
riskTier: P1
```

Every contract behavior uses a stable ID:

```text
SPEC-R001-S01-001
```

Each behavior must map to at least one `REQ-R001-NNN` and define:

- a public seam and observable result;
- preconditions and a concrete Given/When/Then scenario;
- authorization and actor rules;
- state and transitions, including invalid transitions;
- input, persistence, consistency, privacy, and retention semantics;
- error codes/outcomes, dependency failures, retry, and rollback behavior;
- side effects and observability fields, metrics, traces, and alerts;
- risk tier, required evidence, gate impact, and acceptance mapping to `AC-R001-NNN`.

When the PRD or package includes Agent behavior, add the conditional Agent
Behavior Contract with success metrics, Dataset/sample version, passing
threshold, retained trajectory fields, anomaly signals, automatic degradation,
and human handoff trigger/owner. For ordinary behavior, write `Not applicable`;
do not invent Agent requirements.

Do not leave `...`, generic "public interface exercised", or unspecified error
semantics in an approved or release-bound Spec. If the PRD does not provide a
needed product decision, stop at draft/review and record the blocking Open
Question instead of guessing.

For `type: change`, include `Added`, `Modified`, `Removed`, and testable `Unchanged Guarantees` in every affected child Spec.

## Version and approval

Approval freezes the source version used by `spec-to-test` and `to-issues`. When approved public behavior changes:

1. increment the child Spec version;
2. record the affected REQs and contract IDs;
3. mark downstream Test Designs and Issues bound to the old version as stale or superseded;
4. never rewrite historical evidence to point at the new version.

## Handoff

```text
approved R0NN PRD
  → S0N/spec.md
  ├── /spec-to-test → S0N/test.md
  └── /to-issues (implementation) → S0N/issues/ISSUE-R0NN-S0N-NNN.md
```
