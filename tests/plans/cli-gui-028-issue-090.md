# Test Plan — Issue 090

## Scope

Validate CLI-GUI-028 Provider secret migration and write-only credential behavior against the issue, Feature Spec, and Test Spec.

## Matrix

- Migration: v5 bare environment references, malformed references, one-time backup, repeat idempotency, and failed atomic write.
- API: metadata secrecy, credential write/delete status-only responses, endpoint validation, in-use conflict, readonly, CSRF, and body-size gates.
- Mutation safety: Provider-scoped concurrent PUT/DELETE, state-save failure rollback, old credential cleanup failure rollback, and new credential cleanup.
- Security: synthetic canary absence from state, response, logger assertions, and normalized/raw evidence.
- Boundary: name unavailable Windows/Linux/packaged environments as blocked; never infer those results from macOS or memory-store tests.

## Commands

```text
npm --prefix cli-gui run test -- --run server/store.test.ts server/application.test.ts server/secret-store.test.ts
npm --prefix cli-gui run test -- --run
npm --prefix cli-gui run typecheck
npm --prefix cli-gui run lint
npm --prefix cli-gui run ui:check
npm --prefix cli-gui run build
npx specos check
git diff --check
/Users/liquiid/.claude/skills/review-it/scripts/review-it
```

## Acceptance

The local matrix is complete and independently rerun: 67/67 focused tests and 469/469 full tests passed. QA remains blocked until platform, packaged-host, and cross-process evidence is available.
