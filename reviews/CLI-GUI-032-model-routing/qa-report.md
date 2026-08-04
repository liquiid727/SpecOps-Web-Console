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
| `npm --prefix cli-gui run test -- --run` | Passed: 57 files, 446 passed, 4 skipped |
| `npm --prefix cli-gui run test -- --run server/chat-api.test.ts` | Passed: 19 tests; rerun after one parallel timing failure |
| `npm --prefix cli-gui run typecheck` | Passed |
| `npm --prefix cli-gui run build` | Passed; existing Vite chunk-size warning remains |
| `npm --prefix cli-gui run ui:check` | Passed; designmd emitted informational output only |
| `npx specos check` | Passed |
| `git diff --check` | Passed |

One default-parallel run exposed a timing-sensitive Claude resume assertion (`sess-1` versus `undefined`). The focused test and the final default-parallel suite passed; no production workaround was added for that non-reproducible test-runner timing symptom.

## Traceability Artifacts

- Independent Test Specs were added for `CLI-GUI-026` through `CLI-GUI-032`.
- Normalized test plans were added under `tests/plans/` with source and Test Spec hashes.
- Verification Issues `108` through `114` were added after local issue `107` and remain ready for independent execution.
- Implementation handoffs were added under `implementation/` for each Feature Spec.
- Gate reports were generated under `tests/results/` without fabricating scenario results.

## Blockers And Residual Evidence

All seven `node scripts/checks/spec-test-gates.mjs CLI-GUI-02x` commands were run and returned `SPECOS_TEST_GATES_BLOCKED`: `tests/results/` still has no normalized unit/API/security/migration/concurrency/scenario result records. The reports intentionally remain blocked rather than claiming local Vitest output as independent evidence.

The real local GUI URL is `http://127.0.0.1:3000/` (Vite PID `94863`, cwd `/Users/liquiid/code/specos-ai/cli-gui`), with the existing backend on `http://127.0.0.1:3001/` (Node PID `38911`, same cwd). Playwright launched its fixture/build but Chromium exited before the first assertion with `MachPortRendezvousServer ... Permission denied`. The ego-browser runner could not connect to its bootstrap. The Chrome extension connection then timed out while opening the local page. No screenshots, responsive checks, second-send checks, or browser secret-canary scan are claimed.

The current host also only provides the macOS Keychain adapter; Windows/Linux credential-store evidence is not claimed.

The remaining closeout work is therefore external to the implementation itself:

1. Execute Issues `108` through `114` and write normalized evidence into the seven gate reports.
2. Re-run browser acceptance after local URL permission is available at `1280x900`, `900x900`, and `640x900`.
3. Reconfirm the secret canary and fallback confirmation/cancel/exhausted journeys in the browser session.
