# CLI-GUI-029 / Issue 093 Handoff

## Implementation status

The deployment registry now owns enablement error mapping and exclusion calculation. The API validates verified profile catalog/capability, Provider/Profile compatibility, SecretStatus, duplicate ID and duplicate provider/profile/model identity; archived deployments cannot be re-enabled, and archive mutations are serialized in-process. PATCH field types are rejected instead of silently ignored.

Changed production files: `cli-gui/server/application.ts`, `cli-gui/server/deployment-registry.ts`. Changed evidence files include `cli-gui/server/application.test.ts` and `cli-gui/server/deployment-registry.test.ts`.

## Evidence

- Independent focused run: 2 files, 49/49 passed.
- Full Vitest: 58 files, 483 passed, 4 skipped.
- Covered: CRUD list/detail, duplicate ID/tuple, missing references, protocol mismatch, unknown model, missing credential, readonly/origin/CSRF, secret-free response/state/logger, capability-unavailable disabled storage, archived tombstone/re-enable rejection, in-use references, and in-process concurrent mutation single-winner behavior.
- Typecheck, lint, ui:check, build, `npx specos check`, and `git diff --check` passed.

Artifacts: `tests/results/cli-gui-029.issue-093.local.json` and `tests/results/cli-gui-029.issue-093.domain.raw.json`.

## Status and recovery

Status: **blocked**. The local domain/API contract is independently verified. Cross-process locking and real external Provider/packaged-host behavior remain unverified; synthetic fixtures do not establish release acceptance.
