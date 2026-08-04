# CLI-GUI-025 MVP02-A Foundation Handoff

## Meta

- Feature Spec: `.features/CLI-GUI-025-tauri-runtime-sidecar-security/spec.md` v1.0
- Test Spec: `.features/CLI-GUI-025-tauri-runtime-sidecar-security/test-spec.md` v1.0
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `.issues/issue-071-tauri-sidecar-supervision-and-local-security.md`
- Status: `partial`, `locally-verified`; packaged evidence `missing`; independent evidence `missing`

## Existing Implementation Evidence

- Supervisor: `cli-gui/src-tauri/src/desktop_host.rs`, `cli-gui/src-tauri/src/lib.rs`.
- Local HTTP/WS security: `cli-gui/server/http-server.ts`, `cli-gui/server/security.test.ts`.
- Host configuration: `cli-gui/src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`.

## Local Verification

Rust and Node security tests cover the state machine and local request policy. The
repository does not yet contain a verified packaged TypeScript sidecar executable or
cross-platform WebView acceptance environment.

## Handoff To Testing

- Build a real packaged artifact and execute startup, health, crash, bounded restart,
  shutdown, origin, capability, and version-compatibility scenarios.
- Normalize host OS, WebView, artifact/version, timings, and crash/recovery evidence.

## Blockers

- Packaged sidecar and Tauri CLI environment are unavailable.
- No independent normalized result exists.
- Do not advertise packaged or cross-platform support from local Rust tests.
