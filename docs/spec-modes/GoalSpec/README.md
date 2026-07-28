# GoalSpec

`GoalSpec` is the workflow-driven SpecOS project mode. It sits between `LiteSpec` and `EnterpriseSpec`: stronger than a feature-local flow, lighter than full role-separated audit governance.

It is optimized for:

- small teams that work Issue by Issue
- modular Feature Specs derived from small or complex PRDs
- implementation and independent verification running as separate tracks
- explicit review and ship gates

## Core Principle

Use an approved, versioned Feature Spec as the split point:

```text
/prd -> /prd-to-spec -> Feature Spec approval
  ├── /to-issues (implementation) -> implementation
  └── /spec-to-test -> Test Spec approval
      -> /to-issues (verification) -> independent verification
  -> /review-it -> /ship-it
```

Complex PRDs first become a roadmap and multiple small, end-to-end Feature Specs. Each approved Feature Spec produces one independent Test Spec bound to its exact version.

Implementation and test-asset preparation may run concurrently. Live API, scenario, UI/E2E, performance, load, stress, concurrency, and security execution waits for a deployable target. Both tracks converge at evidence, review, and ship gates.

## Directory Structure

The manifest artifact paths are required and canonical. `artifacts.draftsDir`, `artifacts.specsDir`, and `artifacts.issuesDir` default to `.prd/`, `.features/`, and `.issues/`; `artifacts.testsDir` and `artifacts.resultsDir` default to `tests/` and `tests/results/`. Test Specs are always Feature-local under the matching `.features/<SPEC-ID>-<slug>/` directory.

```text
project/
├── README.md
├── design/
├── current/
├── .prd/
│   └── prd-<slug>.md
├── .features/
│   ├── roadmap.md
│   └── RP-001-feature/
│       ├── spec.md
│       ├── test-spec.md
│       ├── review.md
│       └── changelog.md
├── .issues/
│   └── issue-NNN-<slug>.md
├── implementation/
│   └── RP-001/
├── tests/
│   ├── plans/
│   ├── schedules/
│   └── results/
├── docs/
│   └── workflow.md
└── .agents/
```

## Delivery Loop

| Stage | Command or gate | Output | Owner |
| --- | --- | --- | --- |
| PRD | `/prd` | classified PRD under `.prd/` | spec-editor |
| Feature Spec | `/prd-to-spec` | one or more `.features/RP-xxx/spec.md` files and roadmap updates | spec-editor |
| Spec approval | human or authorized automated review | approved Feature Spec version | spec-editor, reviewer |
| Implementation split | `/to-issues` | implementation Issues under `.issues/` | spec-editor |
| Test Spec | `/spec-to-test` | `.features/RP-xxx/test-spec.md` | test-editor |
| Test approval | independent review | approved Test Spec version | test-editor, reviewer |
| Verification split | `/to-issues` | verification Issues under `.issues/`, plans and schedules under `tests/` | test-editor, testing-agent |
| Execute | implementation and testing tracks | code, unit checks, independent normalized results | implementation-agent, testing-agent |
| Review | `/review-it` | review findings and evidence decision | qa-agent, reviewer |
| Ship | `/ship-it` | commit, PR, merge, Issue closure, changelog | qa-agent, ci-editor, deployment-agent |

## Version Contract

- Every Feature Spec has a stable `spec_id` and `spec_version`.
- Every Test Spec records the exact source Spec version and hash or immutable revision when available.
- A changed source version marks the existing Test Spec `stale`.
- Stale Test Specs and version-mismatched results cannot satisfy review or ship gates.
- Historical implementation, test, and review evidence remains bound to the version it verified.

## Agent Loading Order

1. `README.md`
2. `current/`
3. `design/`
4. `.features/`
5. the active Feature Spec
6. the matching Feature-local `test-spec.md` for verification work

Implementation agents must not load private test-agent notes. Independent test agents derive expected behavior from approved requirements and public contracts, not implementation internals.

## Strengths

- repeatable workflow for every change
- modular decomposition for complex PRDs
- explicit source-version binding between Feature Spec and Test Spec
- implementation and test preparation can proceed in parallel
- stale or missing verification evidence blocks shipping
- lower governance overhead than EnterpriseSpec

## Tradeoffs

- more artifacts than LiteSpec
- Feature Spec and Test Spec approvals add deliberate gates
- complete multi-team audit, release, rollback, and compliance evidence still belongs to EnterpriseSpec

## Use GoalSpec When

Choose `GoalSpec` when:

- the team wants a stable PRD-to-Spec-to-Issue workflow
- independent API, scenario, UI/E2E, or performance verification matters
- implementation and testing need separate contexts
- full EnterpriseSpec governance would be unnecessarily heavy
