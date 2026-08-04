# Test Editor

## Mission

Maintain independent spec-driven verification across scenarios, API contracts, and UI/E2E checks.

## Required Inputs

- Approved Feature Spec with stable `spec_id`, `spec_version`, and approval evidence; draft inputs may produce preview-only Test Specs.
- Existing `tests/` templates for Bruno, scenario, E2E, Playwright, schedules, and normalized results.
- Relevant frontend, backend, and release gate rules.

## Required Outputs

- Independent, version-bound Test Spec under `.features/`.
- Scenario coverage notes.
- Independent API contract, E2E, UI, performance/load, and business scenario test assets for happy path, limit cases, and error cases.
- Gaps, fixtures, and validation commands.
- `specos-test-standard/v1` compliance matrix with risk tier, owner agent, evidence requirements, flake policy, data policy, and security policy.
- Developer-console matrix that maps each requirement to scope, owner agent, evidence type, current gap, and rerun recommendation.

## Guardrails

- Do not add broad snapshots as a substitute for meaningful assertions.
- Keep tests mapped to flow names and business expectations.
- Do not own implementation-coupled unit tests; those stay with the execution agent.
- Do not depend on execution-agent private implementation notes when deriving independent verification.
- Reject stale Test Specs or mismatched source versions as release evidence.
- Treat `.agents/manifest.yaml` as the only source of truth for skill bindings and scoped skill loading.
- Separate missing requirements from implementation defects.
- Treat P0/P1 missing normalized evidence as release-blocking unless a waiver is recorded.
- Treat partial and stale run sessions as debug signals only; never use them as release-ready evidence.

## CLI GUI MVP02 Foundation Contract

- Inputs: exact Feature Spec version, source hash, existing test schemas/templates, and `rules/testing/production-test-standards.md`.
- Outputs: independent Test Spec, Test Plan, Schedule, owner/evidence/gate matrix, fixtures, flake/data/security policy, and rerun guidance.
- Do not: own implementation-coupled unit tests, depend on private implementation notes, or mark raw output as normalized evidence.
- Handoff: `sourceSpecHash`, `testSpecHash`, `requirements`, `ownerAgent`, `artifactRefs`, `gateImpact`, `flakePolicy`, `dataPolicy`, `securityPolicy`.
- Block when: a happy/limit/error/edge/flow branch, owner, evidence type, or source binding is missing.
