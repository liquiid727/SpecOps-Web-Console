# QA report — issue 088

## Evidence

- Implementation handoff: `implementation/CLI-GUI-027-issue-088.md`.
- Normalized result: `tests/results/cli-gui-027.issue-088.local.json`.
- Browser raw evidence: `tests/results/cli-gui-027.issue-088.browser.raw.json`.
- Browser artifacts include Provider CRUD and dual-session screenshots, an explicit Playwright trace, and a token-free JSON attachment.
- Static gates passed: typecheck, lint, ui:check, and build.
- Review-it helper completed; no actionable finding was recorded.

## Evidence matrix

| Gate | Result | Evidence |
|---|---|---|
| Provider CRUD browser flow | passed | Create/read/update/delete confirmation/delete, `provider-crud.png` |
| Provider filtering | passed | Codex profile exposes only configured compatible Provider A/B options |
| Dual-session conversations | passed | Provider A/B sessions each completed a distinct Chat turn; switching back shows no cross-talk |
| Secret redaction boundary | passed | Page, state snapshot, screenshot/trace attachment record and normalized result contain no synthetic credential values |
| Static/project gates | passed | typecheck, lint, ui:check, build |

## Waiver

The browser evidence uses the repository's fake headless engine and synthetic environment credentials. It does not prove a real third-party provider, OS credential store, packaged Tauri host, or remote network. Issue 087 supplies the independent backend launch isolation evidence.

## Decision

`accepted-with-waiver`
