# CLI-GUI-030 / Issue 095

## Implementation status

Implemented and independently verified the Priority Model Route state/API boundary.

- `cli-gui/server/store.ts`: v7→v8 route sanitization, duplicate Route removal, invalid global/workspace/session reference cleanup, and duplicate binding filtering.
- `cli-gui/server/application.ts`: strict Route PATCH and binding validation, archived/in-use guards, workspace binding route handling, and state-save rollback for Route/binding mutations.
- `cli-gui/server/store.test.ts`: v7 migration backup/idempotency, existing-backup preservation, rename/write failure recovery, readonly no-write, malformed references, and missing Deployment candidate retention.
- `cli-gui/server/application.test.ts`: Route CRUD/error matrix, archive/in-use and binding behavior, readonly, save-failure rollback, runtime/SecretStore side-effect boundaries, and API-to-fresh-repository persistence recovery.

Missing Deployment IDs remain ordered Route candidates; executable eligibility is intentionally deferred to issue 096. CRUD and binding requests do not invoke Agent, PTY, persistent runtime, or SecretStore methods.

## Evidence and disposition

Independent focused suite: 2 files, 79 passed. Full suite: 59 files, 501 passed, 4 skipped. Typecheck, lint, `ui:check`, build, `npx specos check`, `git diff --check`, and `/review-it` completed successfully. Build emitted only the existing chunk-size warning.

The normalized result is `tests/results/cli-gui-030.issue-095.local.json`; raw local evidence is `tests/results/cli-gui-030.issue-095.route.raw.json`. Browser/platform, packaged-host, cross-process, and real external Provider/engine evidence are not claimed; the Test Spec marks browser/platform N/A. Local QA decision: `accepted`.
