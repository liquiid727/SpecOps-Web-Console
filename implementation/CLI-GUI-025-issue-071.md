# CLI-GUI-025 Issue 071 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-025`
- Source Spec: `cli-gui/doc/mvp02/spec/desktop-host-spec.md`
- Source Issue: `.issues/issue-071-tauri-sidecar-supervision-and-local-security.md`
- Status: `partial`

## Delivered Files

- `cli-gui/src-tauri/src/desktop_host.rs`: sidecar supervisor state machine, health probe, restart limits, ephemeral credential, and shutdown.
- `cli-gui/src-tauri/src/lib.rs`: Tauri lifecycle integration and WebView bootstrap injection.
- `cli-gui/client/api.ts`: desktop loopback routing and HTTP/WebSocket credentials.
- `cli-gui/server/http-server.ts`, `server/index.ts`: bearer, origin, host, CORS, and loopback configuration.
- `cli-gui/server/security.test.ts`, `server/index.test.ts`: security and configuration coverage.

## Validation

- `CARGO_HOME=/private/tmp/specos-cargo cargo test --manifest-path cli-gui/src-tauri/Cargo.toml`: 5 tests passed.
- `npm --prefix cli-gui run test -- --run`: 48 files and 347 tests passed.
- `npm --prefix cli-gui run build`: passed with the existing chunk-size warning.
- `git diff --check`: passed.

## Remaining Risks

- Release packaging does not include an executable TypeScript runtime sidecar.
- The recovery-required state has no user-facing recovery flow.
- Native notification and clipboard capability delivery remains unverified.
