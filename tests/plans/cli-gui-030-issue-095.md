# Test Plan — Issue 095

Verify Priority Model Route state, schema v8 migration, CRUD, binding, and readonly contracts from `CLI-GUI-030`.

## Matrix

- Migration: ordered unique 1–8 candidates; malformed/duplicate Route cleanup; invalid global/workspace/session references and duplicate bindings; missing Deployment candidates remain stored.
- Recovery: v7 backup creation, existing-backup preservation, repeated-load idempotency, rename/write failure source and backup preservation, temporary-file cleanup, and readonly no-write.
- API: GET/POST/PATCH/DELETE, strict fields/types, candidate boundaries, duplicate/not-found, archive/in-use, global/workspace/session binding and clear.
- Safety: injected state-save failures restore mutations; successful API writes survive application close and fresh JSON repository reload.
- Side effects: CRUD and binding do not invoke Agent, PTY, persistent runtime, or SecretStore value/status seams.

## Commands

- `npm --prefix cli-gui run test -- --run server/store.test.ts server/application.test.ts`
- `npm --prefix cli-gui run test -- --run`
- `npm --prefix cli-gui run typecheck`
- `npm --prefix cli-gui run lint`
- `npm --prefix cli-gui run ui:check`
- `npm --prefix cli-gui run build`
- `npx specos check`
- `git diff --check`
- `bash /Users/liquiid/.claude/skills/review-it/scripts/review-it`

Browser and platform are N/A per the CLI-GUI-030 Test Spec. No packaged-host, cross-process, real Provider/engine, or resolver/preflight result is inferred.
