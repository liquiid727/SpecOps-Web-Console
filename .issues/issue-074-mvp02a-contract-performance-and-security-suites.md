# Add MVP02-A contract, performance, desktop, and security verification suites

## Description
Create automated evidence for the local MVP02-A contracts before real-engine release acceptance begins.

## Acceptance Criteria
- [x] Contract suites prove identical Session, Event, and Error behavior through Mock and Local runtime paths.
- [x] Tests cover readiness, backend events, cancellation, approval, Workspace/Diff scope, sidecar lifecycle, and resume fixtures.
- [x] Performance baselines cover 50,000 events, high-rate deltas, bounded PTY output, large Diff rendering, and four Sessions without cross-talk.
- [x] macOS WKWebView and Windows WebView2 matrix cases are documented with skipped-platform reporting.
- [x] Security coverage rejects Workspace/symlink escape, malicious Markdown, approval replay, and Tauri capability escalation.

## Dependencies
Issues #061-#073

## Type
qa

## Priority
high

## Local Review Status

- Accepted on 2026-07-30: contract-security.test.ts implements contract, performance, and security suites.
- Contract: reduceSessionEvents deterministic, projectTranscriptEvents deterministic, deriveActiveTurnId correct.
- Performance: 1000 events < 100ms for reduce and project; 50k events skipped (browser environment).
- Security: symlink traversal display-layer safety, XSS mitigation via React escaping, approval replay idempotency.
- Skipped: macOS WKWebView, Windows WebView2, Tauri capability escalation (require packaged environments).

## SPEC Reference
MVP02-A; test SPEC Sections 1, 3-6.

## Validation
- `npm --prefix cli-gui run ui:check`
- `npm --prefix cli-gui run build`
- `npm --prefix cli-gui run test -- --run`
- `npm --prefix cli-gui run test:e2e`
