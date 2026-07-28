---
name: spec-to-test
description: Generate an independent, versioned Test Spec from an approved Feature Spec. Use after spec review when API contracts, business flows, errors, acceptance criteria, and performance targets are stable; also use to add missing test specifications to legacy projects that already have an accepted spec. Produces tool-agnostic API, scenario, E2E, performance, load, stress, data, evidence, and release-gate requirements without reading private implementation details.
---

# Spec to Test

Turn one approved Feature Spec into one independently reviewable Test Spec. Keep the source Feature Spec as the product and implementation contract; the Test Spec is a derived verification contract, never a competing source of truth.

## Hard Gate

Before generating a release-eligible Test Spec, require:

- a stable `spec_id`
- a stable `spec_version`
- source status `approved`
- recorded human approval or accepted automated review evidence
- resolved blocking questions
- explicit public contracts for applicable APIs, events, states, errors, acceptance criteria, and performance targets

If the source is still `draft` or `in-review`, generate only a `preview` Test Spec when the user explicitly requests it. Mark it non-baseline and prohibit release evidence from referencing it.

For a legacy project:

- use an accepted existing Feature Spec directly
- if only code exists, run `code-to-spec`, reconcile the observed behavior with product intent, and approve that baseline first
- if code and Spec disagree, stop and record the conflict; do not silently treat current code as the expected behavior

## Required Inputs

Read:

1. the approved Feature Spec
2. its source PRD or covered requirement identifiers when available
3. referenced API, event, schema, error-code, state-machine, and rule contracts
4. project testing and release-gate rules
5. existing Test Spec for the same `spec_id`, when updating

Do not read implementation-agent private notes, internal algorithms, or source-code structure to derive expected behavior. Independent verification must come from accepted requirements and public contracts.

## Workflow

### 1. Validate the Source Baseline

Record:

- `spec_id`
- `source_spec_version`
- source path
- source content hash or immutable revision when available
- source approval evidence
- covered US, FR, AC, rule, and risk identifiers

Stop when a required contract is missing. Put non-blocking ambiguity under `Open Gaps`; do not invent an endpoint, field, status code, workflow step, SLO, or business rule.

### 2. Build the Coverage Matrix

Map every accepted requirement to one or more verification requirements:

| Requirement ID | Behavior or Contract | Test Profile | Priority | Evidence | Gate Impact |
| --- | --- | --- | --- | --- | --- |
| `FR-1` | `POST /decisions` accepts a valid request | API contract | P0 | raw report | blocking |
| `AC-3` | failed decision enters the rejected state | scenario | P0 | trace | blocking |

Every acceptance criterion must be covered or explicitly waived with owner, reason, and approval.

### 3. Select Test Profiles

Choose profiles from the Feature Spec and risk, not from tool availability:

- `unit`: implementation-coupled behavior; owned by the implementation track
- `api-contract`: schema, auth, status, error, idempotency, retry, and compatibility
- `scenario`: ordered business stages, branches, state transitions, recovery, and cleanup
- `ui-e2e`: empty, loading, success, failure, accessibility, and browser behavior
- `performance`: expected-load latency, throughput, error rate, and regression baseline
- `load`: target concurrency or throughput under a sustained expected workload
- `stress`: behavior beyond capacity, degradation, refusal, consistency, and recovery
- `spike`: sudden traffic increase and stabilization
- `soak`: long-running resource, leak, and degradation behavior
- `concurrency`: duplicate requests, locking, idempotency, ordering, and final-state invariants
- `security`: authentication, authorization, data protection, abuse, and contract-specific threats

Tools such as Bruno, Playwright, or k6 are execution adapters. Keep the Test Spec tool-agnostic; select tools later in the test plan.

### 4. Generate the Test Spec

Use this structure:

```markdown
# Test Spec: <SPEC-ID> <Feature>

## Meta
- Spec ID:
- Source Spec:
- Source Spec Version:
- Source Spec Hash:
- Test Spec Version:
- Status: draft | in-review | approved | stale | superseded
- Risk Tier: P0 | P1 | P2
- Quality Profile:
- Owner Agent:
- Approval Evidence:

## Verification Goal

## In Scope

## Out of Scope

## Requirement Coverage

## Contract Baseline
### APIs and Events
### Business Rules and State Transitions
### Errors, Limits, and Compatibility

## API Contract Tests

## Scenario Orchestration

## UI and E2E Tests

## Performance and Capacity
### Performance
### Load
### Stress, Spike, and Soak

## Concurrency and Security

## Test Data and Environment

## Evidence and Release Gates

## Executable Asset Plan

## Open Gaps and Waivers

## Definition of Done
```

Write `none` with a reason for non-applicable profiles. Do not remove sections in a way that hides whether risk was evaluated.

### 5. Review and Approve

Review the Test Spec independently for:

- complete requirement coverage
- correct contract version
- happy, error, edge, and limit branches
- realistic data and environment preconditions
- explicit P0/P1 blocking evidence
- measurable performance and capacity thresholds
- separation from implementation details

Only an approved Test Spec may produce release-eligible test plans and results.

### 6. Save and Handoff

Save the Test Spec next to its source Feature Spec. Resolve `<specsDir>` in order: explicit user request > `.specos/manifest.yaml` `artifacts.specsDir` > legacy `tests/specs/` > default `.features/` (see `rules/shared/artifact-locations.md`).

```text
<specsDir>/<SPEC-ID>-<slug>/test-spec.md
```

Keep executable planning and evidence separate under `artifacts.testsDir` and `artifacts.resultsDir` (defaults below):

```text
tests/plans/<SPEC-ID>.test-plan.*
tests/schedules/<SPEC-ID>.test-schedule.*
tests/results/<SPEC-ID>.<run-id>.*
```

After approval, hand the Test Spec to project-specific test-plan generation and specialized test agents.

## Version and Staleness Rules

- Bind every Test Spec to one exact `source_spec_version`.
- Mark the Test Spec `stale` when the source Spec version or hash changes.
- Diff changed requirements and contracts before regenerating.
- Preserve unaffected verification identifiers when possible.
- Block review and ship gates when results reference a stale Test Spec or mismatched source version.
- Never rewrite historical results to point at a newer Spec.

## Parallel Delivery

After Feature Spec approval, allow two tracks:

```text
approved Feature Spec
├── to-issues -> implementation + implementation-coupled unit tests
└── spec-to-test -> Test Spec -> independent test assets
```

Test design, fixtures, mocks, API collections, scenario definitions, and k6 models may be prepared while implementation proceeds. Live API, scenario, E2E, performance, load, and stress execution waits for a deployable test target. Both tracks converge at test evidence, review, and ship gates.

## Relationship to Other Skills

```text
prd
  -> prd-to-spec
  -> spec approval
      ├── to-issues -> implementation
      └── spec-to-test -> independent verification
  -> review-it
  -> ship-it
```

- `prd-to-spec` produces only the Feature Spec.
- `spec-to-test` produces the Test Spec.
- `to-issues` may start implementation planning as soon as the Feature Spec is approved.
- `tdd` governs implementation-coupled tests, not independent verification.
- `review-it` and `ship-it` must reject stale or missing blocking test evidence.
