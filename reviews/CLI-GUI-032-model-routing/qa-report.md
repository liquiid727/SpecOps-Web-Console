# CLI-GUI-032 Model Routing QA Report

## Scope

- Feature Specs: `CLI-GUI-026` through `CLI-GUI-032`
- Implementation Issues: `084` through `107`
- Independent verification Issues: `108` through `114`
- Plan: `cli-gui/doc/model-routing/prompt-full-implementation.md`
- Branch: `feature-cli-gui`
- Delivery policy: local implementation and verification only; no commit, push, or PR

## Local Acceptance

The model routing chain is implemented across provider configuration, secret references, deployment registry, priority route resolution, execution attempts, bounded fallback, transcript recovery, and the routing UI. The implementation keeps provider execution behind the existing CLI/Agent Engine seams; credentials are write-only and are passed through launch environment state.

The following local gates passed:

| Gate | Result |
| --- | --- |
| `npm test -- --run` | Passed: 54 files, 429 passed, 4 skipped |
| `npm test -- --run --pool=threads --maxWorkers=1 --minWorkers=1` | Passed: 54 files, 429 passed, 4 skipped |
| `npm run build` | Passed; existing Vite chunk-size warning remains |
| `npm run ui:check` | Passed; designmd emitted informational output only |
| `npx specos check` | Passed |
| `git diff --check` | Passed |

One earlier default-parallel run exposed a timing-sensitive Claude resume assertion (`sess-1` versus `sess-2`). The focused test, the two-file server run, the single-worker suite, and the final default-parallel suite all passed. No production workaround was added for that non-reproducible test-runner timing symptom.

## Traceability Artifacts

- Independent Test Specs were added for `CLI-GUI-026` through `CLI-GUI-032`.
- Normalized test plans were added under `tests/plans/` with source and Test Spec hashes.
- Verification Issues `108` through `114` were added after local issue `107` and remain ready for independent execution.
- Implementation handoffs were added under `implementation/` for each Feature Spec.
- Gate reports were generated under `tests/results/` without fabricating scenario results.

## Blockers And Residual Evidence

`validate-test-gates` parses all seven plans but reports `SPECOS_TEST_GATES_BLOCKED` because normalized unit/API/security/migration/concurrency/E2E result evidence has not been independently produced. The reports intentionally remain blocked rather than claiming local test output as independent evidence.

Browser acceptance was attempted against the listeners on ports `3000` and `3001`. The browser integration rejected navigation to the local URL because local-page permission was declined, so no browser screenshots, responsive checks, second-send checks, or browser secret-canary scan are claimed. The exact process command for the listeners was also unavailable because process inspection was restricted; listener cwd evidence was collected.

The remaining closeout work is therefore external to the implementation itself:

1. Execute Issues `108` through `114` and write normalized evidence into the seven gate reports.
2. Re-run browser acceptance after local URL permission is available at `1280x900`, `900x900`, and `640x900`.
3. Reconfirm the secret canary and fallback confirmation/cancel/exhausted journeys in the browser session.
