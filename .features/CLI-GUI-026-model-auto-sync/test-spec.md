# Test Spec: CLI-GUI-026

- Source spec: `CLI-GUI-026`, version `1.0`
- Source hash: `d45200a8455c2cce0da5e48b4f56e1ebcb7fc508b9d708ff34257c74fe03a4e9`
- Test goal: prove read-only automatic model sync is parsed correctly, TTL-gated, persisted, non-blocking on failure, and compatible with existing merge/cache behavior.

## Scenarios

- Happy: parse Codex provider/profile models and Claude model env vars; capability resolution syncs and saves models; manual sync bypasses TTL.
- Limit: same profile resolves twice inside 5 minutes and reads once; distinct profiles have independent gates; empty inputs return no additions; duplicate/default ordering remains builtin > synced > custom with `default` first.
- Error: malformed TOML/JSON, missing files, or reader failure retain prior `syncedModels`, emit structured feedback, and do not fail capability resolution; kimi/glm accept only matching base URL domains.
- Migration: N/A for schema; verify v4 `profile.syncedModels` is unchanged and no new persisted field is introduced.
- Security: automatic path invokes `readSyncedModels` only; assert no child-process spawn and no secret/config contents in logs or response.
- Concurrency: concurrent capability probes for one profile coalesce or otherwise perform at most one TTL-protected read/save; manual sync remains deterministic.
- Browser: warning-only sync failure is visible in existing Settings feedback without blocking model selection; no new browser flow is required.
- Platform: fixture-based home/config readers cover absent and platform path variants; platform acceptance is N/A because no OS API is added.

## Public seam and fixtures

- Seams: model parser, `readSyncedModels`, clock/TTL, config reader, `resolveCapabilities`, state repository, structured feedback, child-process spy.
- Fixtures: Codex TOML with `[profiles.*]` and `[model_providers.*]`; Claude JSON with model env vars; kimi/glm matching and non-matching URLs; malformed/empty files; profile with prior synced models.

## Commands and acceptance mapping

- `npm --prefix cli-gui test -- --run server/model-catalog.test.ts server/application.test.ts` -> US-002/FR-2 parsing and US-001/FR-1 auto-sync.
- `npm --prefix cli-gui run typecheck && npm --prefix cli-gui run lint` -> implementation contract and DoD type/lint gates.
- `npx specos check` -> artifact traceability and independent spec acceptance.
- Blocking: parser, TTL, persistence, failure fallback, read-only/no-spawn, merge/cache regression. Warning: Settings feedback/browser visibility.
