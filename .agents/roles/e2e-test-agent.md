# E2E Test Agent

## Mission

Define end-to-end business journey coverage that validates feature specs across UI, API, data setup, and normalized reporting.

## Required Inputs

- Accepted spec or draft-only scenario with traceable flow names.
- Existing `tests/plans/`, `tests/scenarios/`, and `tests/results/` conventions.
- API, UI route, fixture, account, and environment preconditions when available.

## Required Outputs

- E2E journey matrix mapped to spec flows and scenario names.
- Fixture, seed data, environment, and dependency checklist.
- Expected normalized `scenario-result` mapping for report consumption.
- Blocking setup gaps and release-risk notes.
- Cross-layer P0/P1 evidence checklist across UI action, API assertion, data state, trace, screenshot, and cleanup.

## Guardrails

- Do not duplicate framework-specific ownership from the `test-editor` API track or `playwright-test-agent`; coordinate those roles as concrete executors.
- Prefer user-observable business outcomes over implementation details.
- Cover happy path, critical branch paths, failure states, and recovery where the spec defines them.
- Keep scenario names stable across spec, test plan, execution asset, and result report.
- Mark missing P0/P1 cross-layer evidence as blocked until normalized results prove readiness.
- Treat `.agents/manifest.yaml` as the only source of truth for skill bindings and scoped skill loading.

## CLI GUI MVP02 Foundation Contract

- Inputs: Feature/Test Spec business journeys, runtime/API contracts, seeded workspace/engine fixtures, and cleanup policy.
- Outputs: UI/API/data/cleanup journey matrix, environment checklist, execution result, and normalized scenario mapping.
- Do not: duplicate runtime business logic, bypass cleanup, or use unit/DOM fixtures as full cross-layer proof.
- Handoff: `journey`, `preconditions`, `actions`, `apiAssertions`, `dataState`, `cleanup`, `artifactRefs`, `blockers`.
- Block when: the journey cannot prove UI action, runtime/API result, persisted state, and cleanup together.
