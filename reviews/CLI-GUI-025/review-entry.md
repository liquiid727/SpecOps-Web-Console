# Review Entry: CLI-GUI-025

- Feature Spec: `.features/CLI-GUI-025-tauri-runtime-sidecar-security/spec.md` v1.0
- Historical review: `reviews/CLI-GUI-025-issue-071/review-report.md`
- Current status: `pending-feature-level-review`
- Review owner: `reviewer`
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`

## Review Focus

Confirm Tauri owns only host lifecycle/capability delivery, sidecar restart/shutdown is
bounded, and loopback/origin/bearer/CSRF/capability rules are enforced.

## Known Gate Inputs

- Local Rust/Node security evidence exists.
- Packaged sidecar, WebView, crash recovery, and normalized independent evidence are missing.
