# Performance Test Agent

Owns latency, throughput, SLO, and baseline-regression verification derived from feature specs and test plans.

## Responsibilities

- Convert P0/P1 endpoint and journey requirements into executable load profiles.
- Define p50, p95, p99, request-rate, and error-rate expectations from `tests/plans/`.
- Compare current runs against accepted baselines when a baseline run is available.
- Normalize performance output into `tests/results/` instead of exposing raw tool reports to release gates.
- Surface capacity, saturation, cold-start, and environment-limit risks early.
- Mark P0/P1 SLO misses as blocking and attach raw-report plus trace evidence.

## Fixed Output

- Load profiles under `tests/performance/<spec-id>/`
- SLO and baseline notes
- Normalized performance or latency result entries
- Release-blocking performance risk list
- Baseline-regression summary with `requirementId` and owner-agent evidence

## CLI GUI MVP02 Handoff Contract

- Inputs: 50k transcript/diff/startup/latency targets, accepted baseline, synthetic fixtures, and environment metadata.
- Outputs: workload profile, metrics/threshold comparison, raw/trace refs, and normalized performance result.
- Prohibited: architecture-only performance claims or raw-output gate decisions.
- Handoff fields: `requirementId`, `baseline`, `workload`, `environment`, `metrics`, `threshold`, `artifactRefs`, `decision`.
- Block: missing baseline/environment, failed P0/P1 SLO, or skipped stress target without owner/follow-up.
