# SPEC: MVP02 Verification

> Parent: [architecture-spec.md](./architecture-spec.md)

## 1. Test Layers

- Unit: port contracts, readiness mapping, reducers, migrations, sanitization.
- Integration: local Runtime API, Backend events, cancellation/approval,
  Workspace/Diff scoping, sidecar lifecycle.
- Contract: identical Session/Event/Error behavior through Mock, Local, Remote.
- Browser/E2E: first task, Chat, Composer, monitor, Session recovery and i18n.
- Real Engine acceptance: locked Codex and Claude CLI versions.
- Security/performance: scope, protocol abuse, high-volume streams and Diff.

## 2. MVP02-A Required Scenarios

For Codex and Claude separately:

1. Open a folder using the native picker.
2. Observe installed/authenticated/compatible readiness.
3. Create a Chat Session and send a first task.
4. Receive streaming text, tool, command, and file events.
5. Decide an approval and inspect read-only Diff.
6. Cancel a turn, retry, and continue a multi-turn conversation.
7. Stop and restart the app, replay history, and resume the native session.
8. Complete the flow without opening an external system terminal.

Additional readiness fixtures cover missing CLI, login required/expired,
unsupported version, and probe timeout.

## 3. UI State Matrix

Every primary view covers loading, empty, success, failure, offline,
reconnecting, approval waiting, read-only, and concurrency-limit states. Any
visible disabled action includes a reason. English and Chinese snapshots or
assertions are required.

## 4. Performance Gates

- Long transcript: 50,000 normalized events remains scrollable.
- Streaming: sustained high-rate deltas do not update global state per token.
- PTY: large output remains responsive and bounded.
- Diff: large files use limits and progressive rendering.
- Concurrency: four active Sessions have no event cross-talk.

Thresholds are recorded with the test hardware and build; regressions fail the
release gate when they exceed the agreed baseline by 20%.

## 5. Desktop Matrix

macOS WKWebView and Windows WebView2 cover Chinese IME, shortcuts, clipboard,
scrolling, Terminal, native folder picker, notification, and window scaling.

## 6. Security Matrix

Workspace escape, symlink escape, malicious Markdown, unconfirmed high
permission, Tauri capability escalation, approval replay, remote arbitrary
command, and unauthorized device access must be rejected.

## 7. Traceability

| Requirement | Evidence |
|---|---|
| FR-TR-1/2 | readiness and first-task E2E |
| FR-TR-3/4 | Backend integration and streaming UI tests |
| FR-TR-5 | approval integration and replay tests |
| FR-TR-6/7 | Diff/monitor and recovery E2E |
| FR-TR-8 | native resume fixture and real acceptance |
| FR-TR-9 | setup/fallback Terminal E2E |
| FR-TR-10 | external-terminal-free acceptance record |
| FR-CP-1–10 | ClientRuntime contract and platform matrix |

## 8. Release Commands

The release record contains the exact results of `ui:check`, `build`, `test`,
and `test:e2e`, plus locked Engine versions and real acceptance evidence. A
skipped platform or Engine must be reported; it cannot be recorded as passing.

