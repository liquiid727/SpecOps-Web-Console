# QA report — CLI-GUI-031 issue 100

## Handoff and normalized status

Handoff: `implementation/CLI-GUI-031-issue-100.md`.

Normalized result: `tests/results/cli-gui-031.issue-100.local.json`, schema `1.0`, standard `specos-test-standard/v1`, `status=blocked`, `releaseDecision=blocked`. Raw local evidence: `tests/results/cli-gui-031.issue-100.coordinator.raw.json`.

## Evidence matrix

| Gate | Evidence | Result |
|---|---|---|
| Failure/cardinality | Six allowed clean classes produce primary + one fallback; forbidden/disabled/no-candidate/exhaustion counts are deterministic | Passed independently |
| Persistence/order | Attempt is persisted and transitioned to running before `runAttempt`; candidate/deployment snapshots are frozen | Passed independently |
| Idempotency/cancel | Duplicate execute coalesces; stale cancel validates revision before abort; basic cancel race passes | Passed independently |
| Replay | Completed snapshot is readable by a new coordinator; awaiting-confirmation retry handler cannot be restored from persisted state | P1 blocked |
| Local gates | Focused 83; full 592 passed/4 skipped; typecheck/lint/ui:check/build/SpecOS/diff passed | Passed |
| Review | review-it helper plus read-only review; stale-cancel finding fixed, restart-confirmation finding remains | Blocked |
| Browser/platform | Test Spec marks both N/A | N/A |

## Decision

**blocked** — the local fallback/cardinality contract is evidenced, but the remaining P1 restart-confirmation gap prevents issue completion.

## Recovery condition

Issue-101/102 must persist enough candidate/retry context to rebuild a safe `runAttempt` binding, or explicitly transition persisted awaiting-confirmation tasks to a recoverable terminal state. Then rerun the #100 matrix and review.
