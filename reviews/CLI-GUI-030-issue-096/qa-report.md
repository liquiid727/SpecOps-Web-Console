# QA report — Issue 096

## Handoff and normalized status

Handoff: `implementation/CLI-GUI-030-issue-096.md`.

Normalized result: `tests/results/cli-gui-030.issue-096.local.json`, schema `1.0`, standard `specos-test-standard/v1`, `status=accepted`, `releaseDecision=accepted`. Raw local evidence: `tests/results/cli-gui-030.issue-096.route.raw.json`.

## Evidence matrix

| Gate | Evidence | Result |
|---|---|---|
| Precedence and provenance | Table-driven undefined inheritance, system/global/project/session precedence, run fixed trace, deterministic `now` | Passed independently |
| Candidate exclusions | Every public RouteExclusionCode, Route disabled/archived plus Deployment reasons, multi-cause stable deduplication, original position/order | Passed independently |
| Fixed target | Eligible, non-member, missing, disabled, archived, provider, credential, engine, model, and empty fixed values; no silent fallback | Passed independently |
| Legacy/error semantics | No-route legacy, no-route fixed blocking, missing bound route, and no executable candidate | Passed independently |
| Purity boundary | Production resolver type-only imports and static no-I/O/runtime dependency check; application contract compatibility | Passed independently |
| Local gates | Focused 43 passed; full 540 passed/4 skipped; typecheck, lint/ui:check, build, SpecOS and diff checks pass | Passed |
| Review | `/review-it` helper completed; no actionable finding | Passed |
| Browser/platform | Test Spec marks both N/A | N/A |

## Decision

**accepted** — local pure resolver implementation and independent evidence satisfy the CLI-GUI-030 issue gate. This is locally accepted, not shipped.

## Remaining boundary

API/session/preflight wiring remains issue 097. No packaged-host, cross-process, real external Provider/engine, or browser result is inferred.
