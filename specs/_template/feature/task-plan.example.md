# <domain>/<feature> Task Plan

## Meta

- Change ID: `<change-id>`
- Source Spec: `specs/changes/<change-id>/spec.md`
- Status: `planned`

## Purpose

Translate the spec layer into explicit work items. Every task should be small enough for one owner agent to execute, review, or verify with clear inputs and evidence.

## Task Model

Required fields:

- Task ID
- Owner agent
- Source spec, draft, rule, or review gate
- Inputs
- Outputs
- Dependencies
- Acceptance evidence
- Current status

## Task Table

| Task ID | Owner Agent | Source | Inputs | Outputs | Depends On | Acceptance Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<change-id>.architecture-review` | `architecture-agent` | `spec.md` | `spec.md`, `specs/current/` | `architecture-review.md` | draft confirmed | architecture/design gate approved | pending |
| `<change-id>.implementation` | `implementation-agent` | `spec.md` | `spec.md`, `architecture-review.md`, `design-review.md` | implementation changes, `implementation-report.md` | architecture/design gate | implementation review approved | pending |
| `<change-id>.verification` | `testing-agent` | `test-strategy.md` | `spec.md`, contracts, test strategy | `tests/plans/`, `tests/results/`, gate report | test plan ready | independent test decision | pending |
| `<change-id>.deployment-readiness` | `deployment-agent` | gate report | validation evidence, review report | release readiness notes | implementation and tests complete | promotion gate readiness | pending |

## Traceability Rules

- A task without a source spec, rule, or gate is not actionable.
- A task without acceptance evidence cannot satisfy promotion.
- Implementation tasks must not consume independent test private notes.
- Testing tasks must not consume implementation private notes.
