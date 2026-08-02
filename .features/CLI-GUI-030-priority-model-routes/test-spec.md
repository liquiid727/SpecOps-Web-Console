# Test Spec: CLI-GUI-030

- Source spec: `CLI-GUI-030`, version `1.0`

- Source hash: `af25bd7d1a78990e88c9ef473aacbda6d9fe5465112412f502e7f68aba715c3e`
- Test goal: prove pure deterministic route precedence/filtering, fixed-target rules, CRUD/bindings, migration, and legacy compatibility.

## Scenarios

- Happy: resolve system/global/project/session/run precedence with source trace; preserve ordered eligible candidates; bind and CRUD routes successfully.
- Limit: up to 8 candidates; stable ordering; multiple exclusion reasons; fixed eligible candidate works once and is not persisted; empty/no-route legacy behavior remains.
- Error: disabled/missing/incompatible/non-member fixed deployment, revision conflict, readonly, unsupported Engine/terminal, and no candidate return stable errors without sending.
- Migration: v7 -> v8 adds defaults, handles bad references, creates one backup, repeats safely, and does not start on failed migration.
- Security: route summaries/resolution/error chains contain IDs and redacted metadata only; no credentials or secret values.
- Concurrency: conflicting route revisions and simultaneous session/run overrides resolve atomically; one-shot override cannot leak to a second send.
- Browser: N/A for this backend/domain spec; stable RoutingPort contract is the handoff to CLI-GUI-032.
- Platform: N/A; resolver is platform-neutral, with terminal/unsupported-engine fixtures for capability behavior.

## Public seam and fixtures

- Seams: pure `model-route-resolver`, deployment summaries, route/binding API, revision store, preflight, legacy launch resolver, RoutingPort contract.
- Fixtures: all five precedence layers, eligible/excluded candidates, 8/9 candidates, fixed target variants, terminal/unsupported profile, v7 state.

## Commands and acceptance mapping

- `npm --prefix cli-gui test -- --run server/model-route*.test.ts server/application.test.ts server/store.test.ts` -> FR-1/FR-8..14/FR-24/FR-27..28 precedence, filtering, API, migration, legacy.
- `npm --prefix cli-gui run typecheck && npm --prefix cli-gui run lint` -> contract/static gates.
- `npx specos check` -> traceability.
- Blocking: resolver truth table, exclusion reasons, fixed-target safety, revision/migration, legacy behavior.
