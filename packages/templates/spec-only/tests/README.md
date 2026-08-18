# Tests

Generated verification evidence and execution assets live here.

## Canonical Verification Contract

The authoritative verification contract for a requirement is the `test.md` inside its Requirement Package:

```text
.requirements/requirements/R001-<slug>/
  prd.md
  spec.md
  test.md      <- verification contract (TEST-R001-F01-###, exit criteria)
  issues.md
```

`tests/` holds the generated/executed artifacts derived from that contract:

- `tests/plans/`: generated `test-plan` artifacts derived from `test.md`.
- `tests/schedules/`: generated agent routing schedules that split execution (implementation) and testing (verification) tracks.
- `tests/results/`: normalized `scenario-result` and gate-report artifacts the test console consumes.
- `tests/bruno/` (when used): API request collections and HTTP assertions derived from the API contract.

## Result Model

The report UI must consume normalized results instead of framework-specific output. Every test run should be traceable to:

- `requirementId` / `specId` / `testId`
- `run_id`
- `test_type`
- `status`
- `summary`
- `evidence`

Production runs must also include `standardVersion`, `qualityProfile`, item-level `requirementId`, `ownerAgent`, `evidenceQuality`, `attempts`, `flakeClassification`, and `artifactRefs`.

## Production Standard

`specos-test-standard/v1` is enforced for production test plans and gate reports. P0/P1 blocking evidence gaps stop release and merge readiness. P2 gaps remain visible as warning or informational evidence unless a gate marks them blocking.

## Agent Isolation

For an active Requirement Package, generate `test-plan` and `test-schedule` artifacts directly from `test.md` before assigning implementation and verification issues:

```bash
node packages/cli/dist/main.js generate-test-plan .requirements/requirements/R001-<slug>/spec.md --change R001
```

The generated schedule records two separate tracks:

- `execution`: implementation-only work, owned by the execution agent.
- `testing`: spec-and-contract-only work, owned by test agents.

Execution issues may write implementation-coupled unit tests under existing module-local test paths. Execution issues must not write independent verification assets under `tests/bruno/`, `tests/scenarios/`, `tests/e2e/`, `tests/playwright/`, or `tests/results/`. Test issues must not write implementation source paths or unit-test assets.

## API Execution

API tests run through the CLI after a plan and schedule exist:

```bash
node packages/cli/dist/main.js generate-bruno-tests <specId>
node packages/cli/dist/main.js run-api-tests <specId>
```

`generate-bruno-tests` writes deterministic Bruno assets under `tests/bruno/<specId>/` from the test plan. `run-api-tests` reads `tests/bruno/<specId>/` as the API execution asset location and writes a blocked normalized result under `tests/results/` when the adapter is missing, so release gates can stop honestly.
