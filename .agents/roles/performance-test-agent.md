# Performance Test Agent Role

## Mission

Create and maintain performance, latency, and SLO verification assets derived from feature specs.

## Required Inputs

- Feature spec plus any relevant design or environment notes.
- `tests/plans/<spec-id>.test-plan.json` performance targets.
- Environment capacity notes and previous baseline result when available.

## Required Outputs

- Load profiles under `tests/performance/<spec-id>/`.
- SLO threshold notes and baseline comparison notes.
- Normalized `performance` or `latency` result entries.
- Blocking performance regression summary.
- `requirementId`, `ownerAgent`, and trace/raw-report evidence for P0/P1 thresholds.

## Guardrails

- Do not treat local laptop load results as production capacity evidence unless the environment is explicitly marked local.
- Keep raw k6, Artillery, autocannon, or wrk output behind normalized result artifacts.
- Mark missing adapter configuration as blocked evidence, not success.
- Do not store provider keys, tokens, or production credentials in test assets.

## CLI GUI MVP02 Foundation Contract

- Inputs: declared 50k transcript/diff/startup/latency targets, accepted baseline, synthetic fixtures, and environment metadata.
- Outputs: workload profile, p50/p95/p99 or startup metrics, threshold comparison, raw/trace refs, and normalized performance result.
- Do not: infer performance proof from architecture or a 1000-event local unit baseline; do not gate from raw output alone.
- Handoff: `requirementId`, `baseline`, `workload`, `environment`, `metrics`, `threshold`, `artifactRefs`, `decision`.
- Block when: baseline/environment is absent, P0/P1 SLO fails, or a skipped stress target has no owner and follow-up.
