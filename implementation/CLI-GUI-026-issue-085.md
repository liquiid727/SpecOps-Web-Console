# Issue 085 implementation handoff

## Scope

Issue 085 verifies the existing CLI-GUI-026 automatic model sync path:

- `application.ts` runs the read-only model reader before capability detection,
  gates repeated reads by the five-minute TTL, preserves cached models on
  failure, and keeps manual Sync as the TTL bypass.
- `model-catalog.ts` parses the Codex profile/provider model fields used by the
  browser fixture.
- `cli-gui/e2e/fixture-server.ts` now has an opt-in `SPECOS_E2E_MODEL_SYNC=1`
  fixture that creates a temporary HOME and Codex config, then exposes a
  headless profile/session without reading the developer's real config.
- `cli-gui/e2e/model-sync.spec.ts` verifies the new-session Composer model
  selector and saves a screenshot plus Chromium trace.

## Evidence

- Focused application/model-catalog run: `44 passed`.
- Typecheck, lint/UI governance, build, and `npx specos check` passed.
- Browser run: `1 passed`; `fixture-auto-model` appeared in the Composer after
  selecting `Fixture headless` from New Quest.
- Normalized evidence: `tests/results/cli-gui-026.issue-085.local.json`.
- Raw browser record: `tests/results/cli-gui-026.issue-085.browser.raw.json`.
- Browser artifacts: `cli-gui/test-results/model-sync-shows-a-model-f-a3158-in-the-new-session-composer/`.

## Status

`accepted` locally. The browser fixture is synthetic and isolated; it proves
the local model-selector contract, not remote provider behavior or packaged
Tauri acceptance.
