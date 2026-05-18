# Execution Plan

## Scope

Implement the first slice of the spec-change agent workflow:

- Core test schedule model and validation.
- Deterministic test schedule generation from a normalized test plan.
- CLI command that reads a normalized spec and writes both test-plan and test-schedule artifacts.
- Documentation for the active change lifecycle and agent isolation rules.

## Commands

Generate artifacts from a normalized spec file:

```bash
node packages/cli/dist/main.js generate-test-plan specs/changes/<change-id>/spec.json --change <change-id>
```

Optional execution mode:

```bash
node packages/cli/dist/main.js generate-test-plan specs/changes/<change-id>/spec.json --change <change-id> --mode test-after-execution
```

## Expected Outputs

- `tests/plans/<spec-id>.test-plan.json`
- `tests/schedules/<spec-id>.test-schedule.json`

The schedule must include separate `execution` and `testing` tracks. Execution tasks can write implementation-coupled unit tests such as `tests/unit/<spec-id>/`. Execution tasks cannot write independent verification directories such as `tests/bruno/`, `tests/scenarios/`, `tests/e2e/`, `tests/playwright/`, or `tests/results/`. Testing tasks cannot write implementation source or unit-test paths.

## API Test Execution

Generate Bruno API assets from a test plan:

```bash
node packages/cli/dist/main.js generate-bruno-tests <spec-id>
```

Run API tests for a generated schedule:

```bash
node packages/cli/dist/main.js run-api-tests <spec-id>
```

The command consumes:

- `tests/plans/<spec-id>.test-plan.json`
- `tests/schedules/<spec-id>.test-schedule.json`
- `tests/bruno/<spec-id>/`

If Bruno assets or adapter configuration are missing, the command writes a blocked normalized result to `tests/results/` and exits non-zero. This keeps release gates honest while the Bruno execution adapter is still being completed.

Bind a concrete API test command when the project has Bruno or a compatible runner:

```bash
node packages/cli/dist/main.js run-api-tests <spec-id> --command "bru run tests/bruno/<spec-id>"
```

The command runs from the project root. Exit code `0` becomes a ready/pass normalized result. Non-zero exit codes become blocked/warning normalized results with stdout and stderr captured as evidence.
