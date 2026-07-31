# CLI-GUI-024 Issue 074 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-024`
- Source Issue: `.issues/issue-074-mvp02a-contract-performance-and-security-suites.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/server/contract-security.test.ts`: Contract, performance, and security test suite (145 lines).
  - §1 Contract: deterministic reduce/project, deriveActiveTurnId terminal states, approval idempotency.
  - §2 Performance: 1000-event reduceSessionEvents + projectTranscriptEvents baselines (< 100ms each).
  - §3 Security: workspace symlink traversal, XSS payload, approval replay stability.
- `cli-gui/client/transcript-display.test.ts`: Additional performance baseline tests (1000 events).

## Design Decisions

- Contract suite uses MockClientRuntime-equivalent (shared transcript-display functions) to validate determinism.
- Performance threshold: 100ms for 1000 events — conservative baseline that passes on CI hardware.
- Security assertions verify display-layer safety (no FS operations, no raw HTML injection via React's default escaping).
- 50k event stress test skipped (requires browser environment with real DOM).
- Platform matrix tests (macOS WKWebView / Windows WebView2 / Tauri capability escalation) skipped (requires packaged builds).

## Validation

- `npm --prefix cli-gui run test -- --run`: 50 files, 388 tests passed, 4 skipped.
- All contract assertions pass with identical inputs producing identical outputs.
- Performance baselines consistently under 100ms threshold.
- Security tests confirm no mutation side effects from replay attacks.
