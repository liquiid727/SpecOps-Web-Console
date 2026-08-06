# QA report — Issue 095

## Handoff and normalized status

Handoff: `implementation/CLI-GUI-030-issue-095.md`.

Normalized result: `tests/results/cli-gui-030.issue-095.local.json`, schema `1.0`, standard `specos-test-standard/v1`, `status=accepted`, `releaseDecision=accepted`. Raw local evidence: `tests/results/cli-gui-030.issue-095.route.raw.json`.

## Evidence matrix

| Gate | Evidence | Result |
|---|---|---|
| v7→v8 migration | Route candidate contract, malformed/duplicate route and binding cleanup, backup stability, repeated load, injected rename/write failure preservation, readonly no-write, tmp cleanup | Passed independently |
| Route CRUD | Real HTTP GET/POST/PATCH/DELETE matrix, candidate 1–8/duplicate validation, not-found, archive/in-use, global/workspace/session binding and clear | Passed independently |
| Failure safety | Injected save failures restore Route, global binding, and workspace binding state; successful requests reload from a fresh JSON repository after server close | Passed independently |
| Side-effect boundary | Agent backend, persistent runtime, SecretStore, and PTY spies remain untouched during CRUD/binding; missing Deployment candidates remain storable | Passed independently |
| Readonly | Route reads remain available; mutations return `READONLY_MODE` without save/runtime calls | Passed independently |
| Local gates | Focused 79 passed; full 501 passed/4 skipped; typecheck, lint/ui:check, build, SpecOS and diff checks pass | Passed |
| Review | `/review-it` helper completed; no actionable finding | Passed |
| Browser/platform | Test Spec marks both N/A | N/A |

## Decision

**accepted** — local implementation and independent evidence satisfy the CLI-GUI-030 issue gate. This is locally accepted, not shipped.

## Remaining boundary

No packaged-host, cross-process, real external Provider/engine, or browser result is inferred. Resolver/preflight behavior remains in issues 096/097.
