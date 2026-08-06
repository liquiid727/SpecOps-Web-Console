# CLI-GUI-025 Issue 076 Implementation Handoff

## Traceability

- Issue: `.issues/issue-076-qa-lifecycle-startup-exit-sidecar.md`
- Feature Spec: `.features/CLI-GUI-025-tauri-runtime-sidecar-security/spec.md` v1.0
- Test Spec: `.features/CLI-GUI-025-tauri-runtime-sidecar-security/test-spec.md` v1.0
- Parent handoff: `implementation/CLI-GUI-025-mvp02a-foundation.md`

## Implementation Status

`locally-verified`; QA remains `blocked`.

The Playwright splash gate exposed an actionable UI stability issue: the Enter banner's
infinite breathing animation changed its own geometry with `transform: scale()`, so
Playwright could not click it reliably. The implementation-agent removed only that
geometry-changing animation component and retained the shadow pulse.

Changed production file:

- `cli-gui/client/styles/splash.css`

## Local Validation

- `cargo test --manifest-path cli-gui/src-tauri/Cargo.toml`: 5 passed.
- `npm --prefix cli-gui run typecheck`: passed.
- `npm --prefix cli-gui run test -- --run`: 57 files passed; 447 passed, 4 skipped.
- `npm --prefix cli-gui run build`: passed; existing large-chunk warning.
- `npm --prefix cli-gui run ui:check`: passed.
- Focused Playwright splash/focus/responsive cases: 5 passed.
- The concurrent chat/terminal isolation case still fails when the second chat transcript is expected; it is retained for the ordered #081 investigation.

## Independent Evidence

- `tests/results/cli-gui-025.issue-076.local.json`: normalized local result, explicitly `blocked`.
- The result records no packaged evidence and does not promote local browser output to packaged WebView evidence.

## Remaining Risks

- `@tauri-apps/cli` is not installed and no packaged bundle exists locally.
- Packaged startup/health, crash/restart without duplicate sidecars, shutdown/orphan cleanup,
  capability enforcement, and cross-platform WebView evidence remain unverified.
