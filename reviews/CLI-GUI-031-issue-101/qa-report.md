# QA report — CLI-GUI-031 issue 101

## Handoff and normalized status

Handoff: `implementation/CLI-GUI-031-issue-101.md`.

Normalized result: `tests/results/cli-gui-031.issue-101.local.json`, schema `1.0`, standard `specos-test-standard/v1`, `status=blocked`, `releaseDecision=blocked`. Raw local evidence: `tests/results/cli-gui-031.issue-101.confirmation.raw.json`.

## Evidence matrix

| Gate | Evidence | Result |
|---|---|---|
| Confirmation lifecycle | possible/confirmed/unknown await confirmation; valid confirmed-retry; token/hash/revision cleanup | Passed independently |
| Idempotency | double confirm; full-credential in-flight key; wrong-token-first/right-token-second | Passed independently |
| Cancellation consistency | cancel winner, stale cancel, cancel/confirm race, Attempt transition failure, no extra Attempt | Passed independently |
| API contract | missing/NaN/fractional/negative expected revision rejected | Passed independently |
| Restart | completed snapshot readable; awaiting-confirmation retry handler not recoverable from new coordinator | P1 blocked |
| Local gates | Focused 89; full 598 passed/4 skipped; typecheck/lint/ui:check/build/SpecOS/diff passed | Passed |
| Review | review-it helper plus read-only review; actionable local findings fixed, restart blocker remains | Blocked |
| Browser/platform | Test Spec marks both N/A | N/A |

## Decision

**blocked** — local confirmation/cancel behavior is independently evidenced, but restart-safe confirmation context is not recoverable.

## Recovery condition

Issue-102 must persist the safe confirmation/retry context or define an explicit recoverable terminal state. Then rerun the #101 matrix, including new-coordinator confirm and cross-process idempotency.
