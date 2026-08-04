# Review Entry: CLI-GUI-021

- Feature Spec: `.features/CLI-GUI-021-engine-readiness-onboarding/spec.md` v1.0
- Historical reviews: `.issues/issue-065-engine-readiness-probes-and-remediation.md`, `.issues/issue-072-in-app-setup-terminal-fallback.md`
- Current status: `pending-feature-level-review`
- Review owner: `reviewer`
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`

## Review Focus

Confirm readiness is non-mutating, Chat eligibility is capability-driven, and setup
Terminal is explicit and recoverable. Check that probe uncertainty is not presented as authentication success.

## Known Gate Inputs

- Local fixtures pass according to implementation notes.
- Independent normalized and real-engine journey evidence are missing/partial.
