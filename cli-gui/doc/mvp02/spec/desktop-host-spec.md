# SPEC: Desktop Host

> Parent: [architecture-spec.md](./architecture-spec.md)
> Scope: Tauri shell, TypeScript sidecar, native platform capabilities

## 1. Process Model

Tauri is the packaged application entry point. It starts one scoped
Node/TypeScript runtime sidecar, waits for a health handshake, passes an
ephemeral local credential to the WebView, monitors exit, and terminates the
sidecar during application shutdown.

The sidecar owns Session, transcript, Orchestrator, Backend, PTY, workspace, and
Git-read operations. Rust must not duplicate this business logic.

## 2. Startup State Machine

```text
starting -> sidecar-spawning -> health-checking -> ready
                                  |                |
                                  v                v
                                failed <----- unexpected-exit
```

At most three bounded restarts are attempted for unexpected pre-session exits.
An exit while Agents run presents recovery and never silently starts duplicate
processes.

## 3. Local Security

- Bind runtime to loopback only.
- Generate a per-launch bearer secret and never persist it.
- Restrict CORS/origin to the packaged WebView and configured dev origin.
- Tauri capabilities allow only required dialog, notification, clipboard,
  window, and sidecar operations.
- All file paths are canonicalized and checked against active Workspace roots.

## 4. Platform Port

`TauriPlatformPort` implements folder selection, notifications, clipboard,
window focus, platform metadata, and updates. Browser mode returns explicit
unsupported results or web-safe fallbacks.

## 5. Setup Terminal

Authentication and protocol fallback open a Terminal bound to a known Engine
session/setup purpose. The UI identifies why it opened and how to return to
Chat. Arbitrary shell access is an Advanced feature, not an automatic step.

## 6. Packaging

The sidecar runtime, migration assets, and frontend build are versioned as one
release. Startup checks protocol compatibility before serving the UI. An
incompatible component blocks execution with a repair message.

## 7. Acceptance

macOS WKWebView and Windows WebView2 must pass folder picker, Chinese IME,
shortcuts, clipboard, transcript scrolling, PTY resize/input, notification, and
window scaling tests.

