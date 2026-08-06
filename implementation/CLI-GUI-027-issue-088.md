# Issue 088 implementation handoff

## Outcome

The existing Provider management and session-selection UI was verified through a new isolated browser fixture. No production UI/API redesign was needed.

## Changes

- `cli-gui/e2e/fixture-server.ts`
  - Added opt-in `SPECOS_E2E_PROVIDER_UI=1` fixtures for two configured, enabled OpenAI-compatible providers.
  - Uses only synthetic `env:` references and keeps credential values out of state and browser evidence.
  - Made the fake headless CLI identify the prompt before appended provider launch overrides.
- `cli-gui/e2e/provider-management.spec.ts`
  - Covers Settings → Models Provider CRUD and delete confirmation.
  - Covers profile/protocol-filtered Provider connection options.
  - Creates two Chat sessions with different providers, completes one turn in each, checks no transcript cross-talk, and verifies token-free state/DOM evidence.
  - Emits explicit PNG, trace, and token-free JSON artifacts.

## Validation

- Single browser run: 1 passed.
- Repeat browser run: 2 passed, 0 failed.
- `npm --prefix cli-gui run typecheck`: passed.
- `npm --prefix cli-gui run lint`: passed.
- `npm --prefix cli-gui run ui:check`: passed with one informational design-token summary.
- `npm --prefix cli-gui run build`: passed; existing large-chunk warning only.
- `review-it`: helper completed; no actionable finding was recorded.

## Boundary and waiver

The evidence is independent browser evidence for the local UI and session boundary. It uses a fake local engine and synthetic environment references; it does not claim real provider network behavior, OS credential-store lifecycle, packaged Tauri behavior, or third-party engine acceptance. Backend launch injection and concurrent argument/environment isolation remain covered by issue 087.

Evidence: `tests/results/cli-gui-027.issue-088.local.json` and `tests/results/cli-gui-027.issue-088.browser.raw.json`.
