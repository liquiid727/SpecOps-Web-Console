# CLI-GUI-021 MVP02-A Foundation Handoff

## Meta

- Feature Spec: `.features/CLI-GUI-021-engine-readiness-onboarding/spec.md` v1.0
- Test Spec: `.features/CLI-GUI-021-engine-readiness-onboarding/test-spec.md` v1.0
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `.issues/issue-065-engine-readiness-probes-and-remediation.md`, `.issues/issue-072-in-app-setup-terminal-fallback.md`
- Status: `implemented`, `locally-verified`; real-engine `partial`; independent evidence `missing`

## Existing Implementation Evidence

- Readiness mapping: `cli-gui/server/engine-readiness.ts` and tests.
- Quest Home readiness/first task: `cli-gui/client/components/QuestHome.tsx`.
- Setup-terminal remediation and bilingual copy: `cli-gui/client/app/App.tsx`, `cli-gui/client/i18n.tsx`.

## Local Verification

Readiness fixtures and local UI tests cover supported, missing, timeout, unsupported,
and remediation states. Real engine notes prove selected Codex/Claude probes and chat
turns only; they do not prove the full MVP02-A journey or packaging.

## Handoff To Testing

- Verify readiness contract independently with fake clock and probe runner.
- Capture browser evidence for task draft retention and remediation focus/return behavior.
- Keep auto-install/config mutation and credential logging as blocking security checks.

## Blockers

- No normalized independent result.
- Authentication remains an unknown probe result until an approved real-engine check proves otherwise.
- Packaged sidecar/startup evidence belongs to CLI-GUI-025.
