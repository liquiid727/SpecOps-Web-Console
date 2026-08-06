# CLI-GUI-030 / Issue 097

## Implementation status

Implemented and independently verified the route-binding API, resolve/preflight wiring, one-shot override isolation, and legacy no-route compatibility.

- `cli-gui/server/application.ts`: Session PATCH now snapshots and restores the full Session when persistence fails; existing binding, resolve, preflight, one-shot, and legacy paths remain in the application boundary.
- `cli-gui/server/application.test.ts`: explicit issue-097 HTTP suite covers Session binding/revision/readonly/rollback, resolve precedence and fixed failures, zero-side-effect preflight for chat/terminal, one-shot isolation, legacy chat/terminal, and secret redaction.

Invalid fixed/no-candidate/unsupported-engine requests fail before transcript user messages, execution Task/Attempt creation, PTY spawn, Agent backend, persistent runtime, or state save. One-shot fixed selection is request-local and is absent from Session/AppState and subsequent requests.

## Evidence and disposition

Independent issue suite: 10 passed within the application test file. Application focused suite: 62 passed; application + chat: 83 passed. Full suite: 59 files, 550 passed, 4 skipped. Typecheck, lint, `ui:check`, build, `npx specos check`, `git diff --check`, and `/review-it` completed successfully; build emitted only the existing chunk-size warning.

The normalized result is `tests/results/cli-gui-030.issue-097.local.json`; raw local evidence is `tests/results/cli-gui-030.issue-097.route.raw.json`. Secret canaries and credential references were absent from API responses, logs, and state; `SecretStore.resolve` was not called. Browser/platform, packaged-host, cross-process, and real external Provider/engine evidence are not claimed. Local QA decision: `accepted`.
