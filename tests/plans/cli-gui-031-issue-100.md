# Independent test plan — CLI-GUI-031 issue 100

- Source: CLI-GUI-031 Feature Spec/Test Spec and issue #100.
- Matrix: six allowed clean failure classes; forbidden/config/auth/secret/unknown; disabled fallback; no candidate; exhaustion; persist-before-run; duplicate execute; completed replay; candidate freeze; stale cancel; unknown side-effect fallback.
- Commands: focused coordinator/application tests; full Vitest; typecheck; lint/ui:check; build; `npx specos check`; `git diff --check`.
- Browser/platform: N/A per Test Spec; no screenshot/trace required or produced.
- Expected gate: blocked until persisted awaiting-confirmation retry context can be safely recovered after new coordinator/process restart.
- Final result: `tests/results/cli-gui-031.issue-100.local.json`.
- Raw evidence: `tests/results/cli-gui-031.issue-100.coordinator.raw.json`.
