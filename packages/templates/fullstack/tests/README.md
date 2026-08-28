# Tests

Generated verification evidence and execution assets live here.

## Canonical Verification Contract

The authoritative verification contract for a requirement is the `test.md` inside its Requirement Package:

```text
.requirements/requirements/R001-<slug>/
  prd.md
  specs/S01-<slug>/
    spec.md
    test.md    <- verification contract (TEST-R001-S01-###, exit criteria)
    issues/
```

The owning Spec Package `evidence/` holds generated and executed artifacts:

- `evidence/plans/`: generated `test-plan` artifacts derived from `test.md`.
- `evidence/schedules/`: generated execution and verification schedules.
- `evidence/runs/`: normalized scenario results and gate reports.
- `evidence/artifacts/` (when used): API collections and other execution assets.

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

`specos-test-standard` is enforced for production test plans and gate reports. P0/P1 blocking evidence gaps stop release and merge readiness. P2 gaps remain visible as warning or informational evidence unless a gate marks them blocking.

## Agent Isolation

For an active Requirement Package, record `test-plan` and `test-schedule` artifacts under the selected child package's `evidence/` directory before assigning implementation and verification issues.

The generated schedule records two separate tracks:

- `execution`: implementation-only work, owned by the execution agent.
- `testing`: spec-and-contract-only work, owned by test agents.

Execution issues may write implementation-coupled unit tests under existing module-local test paths. Independent verification assets belong under the owning package's `evidence/` tree.

## API Execution

API test assets and normalized results belong under the owning package's `evidence/artifacts/` and `evidence/runs/` directories.
