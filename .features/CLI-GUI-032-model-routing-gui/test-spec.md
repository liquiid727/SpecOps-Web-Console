# Test Spec: CLI-GUI-032

- Source spec: `CLI-GUI-032`, version `1.0`
- Source hash: `55c097fdebff4722bf7601ce7af9098bd720effb02c71a9a1a22809bd66780f6`
- Test goal: prove the routing GUI consumes server facts correctly across settings, session/composer, attempts/recovery, accessibility, i18n, responsive layouts, and browser workflow.

## Scenarios

- Happy: Providers/Deployments/Routes CRUD; inherit/explicit/fixed route; resolved summary; primary/fallback/confirmation/exhaustion/cancel/completed timeline states; refresh restores history.
- Limit: 8-candidate cap, keyboard reorder, long names/error wrapping, readonly mutations, unsupported Engine hides controls, fixed target clears after success/failure/cancel and second send inherits again.
- Error: loading/empty/failure states retain stable content; each specified error code opens the correct action; pending guard prevents duplicate mutation; fixed unavailable blocks send.
- Migration: N/A; UI consumes already-versioned server contracts and must not persist routing facts in client preferences.
- Security: credential form is write-only; no secret in store/localStorage/analytics/snapshots; client never computes route/fallback decisions.
- Concurrency: live frames and refreshed persisted facts dedupe by ID/revision; repeated sends and reconnects do not duplicate terminal Attempt cards.
- Browser: Chrome E2E Provider credential -> Deployment -> Route -> Session -> primary failure -> fallback; side-effect confirmation; cancel no fallback; refresh recovery.
- Platform: Chrome at 1280/900/640; keyboard and reduced-motion checks; mark other OS/browser results unaccepted unless run.

## Public seam and fixtures

- Seams: `RoutingPort`, `ExecutionPort`, `SessionPort`, MockClientRuntime, deterministic fixtures, stable `data-*` contracts, AsyncState/Feedback/Overlay, i18n dictionaries, responsive viewport harness.
- Fixtures: empty/loading/failure/readonly resources, route sources, excluded candidates, all Attempt states, specified error codes, EN/ZH, long labels.

## Commands and acceptance mapping

- `npm --prefix cli-gui run ui:check` -> component/style/accessibility contract and DoD.
- `npm --prefix cli-gui test -- --run client/components client/runtime` -> component, state, i18n, DOM and deduplication scenarios.
- `npm --prefix cli-gui run test:e2e` -> browser workflow, second interaction, responsive and recovery evidence.
- `npm --prefix cli-gui run build && npx specos check` -> production build and traceability.
- Blocking: server-fact-only routing, send/fixed clearing, Attempt recovery, a11y/focus, no overflow/overlap, EN/ZH. Browser evidence is required for DoD.
