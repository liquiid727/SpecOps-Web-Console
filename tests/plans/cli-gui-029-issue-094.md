# Test Plan — Issue 094

Verify legacy model resolution and Deployment history compatibility against `CLI-GUI-029` and issue 094.

## Matrix

- Resolver: active model, launch-config model, profile default, empty/default normalization, and missing default.
- No-route runtime: terminal spawn argv/env and chat backend model; no Deployment identity or fake Deployment creation.
- Route safety: an unavailable bound route returns `ROUTE_NO_CANDIDATE` without falling back to legacy.
- Resume/fork: preserve profile/provider/route identity, BackendSessionRef, and activeModel semantics; clear child runtime resume tokens.
- History: execute Deployment POST→DELETE archive→GET tombstone, then read the frozen execution snapshot from a fresh disk repository instance.
- Missing references: stable Profile and Workspace errors; provider/model errors remain covered by the deployment API matrix.

## Commands

- `npm --prefix cli-gui run test -- --run server/legacy-model-resolver.test.ts server/model-route-resolver.test.ts server/application.test.ts server/chat-api.test.ts server/execution-store.test.ts`
- `npm --prefix cli-gui run test -- --run`
- `npm --prefix cli-gui run typecheck && npm --prefix cli-gui run lint && npm --prefix cli-gui run ui:check`
- `npm --prefix cli-gui run build`
- `npx specos check`
- `git diff --check`

Browser and platform are N/A per the CLI-GUI-029 Test Spec. No external Provider or packaged-host result is inferred from these local fixtures.
