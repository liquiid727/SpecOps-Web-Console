# Test Plan — Issue 092

Verify the deployment state persistence boundary from a real v6 fixture through the repository's current v8 envelope, while keeping registry/API gates separate.

## Local matrix

- Run `server/store.test.ts`, `server/application.test.ts`, and `shared/types.test.ts`.
- Verify v6 defaults, malformed deployment filtering, archived history, source-version backup, pre-existing backup preservation, repeated-load idempotency, rename-failure source/backup preservation, and temporary-file cleanup.
- Verify shared deployment types export `unknown` capability and do not call it eligible.
- Run full Vitest, typecheck, lint, ui:check, build, `npx specos check`, and `git diff --check`.

## Boundary matrix

- Do not infer duplicate identity/reference checks, complete eligibility, or archived re-enable rejection from migration tests.
- Require issue 093's independent deployment registry/domain/API result for those gates.
- Keep fixtures synthetic and secret-free.

The migration evidence may be passed locally, but missing P0 boundary evidence keeps this issue `blocked`.
