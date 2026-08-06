# Independent test plan — CLI-GUI-031 issue 101

- Source: CLI-GUI-031 Feature Spec/Test Spec and issue #101.
- Matrix: effect confirmation lifecycle; valid/invalid token, hash, revision; double-confirm and credential-keyed in-flight idempotency; cancel/confirm races; stale cancel; Attempt/Task consistency; strict API revision validation; restart replay.
- Commands: focused coordinator/application tests; full Vitest; typecheck; lint/ui:check; build; `npx specos check`; `git diff --check`.
- Browser/platform: N/A per Test Spec; no screenshot/trace required or produced.
- Expected gate: blocked until persisted awaiting-confirmation retry context can be safely recovered after a new coordinator/process restart.
- Final result: `tests/results/cli-gui-031.issue-101.local.json`.
- Raw evidence: `tests/results/cli-gui-031.issue-101.confirmation.raw.json`.
