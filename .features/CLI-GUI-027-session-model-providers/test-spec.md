# Test Spec: CLI-GUI-027

- Source spec: `CLI-GUI-027`, version `1.0`
- Source hash: `58adb167ab70d94016e3404d54e63862fa71523bbdb6d4f9e67077160f641319`
- Test goal: prove provider CRUD, schema migration, protocol-specific launch injection, credential safety, model import, and session isolation.

## Scenarios

- Happy: create/update/delete valid providers; Anthropic sessions receive base URL/token env; Codex sessions receive `-c` overrides; selected provider models merge as synced and sort first.
- Limit: HTTPS only except localhost/127.0.0.1 HTTP; duplicate IDs and max/empty model cases follow validation; deleting a provider referenced by a running session requires confirmation but does not alter its process.
- Error: invalid protocol/base URL/credentialRef returns `400 VALIDATION_FAILED`; missing credential blocks spawn with variable name; missing provider returns the defined not-found error; readonly rejects writes.
- Migration: v4 -> v5 adds `providers: []`; malformed provider entries are discarded; old code ignores v5 fields; providerId remains optional.
- Security: token canary is absent from state, API responses, logs, snapshots, and test output; global CLI config files remain unchanged.
- Concurrency: two sessions with different providers spawn concurrently without env/argument contamination; restart/resume keeps frozen providerId.
- Browser: verify provider empty/loading/failure states, CRUD feedback, new-session provider grouping, and composer grouping.
- Platform: PTY and headless spawn use the same sanitized environment contract; OS-specific acceptance is N/A because credentials are env references only.

## Public seam and fixtures

- Seams: provider validator/CRUD API, store migration, `resolveLaunch`/`buildTurn`, mock PTY/headless spawn, `ModelProviderSummary`, mergeModelSources, session creation/resume, readonly guard.
- Fixtures: Anthropic/Codex providers, valid/invalid URLs and refs, token canary, v4 state, two sessions, mock spawn capture, duplicate model names.

## Commands and acceptance mapping

- `npm --prefix cli-gui test -- --run server/application.test.ts server/profile-adapters.test.ts server/model-catalog.test.ts` -> US-003/FR-3..5 CRUD, US-004/FR-6..8 injection/isolation, US-005 model import.
- `npm --prefix cli-gui run ui:check && npm --prefix cli-gui run test:e2e` -> provider/session/composer browser acceptance.
- `npm --prefix cli-gui run typecheck && npm --prefix cli-gui run lint` -> DoD static gates.
- `npx specos check` -> traceability.
- Blocking: migration, injection isolation, missing credential, redaction, no-provider regression. Warning: browser grouping evidence.
