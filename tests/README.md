# Tests

Spec-driven verification assets live here.

## Expected Layers

- `tests/plans/`: spec-derived `test-plan` artifacts that define endpoints, scenarios, branches, and preconditions.
- `tests/plans/`: spec-derived `test-plan` artifacts that define business flows, stages, endpoints, scenarios, branches, and preconditions.
- `tests/results/`: normalized `scenario-result` artifacts that the independent test console consumes.
- `tests/bruno/`: API request collections and HTTP assertions derived from accepted specs.
- `tests/scenarios/`: business-flow and E2E scenario assets.

## Result Model

The report UI must consume normalized results instead of framework-specific output. Every test run should be traceable to:

- `spec_id`
- `spec_version`
- `run_id`
- `test_type`
- `status`
- `summary`
- `evidence`

## V1 Scope

The first release focuses on API and Scenario/E2E verification. Unit and specialized checks are reserved in the model so the report UI can expand without changing the core schema.
