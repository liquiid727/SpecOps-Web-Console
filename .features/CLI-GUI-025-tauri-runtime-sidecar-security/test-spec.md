---
testSpecId: "CLI-GUI-025.test-spec"
testSpecVersion: "1.0"
status: approved
sourceSpec: ".features/CLI-GUI-025-tauri-runtime-sidecar-security/spec.md"
sourceSpecId: "CLI-GUI-025"
sourceSpecVersion: "1.0"
sourceSpecHash: "dc490e46b80d5db6a1aa56a58e512437765d674d29c72b96ea85c4702ed5c090"
sourceApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04"
testSpecApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04-approved-for-planning"
---

# Independent Test Spec: CLI-GUI-025

Traceability inputs: `cli-gui/doc/mvp02/spec/`,
`cli-gui/doc/mvp02-check-qa/`, `design/cli-gui-platform-design.md`, and
`.issues/issue-071-tauri-sidecar-supervision-and-local-security.md`.

## Coverage Matrix

| Requirement | Branches | Owner | Required evidence | Gate |
|---|---|---|---|---|
| Sidecar state machine | happy, error, limit | `unit-test-agent` | trace | blocking |
| Packaged startup/health/shutdown | happy, error, flow | `e2e-test-agent` | trace, log | blocking |
| Crash/restart/no duplicate runtime | error, limit | `concurrency-test-agent` | trace, raw-report | blocking |
| Loopback/origin/bearer/CSRF policy | error, edge | `test-editor` | trace, raw-report | blocking |
| Tauri capabilities and version compatibility | edge, error | `specialized-check-agent` | raw-report | blocking |
| Cross-platform WebView behavior | limit, flow | `playwright-test-agent` | screenshot, trace | blocking |

## Scenarios

- Happy: packaged WebView starts one sidecar, completes health handshake, and loads the app.
- Limit: restart budget, slow health, shutdown timeout, and version mismatch.
- Error: crash, invalid Host/Origin/bearer/CSRF, malformed WebSocket credential, and capability denial.
- Security: no persisted bearer, secret, absolute path leak, public listener, or arbitrary shell capability.
- Platform: macOS WKWebView, Windows WebView2, and declared Linux targets are named separately.

## Fixtures And Seams

Use Rust supervision fixtures, Node HTTP/WS security tests, a real packaged sidecar,
and a platform matrix. A cargo unit run alone is local evidence, not packaged evidence.

## Execution And Normalization

Record artifact version, sidecar hash/version, host OS, WebView, startup/health/shutdown
timings, restart count, and artifact references. Missing packaged environment blocks QA.
