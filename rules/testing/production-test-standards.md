# Production Test Standards

## Purpose

SpecOS test artifacts must be executable release evidence, not loose test notes. Every production test plan must connect a feature spec to risk-ranked requirements, owned test agents, normalized results, gate reports, and merge-readiness decisions.

## Standard Version

Production plans and results use:

- `standardVersion`: `specos-test-standard`
- `qualityProfile`: `backend-api`, `frontend-ui`, `fullstack-flow`, `data-migration`, or `agent-workflow`
- `riskTier`: `P0`, `P1`, or `P2`

## Required Evidence By Risk

- `P0`: unit or implementation-coupled checks, API or contract checks, business scenario/E2E checks, observability evidence, and any declared performance or concurrency evidence. Missing or failed evidence blocks release.
- `P1`: API or scenario evidence plus relevant security, compatibility, and observability checks. Missing or failed blocking evidence blocks release.
- `P2`: evidence is tracked as warning or informational unless a release gate explicitly marks it blocking.

## Required Test Plan Fields

Production `evidence/plans/*.test-plan.json` artifacts must include:

- `standardRequirements[]` with `id`, `layer`, `appliesTo`, `requiredFor`, `ownerAgent`, `requiredEvidence`, and `gateImpact`.
- `flakePolicy` with retry count, quarantine policy, and classification requirement.
- `dataPolicy` with seed/cleanup notes, dependency mode, PII policy, and secrets policy.
- `securityPolicy` with an explicit baseline. API profiles default to `owasp-api-top-10-2023`.

For `agent-workflow` profiles, plans must also include:

- an Eval dataset or sampled-input source, its version, and the success metrics and thresholds derived from the PRD/Spec;
- a PR smoke-Eval selection of 20–50 cases, plus the full-Eval selection used after merge or on a scheduled run;
- trajectory fields to retain, anomaly signals, and the automatic-degradation and human-handoff thresholds when the Agent can affect users, data, spend, or external systems.

## Required Result Evidence

Normalized `evidence/runs/*.json` artifacts must include:

- run-level `standardVersion`, `qualityProfile`, environment metadata, and commit or baseline metadata when available.
- item-level `requirementId`, `ownerAgent`, `evidenceQuality`, `attempts`, `flakeClassification`, and `artifactRefs`.
- blocking items must carry trace or raw-report evidence unless the gate explicitly requires another artifact type. For a GoalSpec Workspace, the owning Spec Package `evidence/` directory MUST store or reference this normalized result and the child `acceptance.md` MUST cite it.

## Pipeline Gates

- PR gates must run changed-scope unit tests and critical-path checks. `agent-workflow` changes must additionally run the planned 20–50-case smoke Eval.
- Post-merge or scheduled gates must run the applicable full regression suite, full Agent Eval, contract checks, and performance-baseline comparison. A baseline regression must remain visible to QA even when it is configured as non-blocking.
- Pre-production or canary gates must record release scope, online sampled-evaluation results, and any trajectory anomaly alerts. Missing required evidence blocks promotion for P0/P1 changes.
- Production signals must retain correlated trace, metric, and log references. Incidents or abnormal Agent outcomes must produce a tracked follow-up that adds reproducible samples to the controlled dataset or test suite.

## Quality Platform Ownership

- `test-editor`: standard matrix, coverage gaps, evidence policy, and final risk language.
- `unit-test-agent`: module-level assertions, branch and error semantics, and implementation-coupled unit coverage.
- `test-editor`: API contract, status codes, error codes, auth, idempotency, compatibility, API security assertions, and Bruno execution assets.
- `playwright-test-agent` and `e2e-test-agent`: UI state coverage, E2E journeys, screenshots, videos, traces, and failure recovery.
- `performance-test-agent`: latency, throughput, SLO thresholds, baseline regression, and capacity risk.
- `concurrency-test-agent`: retries, duplicate submissions, locking, idempotency, eventual consistency, and final-state invariants.
- `ci-editor`: CI commands, gate report interpretation, and release-blocking enforcement.
- `qa-agent`: final acceptance decision, residual risk language, waiver tracking, and promotion recommendation after test and review evidence exist.

Testing work includes maintaining the quality platform, not only authoring test
scripts: test-case management, controlled data factories, Eval execution and
reporting, failure insight, and safe self-healing support. Self-healing may
classify, retry, isolate, or propose a repair for environmental failures; it
must not rewrite product assertions, conceal a regression, or change a gate
result without human review.

AI may draft cases and analyze failures. A human owner must approve coverage,
assertions, risk tier, and any change to a dataset, test, quarantine, or gate
policy before it becomes release evidence.

## Developer Console Loop

The test console is the local developer control plane for the standard. It must let developers select a spec/change, inspect the derived test matrix, run a controlled scope, review the run session, inspect failures, rerun the smallest failing scope, and only then evaluate release readiness.

Allowed local scopes are:

- `unit`
- `api`
- `scenario`
- `performance`
- `concurrency`
- `gate`
- `all`

`all` must run in the fixed order `unit -> api -> scenario -> performance -> concurrency -> gate`. A partial run is useful for debugging but cannot make a release ready by itself. Stale sessions, invalid artifacts, missing evidence, and P0/P1 failed requirements must remain visible in the console and gate report.

## Release Enforcement

- `validate-test-gates <specId>` must block when P0/P1 blocking evidence is missing, invalid, failed, or unclassified flaky.
- Merge or release readiness must require a ready gate report for the attached feature spec.
- Raw runner output is not gate evidence until it is normalized and referenced by the owning Spec Package `evidence/` directory.
