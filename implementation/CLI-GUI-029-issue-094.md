# Issue 094 Implementation Handoff

## Traceability

- Issue: `.issues/issue-094-legacy-model-resolution-and-deployment-history-compatibility.md`
- Feature Spec: `CLI-GUI-029`
- Test Spec: `.features/CLI-GUI-029-model-deployment-registry/test-spec.md`
- Scope: legacy model precedence, no-route execution, resume/fork compatibility, deployment tombstone/history, and stable dangling-reference errors.

## Implementation

- Added `cli-gui/server/legacy-model-resolver.ts` as the single pure resolver for `activeModel > launchConfig.model > profile default`; empty values and `default` normalize to no explicit model.
- Extended `ResolvedRoute` with `legacyResolution`. A route-bound session remains a route result even when every candidate is unavailable; it never falls back to legacy or invents a Deployment ID.
- Reused the resolver for chat and terminal startup and backend turn model selection. Profile default is consumed only from the already-known capability cache; route resolution does not force a CLI probe.
- Forks retain profile/provider/route identity, `BackendSessionRef`, and chat `activeModel` semantics while clearing child runtime resume tokens.
- Dangling session workspace/profile references return `WORKSPACE_NOT_FOUND` / `PROFILE_NOT_FOUND` before spawn.

## Changed files

- Production: `cli-gui/server/legacy-model-resolver.ts`, `cli-gui/server/application.ts`, `cli-gui/server/model-route-resolver.ts`, `cli-gui/shared/model-route.ts`.
- Regression coverage: `cli-gui/server/legacy-model-resolver.test.ts`, `cli-gui/server/model-route-resolver.test.ts`, `cli-gui/server/application.test.ts`, `cli-gui/server/chat-api.test.ts`, `cli-gui/server/execution-store.test.ts`.

## Evidence

- Independent focused suite: 5 files, 79 passed, 0 failed.
- Full Vitest: 59 files, 493 passed, 4 skipped, 0 failed.
- `typecheck`, `lint`/`ui:check`, `build`, `npx specos check`, and `git diff --check` passed.
- Real local archive flow is covered by POST → DELETE → GET tombstone plus a fresh disk execution-repository read of the frozen task/attempt snapshot.
- No browser/platform run is required by the CLI-GUI-029 Test Spec; no external Provider or packaged-host behavior is inferred.

## Status

Implementation and independent local verification are complete. QA decision: `accepted`. This is local acceptance only; no push, merge, or external release action was performed.
