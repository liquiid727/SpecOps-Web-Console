# CLI-GUI-028 / Issue 090 Handoff

## Outcome

The existing v5-to-current state migration and write-only Provider credential API were completed with the missing failure and concurrency safeguards. This loop added provider-scoped credential mutation serialization, state-save rollback, replacement cleanup rollback, and indirect Provider in-use checks. No human-authored spec or PRD was overwritten.

## Changed implementation

- `cli-gui/server/application.ts`: serialize credential PUT/DELETE per Provider; restore the prior Provider state on persistence or SecretStore failure; clean up newly written credentials; remove replaced keychain credentials; reject direct and indirect active Provider references with `PROVIDER_IN_USE`.
- `cli-gui/server/application.test.ts`: migration/API/security, in-use, concurrent mutation, save-failure, cleanup-failure, and CSRF/body-size coverage.

## Evidence

- Independent focused suite: 3 files, 67 tests passed (`server/store.test.ts` 20, `server/application.test.ts` 40, `server/secret-store.test.ts` 7).
- Full Vitest: 57 files, 469 passed, 4 skipped.
- Typecheck, lint, ui:check, build, `npx specos check`, and `git diff --check`: passed.
- Raw security record: `tests/results/cli-gui-028.issue-090.security.raw.json`.
- Normalized result: `tests/results/cli-gui-028.issue-090.local.json`.

## QA boundary

The local implementation and test matrix pass, but QA remains `blocked`. Issue 089's Windows Credential Manager, Linux Secret Service, and packaged Tauri evidence is unavailable; cross-process locking and real platform partial-delete recovery are also not claimed.
