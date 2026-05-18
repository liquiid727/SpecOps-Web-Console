# Spec Change Agent Workflow

## Meta

- Domain: `specos`
- Feature: `spec-change-agent-workflow`
- Source Draft: direct user clarification in current Codex thread
- Status: proposed

## Goal

Make every new requirement move through a traceable lifecycle from draft intake to accepted current state, with execution and testing handled by isolated agent tracks after architecture and design review.

## Non-Goals

- This change does not implement a generic hosted agent runtime.
- This change does not make UI/Playwright execution mandatory in the first API-focused runner phase.
- This change does not allow new requirements to update `specs/current/` before review, test, and acceptance evidence exists.

## Lifecycle

1. A human requirement enters `spec-draft/`.
2. The spec-draft agent refines the draft into structured intent, assumptions, open questions, and stable vocabulary.
3. The spec agent reads `specs/current/` and creates `specs/changes/<change-id>/` for the proposed delta.
4. Architecture and design agents review the change before execution or test work starts.
5. The workflow creates two isolated tracks:
   - execution track: implementation work plus implementation-coupled unit tests.
   - testing track: spec-and-contract-only API, E2E, UI, and business scenario verification.
6. The tracks may run in parallel or testing may wait for implementation completion, but their agent context remains isolated.
7. Review, architecture, risk, and test gates evaluate the combined evidence.
8. After implementation and tests pass, the spec agent records the changelog, promotes accepted facts into `specs/current/`, and archives the change.

## Change Package Shape

Each active change should keep its lifecycle evidence in one directory:

```text
specs/changes/<change-id>/
  spec.md
  architecture-review.md
  design-review.md
  execution-plan.md
  test-plan.json
  test-schedule.json
  implementation-report.md
  test-result-summary.md
  review-report.md
  changelog.md
```

`spec.md` is the coordination contract. Other files record the agent outputs and gate evidence derived from that contract.

## Agent Boundaries

### Spec Agent

- Owns draft refinement handoff, change creation, changelog maintenance, promotion into `specs/current/`, and archive handoff.
- Must not replace implementation, test, architecture, or design review outputs with unstated assumptions.

### Architecture Agent

- Reviews domain boundaries, system impact, migration impact, contracts, and risk before execution and testing split.
- Produces `architecture-review.md`.

### Design Agent

- Reviews user behavior, UI states, scenario vocabulary, and user-facing acceptance language.
- Produces `design-review.md`.

### Execution Agent

- Owns implementation artifacts and implementation-coupled unit tests.
- Allowed inputs: current specs, active change spec, architecture review, design review, explicit implementation plan.
- Forbidden inputs: independent E2E/scenario/API/UI test implementation details, generated independent test assertions, raw independent test result explanations.
- Produces implementation changes and `implementation-report.md`.
- May produce unit-test files under `tests/unit/` or existing module-local test paths.

### Test Agent

- Owns test-plan, test-schedule, API/UI/scenario test assets, real execution, and normalized result mapping.
- Allowed inputs: current specs, active change spec, OpenAPI/API contract, user flows, acceptance conditions, rules.
- Forbidden inputs: implementation explanations, source-code strategy notes, execution-agent private assumptions.
- Produces `test-plan.json`, `test-schedule.json`, test assets, and `test-result-summary.md`.
- Does not own implementation-coupled unit tests.

### Review Agents

- Evaluate evidence after implementation and test outputs exist.
- Must report blockers in business-flow language and link them to spec scenarios, rules, or acceptance criteria.

## Test Schedule Contract

The generated `test-schedule.json` records the split between execution and testing:

- `executionMode`: `parallel` or `test-after-execution`.
- `tracks[]`: isolated agent tracks and allowed/forbidden inputs.
- `tasks[]`: implementation, API test, and UI gap tasks with traceability to scenarios and endpoints.
- `gates[]`: required states before promotion and archive.

The execution track may write implementation-coupled unit tests under `tests/unit/` or module-local test paths. It must not write independent verification assets under `tests/bruno/`, `tests/scenarios/`, `tests/e2e/`, `tests/playwright/`, or `tests/results/`. The testing track must not write implementation source paths or unit tests.

## First Implementation Slice

The first implementation slice provides:

- `specos generate-test-plan <spec-file> --change <change-id>`
- `tests/plans/<spec>.test-plan.json`
- `tests/schedules/<spec>.test-schedule.json`
- validation that execution and testing responsibilities stay separated.

Real API runner integration can consume this schedule in the next slice without changing the lifecycle contract.
