# CLI-GUI-028 / Issue 091 Handoff

## Outcome

Provider launch resolution is now exercised across terminal, backend chat, and persistent chat. The persistent runtime no longer silently drops OpenAI-compatible Provider configuration: transient provider arguments are passed only to the first `codex mcp-server` spawn and are not part of state, API, or transcript data.

## Changed implementation

- `cli-gui/server/application.ts`: pass resolver-generated transient provider args through both persistent wiring paths.
- `cli-gui/server/ports.ts`: add optional `providerArgs` to `PersistentChatTurnRequest`.
- `cli-gui/server/codex-mcp-runtime.ts`: prepend transient provider args before `mcp-server` only when creating the resident process.
- `cli-gui/server/codex-mcp-runtime.test.ts`, `cli-gui/server/application.test.ts`, `cli-gui/server/chat-api.test.ts`: three-path, pre-spawn, persistent-args, isolation, and redaction coverage.

## Evidence

- Independent focused suite: 3 files, 71 tests passed.
- Full Vitest: 57 files, 471 passed, 4 skipped.
- Typecheck, lint, ui:check, build, `npx specos check`, and `git diff --check`: passed.
- Raw security record: `tests/results/cli-gui-028.issue-091.security.raw.json`.
- Normalized result: `tests/results/cli-gui-028.issue-091.local.json`.

## QA boundary

Local integration and redaction evidence is complete, but QA remains `blocked`. The current host cannot provide real Codex, external Provider, Windows/Linux SecretStore, cross-process, or packaged Tauri evidence; issue 089/090 platform blockers remain inherited.
