# Test Results

This directory stores normalized `scenario-result` artifacts.

The independent test console should read this normalized output instead of directly consuming:

- Bruno collections
- Playwright output
- raw coverage files

Each result record should be traceable to one spec version and include enough summary and evidence fields for drill-down views.

Production result records using `specos-test-standard/v1` should include:

- run-level `standardVersion`, `qualityProfile`, environment metadata, and commit or baseline metadata when available.
- item-level `requirementId`, `ownerAgent`, `evidenceQuality`, `attempts`, `flakeClassification`, and `artifactRefs`.
- trace, screenshot, video, log, raw-report, or gate-report references as normalized artifact evidence.

## Gate Reports

`*.gate-report.json` files are release gate summaries generated from normalized run results. The test console ignores them when loading ordinary runs, while CI and reviewers can inspect them as release evidence.

Example:

```bash
npm run build
node scripts/checks/spec-test-gates.mjs reward-order --change reward-order-ready
```

This writes `tests/results/reward-order.reward-order-ready.gate-report.json` when the sample ready-path evidence is present.

Gate reports include `standardCompliance`, `riskSummary`, and `agentEvidenceSummary` for test-console and CI review.

## Run Sessions

`*.session.json` files are developer-console run history. They do not replace normalized result evidence and must not be loaded as ordinary `TestRun` records.

Each session records:

- `runId`, `specId`, `specVersion`, `changeId`, selected `scope`, status, and exit code.
- ordered `commands[]` with command, args, cwd, status, exit code, stdout/stderr summaries, and timestamps.
- generated `resultArtifacts[]` and optional `gateReportPath`.

The console uses sessions for the local debug loop: see the last command, inspect failure summaries, detect partial or stale runs, rerun the smallest failing scope, and compare recent attempts. CI and release gates still evaluate normalized `tests/results/*.json` plus `*.gate-report.json`.
