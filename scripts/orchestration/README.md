# Orchestration Scripts

Pipeline scripts that connect spec generation, review, test generation, and validation belong here.

## Test Runner

Use `test-runner.mjs` to simulate or normalize a spec-driven test execution into the selected child spec's `evidence/artifacts/` directory.

Example:

```bash
node scripts/orchestration/test-runner.mjs R002-goalspec-console/S01-evidence-console 2.0.0 all
node scripts/orchestration/test-runner.mjs R002-goalspec-console/S01-evidence-console 2.0.0 ready
```

Inputs:

- `R###-slug/S##-slug` child selector
- optional `specVersion`
- optional `runScope` of `api`, `scenario`, `performance`, `concurrency`, `all`, or `ready`

Output:

- one normalized result file under `specs/SNN-slug/evidence/artifacts/`

The developer test console wraps this runner with a broader local scope model:

- `unit`: root `npm test`
- `api`: `test-runner.mjs <R###-slug/S##-slug> <specVersion> api`
- `scenario`: `test-runner.mjs <R###-slug/S##-slug> <specVersion> scenario`
- `performance`: `test-runner.mjs <R###-slug/S##-slug> <specVersion> performance`
- `concurrency`: `test-runner.mjs <R###-slug/S##-slug> <specVersion> concurrency`
- `gate`: `scripts/checks/spec-test-gates.mjs <R###-slug/S##-slug> --change <changeId>`
- `all`: fixed order `unit -> api -> scenario -> performance -> concurrency -> gate`

Every console-triggered run writes a `specs/SNN-slug/evidence/runs/<runId>.session.json` artifact that records command summaries, exit codes, generated normalized artifacts, and the gate report path. Release decisions come from the selected child spec's evidence plus its gate report.

`ready` emits current-format API, scenario, performance, and concurrency evidence for sample/demo verification. It is useful for checking the positive release-gate path with:

```bash
npm run build
node scripts/checks/spec-test-gates.mjs R002-goalspec-console/S01-evidence-console --change evidence-console
```
