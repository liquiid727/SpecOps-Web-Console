# Orchestration Scripts

Pipeline scripts that connect spec generation, review, test generation, and validation belong here.

## Test Runner

Use `test-runner.mjs` to simulate or normalize a spec-driven test execution into a `tests/results/` artifact.

Example:

```bash
node scripts/orchestration/test-runner.mjs reward-order 1.2.0 all
node scripts/orchestration/test-runner.mjs reward-order 1.2.0 ready
```

Inputs:

- `specId`
- optional `specVersion`
- optional `runScope` of `api`, `scenario`, `performance`, `concurrency`, `all`, or `ready`

Output:

- one normalized result file under `tests/results/`

The developer test console wraps this runner with a broader local scope model:

- `unit`: root `npm test`
- `api`: `test-runner.mjs <specId> <specVersion> api`
- `scenario`: `test-runner.mjs <specId> <specVersion> scenario`
- `performance`: `test-runner.mjs <specId> <specVersion> performance`
- `concurrency`: `test-runner.mjs <specId> <specVersion> concurrency`
- `gate`: `scripts/checks/spec-test-gates.mjs <specId> --change <changeId>`
- `all`: fixed order `unit -> api -> scenario -> performance -> concurrency -> gate`

Every console-triggered run writes a `tests/results/<specId>.<runId>.session.json` artifact that records command summaries, exit codes, generated normalized artifacts, and the gate report path. The session artifact is for developer debugging and history; release decisions still come from normalized result evidence plus gate reports.

`ready` emits current-format API, scenario, performance, and concurrency evidence for sample/demo verification. It is useful for checking the positive release-gate path with:

```bash
npm run build
node scripts/checks/spec-test-gates.mjs reward-order --change reward-order-ready
```
