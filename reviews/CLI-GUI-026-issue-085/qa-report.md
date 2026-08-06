# Issue 085 QA report

## Decision

`accepted`

## Evidence

| Requirement | Evidence | Result |
|---|---|---|
| TTL-gated, read-only automatic sync | `server/application.test.ts` | passed |
| Failure preservation and manual-sync bypass | `server/application.test.ts` and `server/model-catalog.test.ts` | passed |
| Type, lint, build, UI, and spec validation | normalized command record | passed |
| Browser model-selector verification | isolated Playwright screenshot/trace | passed |

The browser fixture uses a temporary HOME and a valid Codex config containing
`fixture-auto-model`; it never depends on the developer's real configuration.
The new-session Composer displayed that model after selecting `Fixture headless`.

## Remaining risks

The result is local acceptance only. Real provider/engine behavior and packaged
Tauri acceptance remain outside this issue and are tracked by later gates.
