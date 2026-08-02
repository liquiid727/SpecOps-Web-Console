# Test Spec: CLI-GUI-028

- Source spec: `CLI-GUI-028`, version `1.0`
- Source hash: `6994d607565193b3799e9436990d4ff146921406bc73a0ecb36c70595fe06818`
- Test goal: prove SecretStore references and lifecycle are safe across APIs, migration, all launch paths, concurrency, readonly mode, and supported host adapters.

## Scenarios

- Happy: put/resolve/status/remove keychain secret; create provider and set/replace/delete credential; all terminal/chat/persistent launch paths resolve through one resolver.
- Limit: `env:NAME` is read-only; replacement preserves old ref if storage fails; provider in-use and body-size limits return defined errors; missing secret stops before spawn.
- Error: invalid secret ref, unavailable store, readonly, CSRF, malformed migration input, and provider conflict return stable errors without changing prior state.
- Migration: v5 bare env names become `env:NAME`; invalid refs become `missing`; one backup; repeat is idempotent; failed migration does not write.
- Security: unique canary never appears in AppState, API, logs, transcript, attempts, fixtures, local storage, or exports; only server launch resolver may call `resolve`.
- Concurrency: concurrent credential replacement has one final reference; concurrent delete/replace and provider-in-use checks are serialized.
- Browser: credential set/replace/delete is write-only with status-only rendering; readonly and unavailable-store states are actionable.
- Platform: run acceptance adapters for macOS Keychain, Windows Credential Manager, Linux Secret Service; mark unavailable adapters as unaccepted, not passed.

## Public seam and fixtures

- Seams: `SecretStore` port, in-memory/failing store, env adapter, provider API, migration/backup writer, launch resolver, PTY/headless/persistent spawn spies, redaction scanner.
- Fixtures: keychain/env/malformed refs, canary secret, v5 state, concurrent replace barriers, provider in-use sessions, platform adapter unavailable.

## Commands and acceptance mapping

- `npm --prefix cli-gui test -- --run server/secret-store.test.ts server/application.test.ts server/store.test.ts` -> FR-2..7/FR-28 SecretStore, API, migration, launch and redaction.
- `npm --prefix cli-gui run ui:check && npm --prefix cli-gui run test:e2e` -> credential UI and packaged-host evidence.
- `npm --prefix cli-gui run typecheck && npm --prefix cli-gui run lint` -> DoD static gates.
- `npx specos check` -> traceability.
- Blocking: canary scan, pre-spawn failure, migration atomicity, concurrent replacement. Platform results must name the tested OS.
