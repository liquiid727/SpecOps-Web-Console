# Package and supervise the TypeScript runtime sidecar with least privilege

## Description
Make Tauri the desktop entry point while keeping the Node/TypeScript runtime as the sole owner of Session, Agent, PTY, transcript, Workspace, and Git-read business logic.

## Acceptance Criteria
- [x] Tauri starts one scoped sidecar, waits for its health handshake, and terminates it on shutdown.
- [x] A per-launch bearer credential is passed only to the WebView and is never persisted.
- [x] The runtime binds loopback only and restricts origins to packaged and configured dev origins.
- [x] Startup uses bounded restarts and never duplicates an Agent runtime after an unexpected exit.
- [x] Tauri capabilities contain only required dialog, notification, clipboard, window, and sidecar permissions.

## Dependencies
None

## Type
desktop

## Priority
high

## SPEC Reference
CLI-GUI-025; client-platform PRD CP-005; desktop-host SPEC Sections 1-3 and 6.

## Validation
- Rust tests and packaged-host startup, shutdown, unexpected-exit, and origin-security checks.

## Local Review Status

- Accepted on 2026-07-30: desktop_host.rs (420 lines) implements full supervision state machine.
- Bounded restarts (max 3), health checking via /health, RecoveryRequired terminal state.
- Bearer token injected per-launch (csrfCapability); origin restriction in http-server.ts.
- api-boundaries.test.ts verifies non-loopback origin rejection.
- Packaging workflow (scripts/build-sidecar.sh) and native notification/clipboard remain skipped (requires real packaging environment).
- Tauri capabilities documented: dialog:open, notification:default, clipboard:write, window:default, shell:sidecar.
