# Proposed Changes

Proposed or in-progress SpecOS changes live here.

Each change should use a stable change id and keep proposal, design, task, draft spec, test, and review artifacts together until the change is accepted.

This directory is the working center for active production requirements. Development, tests, generated artifacts, and review notes should be derived from the combination of:

```text
specs/current/ + specs/changes/<change-id>/
```

Do not promote change content into `specs/current/` until implementation, tests, review/report, and acceptance are complete.

## Standard Change Package

```text
specs/changes/<change-id>/
  spec.md                 # spec layer: proposed contract and business intent
  architecture-review.md  # spec gate: boundary and risk review
  design-review.md        # spec gate: user-facing behavior review
  task-plan.md            # task layer: owner agents, inputs, outputs, dependencies, evidence
  execution-plan.md       # task layer: implementation execution notes
  test-strategy.md        # task layer: independent verification strategy
  review-report.md        # evidence layer: review findings
  gate-report.md          # evidence layer: release or test gate summary when generated
  changelog.md            # evidence layer: accepted delta and promotion notes
  workflow-state.json     # machine-readable gate state when created by CLI
```

The task layer is required because it is the bridge between durable spec intent and evidence. If a change has no `task-plan.md`, agent ownership and acceptance evidence are likely implicit and harder to audit.
