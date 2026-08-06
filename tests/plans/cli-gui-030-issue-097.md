# Test Plan — Issue 097

Verify Route binding, resolve/preflight integration, one-shot override lifecycle, legacy compatibility, and redaction from `CLI-GUI-030`.

## Matrix

- Session binding: set/clear, missing/archived, expectedRevision conflict, readonly, and persistence-failure rollback.
- Resolve: global < workspace/project < session < run precedence, sourceTrace, fixed eligible/unavailable, no candidate, unsupported engine, and legacy no-route.
- Preflight: invalid fixed/no-candidate/unsupported-engine in chat and terminal must precede user message, Task/Attempt, PTY, Agent/runtime, and state-save side effects.
- One-shot: fixed target is request-local, not written to Session/AppState, and does not leak to the next request.
- Legacy: no-route chat and terminal preserve legacy model behavior without a fake Deployment.
- Security: synthetic secret canary and credentialRef absent from API responses, logger calls, and state; SecretStore value resolution is not performed by resolve/preflight failures.

## Commands

- `npm --prefix cli-gui run test -- --run server/application.test.ts`
- `npm --prefix cli-gui run test -- --run server/application.test.ts server/chat-api.test.ts`
- `npm --prefix cli-gui run test -- --run`
- `npm --prefix cli-gui run typecheck`
- `npm --prefix cli-gui run lint`
- `npm --prefix cli-gui run ui:check`
- `npm --prefix cli-gui run build`
- `npx specos check`
- `git diff --check`
- `bash /Users/liquiid/.claude/skills/review-it/scripts/review-it`

Browser and platform are N/A per the CLI-GUI-030 Test Spec. Attempt/fallback/retry, packaged-host, real external engine, and cross-process behavior are outside this issue.
