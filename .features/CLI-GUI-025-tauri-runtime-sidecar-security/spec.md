---
id: CLI-GUI-025
version: "1.0"
title: "CLI-GUI-025 Tauri Runtime Sidecar and Local Security Boundary"
status: rebaseline
goals:
  - "Make Tauri the desktop host while Node/TypeScript remains the sole runtime owner."
  - "Supervise one packaged sidecar with bounded health, restart, and shutdown behavior."
  - "Protect loopback, origin, bearer, capability, workspace, and secret boundaries."
nonGoals:
  - "Move Session, Agent, PTY, transcript, or Git business logic into Rust."
  - "Treat Rust unit tests as packaged desktop acceptance."
  - "Expose arbitrary shell, filesystem, or credential capabilities to the WebView."
actors:
  - "Tauri desktop host"
  - "TypeScript runtime sidecar"
  - "packaged WebView"
  - "qa-agent"
userFlows:
  - name: "Packaged desktop startup and recovery"
    steps:
      - "Launch one sidecar with an ephemeral credential"
      - "Wait for bounded health handshake"
      - "Load packaged WebView over the allowed origin"
      - "Recover from sidecar crash within restart policy or show recovery-required"
      - "Shutdown without orphan runtime or Agent processes"
systemFlows:
  - name: "Least-privilege local host"
    steps:
      - "Bind runtime to loopback"
      - "Validate Host and Origin"
      - "Authenticate HTTP/WebSocket with per-launch capability"
      - "Apply Tauri capability allowlist"
      - "Redact secrets and close all handles on shutdown"
rules:
  - id: "desktop.single-sidecar"
    description: "One desktop launch owns one runtime sidecar; bounded restart cannot duplicate the Agent runtime."
  - id: "desktop.loopback-origin"
    description: "Runtime accepts only configured loopback host/origin and authenticated WebView requests."
  - id: "desktop.ephemeral-credential"
    description: "Per-launch bearer/CSRF capability is ephemeral, scoped, and never persisted or logged."
  - id: "desktop.rust-no-domain"
    description: "Rust owns host lifecycle and scoped OS integration; TypeScript owns Product Session and Agent logic."
edgeCases:
  - "Sidecar fails health check, exits unexpectedly, or exceeds restart budget."
  - "Origin, Host, bearer, CSRF, CORS, or WebSocket subprotocol is invalid."
  - "Packaged asset/version is incompatible with sidecar protocol."
  - "Native notification/clipboard/dialog capability is unavailable."
observability:
  - "Record launch duration, health latency, restart count, shutdown duration, runtime version, and recovery-required reason."
  - "Never log capability values, token values, secret values, or absolute paths outside the allowed local boundary."
tests:
  requiredBranches:
    - happy
    - error
    - edge
    - limit
    - flow
traceability:
  prd: "cli-gui/doc/mvp02/desktop-terminal-replacement-prd.md"
api:
  - name: "Runtime health handshake"
    method: "GET"
    path: "/health"
  - name: "Authenticated local WebSocket"
    method: "WS"
    path: "/ws/sessions/:id/events"
ui:
  - name: "Packaged desktop bootstrap and recovery"
    route: "src-tauri bootstrap and client runtime health state"
---

# CLI-GUI-025 Tauri Runtime Sidecar and Local Security Boundary

## Meta

- Spec ID: `CLI-GUI-025`
- Spec Version: `1.0`
- Epic: `MVP02-A Desktop Terminal Replacement`
- Status: `rebaseline`
- Source contracts: `cli-gui/doc/mvp02/spec/desktop-host-spec.md`, `cli-gui/doc/mvp02/spec/architecture-spec.md`
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `#071`
- Implementation handoff: `implementation/CLI-GUI-025-mvp02a-foundation.md`
- Review entry: `reviews/CLI-GUI-025/review-entry.md`
- Test Spec: `.features/CLI-GUI-025-tauri-runtime-sidecar-security/test-spec.md`

## Goal

Define the desktop boundary precisely: Tauri starts and supervises the packaged
runtime, while the existing Node/TypeScript application remains the only owner of
Session, Agent, transcript, workspace, and Git business semantics.

## Why This Exists

Rust supervision and local security tests exist, but the packaged sidecar and WebView
acceptance environment is missing. The feature contract must therefore state what is
implemented, what is locally verified, and what cannot be claimed until packaging runs.

## Out of Scope

- Reimplementing runtime logic in Rust.
- Public listeners, cloud control, or arbitrary shell execution.
- Claiming cross-platform support from a single macOS or Rust test.

## Deliverables

- Sidecar launch, health handshake, bounded restart, recovery-required, and shutdown state machine.
- Per-launch ephemeral bearer/CSRF credential flow and loopback/origin enforcement.
- Tauri capability allowlist and version compatibility check.
- Packaged-host Test Spec with startup, crash, shutdown, security, and capability evidence requirements.

## Domain

Tauri Host is an infrastructure boundary. It owns process supervision and capability
delivery only. ClientRuntime owns UI composition; Session Manager and Orchestrator own
product and execution state.

## Application

Bootstrap waits for health before mounting the normal client. Failure enters an explicit
recovery state. Shutdown is ordered: stop new work, close WebSocket/HTTP, stop runtime,
then release host capabilities.

## Repository

Packaged assets and sidecar version metadata are release artifacts, not AppState facts.
No bearer or secret is persisted.

## API

The health handshake exposes only version, readiness, and safe runtime metadata. HTTP and
WebSocket requests enforce loopback, configured origin, bearer, and CSRF policy.

## Database Impact

None. Migration behavior is covered by `CLI-GUI-022`; host startup must not write state
when health or migration preconditions fail.

## Test Plan

- Rust unit tests for supervision transitions and restart budget.
- Node integration tests for Host/Origin/CORS/bearer/CSRF and shutdown behavior.
- Packaged Tauri smoke with real sidecar executable, WebView origin, crash recovery,
  native capability use, and version mismatch.
- Cross-platform matrix for macOS WKWebView, Windows WebView2, and Linux where declared.

## Definition of Done

- Tauri never becomes a second runtime owner.
- Local security policy is enforced and secret-free.
- Packaged and cross-platform evidence is normalized before release claims.
- Until that evidence exists, the slice remains `partial` and release-blocked.
