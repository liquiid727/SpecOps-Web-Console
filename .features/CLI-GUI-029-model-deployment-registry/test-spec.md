# Test Spec: CLI-GUI-029

- Source spec: `CLI-GUI-029`, version `1.0`
- Source hash: `9c72d9bfa2f32bcdc593930a8bfaa2659ae8420fbb6a7b3283f9c5fc70bc7717`
- Test goal: prove deployment identity, reference validation, eligibility/exclusion summaries, CRUD/migration, and legacy launch/history compatibility.

## Scenarios

- Happy: create/update/archive deployment with valid provider/profile/model; eligible summary exposes stable references and no secret; CRUD and launch use frozen deployment input.
- Limit: duplicate provider/profile/model combinations, disabled/archived resources, unavailable catalog, unknown eligibility, and max/list boundaries return deterministic summaries.
- Error: bad IDs/references/protocol/engine/model return validation errors; readonly/in-use operations are rejected per contract; capability failure yields `unknown`, never eligible.
- Migration: v6 -> v7 adds defaults, drops malformed deployments, backs up once, repeats idempotently, and fails without writing.
- Security: summaries and API payloads exclude secrets and credential values; deletion/archive cannot expose secret material.
- Concurrency: revision conflict prevents lost update; simultaneous archive/delete and resolve produce one authoritative state.
- Browser: N/A as a feature-specific gate; API/domain fixtures must be consumable by the later routing GUI.
- Platform: N/A; deployment is platform-neutral, with profile capability fixtures representing engine differences.

## Public seam and fixtures

- Seams: deployment validator/registry, capability snapshot provider, provider summary, CRUD API, store migration, legacy resolver, history snapshot renderer.
- Fixtures: eligible/ineligible/unknown/disabled/archived profiles, duplicate combinations, deleted provider/profile, frozen snapshot, v6 states.

## Commands and acceptance mapping

- `npm --prefix cli-gui test -- --run server/model-deployment*.test.ts server/application.test.ts server/store.test.ts` -> FR-1..3/FR-8/FR-10/FR-27..29 domain, API, migration, legacy, history.
- `npm --prefix cli-gui run typecheck && npm --prefix cli-gui run lint` -> DoD static gates.
- `npx specos check` -> traceability.
- Blocking: identity/reference invariants, unknown eligibility, migration, secret-free summaries, legacy resolution/history.
