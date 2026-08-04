# CLI-GUI-022 MVP02-A Foundation Handoff

## Meta

- Feature Spec: `.features/CLI-GUI-022-agent-backend-normalized-events/spec.md` v1.0
- Test Spec: `.features/CLI-GUI-022-agent-backend-normalized-events/test-spec.md` v1.0
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `.issues/issue-062-agent-backend-normalized-events-and-schema-v4.md`, `.issues/issue-070-native-session-resume-and-recovery.md`
- Status: `implemented`, `locally-verified`; Codex/Claude real-engine subset `verified`; independent evidence `missing`

## Existing Implementation Evidence

- Backend contracts/normalization: `cli-gui/shared/agent-runtime.ts`, `cli-gui/server/agent-backends.ts`.
- Production composition: `cli-gui/server/production.ts`, `cli-gui/server/application.ts`.
- Schema/resume: `cli-gui/shared/state.ts`, `cli-gui/server/store.ts`, `cli-gui/server/terminal-resume.ts`.

## Local And Real-Engine Evidence

Historical notes record local tests and a macOS Codex/Claude JSON-stream first-turn and
native-resume probe. Approval, diff, cancel/retry/restart full journeys, ACP fixtures,
and packaged acceptance are still open.

## Handoff To Testing

- Normalize every event category, unknown-event diagnostic, migration, resume rejection,
  bridge/fallback, and settlement race.
- Attach real-engine probe output only as supporting trace/log evidence, not as a substitute
  for an independent run.
- Keep `GenericAcpBackend` marked extension/fixture-pending.

## Blockers

- ACP/native SDK transport fixture and acceptance environment are missing.
- No complete independent normalized result exists.
- `ProfileAgentBackend` fallback usage must be observable before release.
