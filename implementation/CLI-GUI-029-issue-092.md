# CLI-GUI-029 / Issue 092 Handoff

## Implementation status

The production state repository already contains the deployment persistence seam. Issue 092 added only focused evidence in `cli-gui/server/store.test.ts` and `cli-gui/shared/types.test.ts`; no production code or human-authored specification was changed.

The current runtime accepts a v6 source envelope and writes the repository's current v8 envelope. The feature wording calls this a v6→v7 migration because v7 introduced deployments; the handoff records the actual v6→v8 compatibility path rather than claiming the disk output remains v7.

## Evidence

- Focused independent run: 3 files, 68/68 passed (`store`, `application`, and shared type tests).
- v6 fixture coverage: malformed deployment filtering, archived history, source-version backup, existing-backup preservation, repeated-load stability, rename-failure source/backup preservation, and temporary-file cleanup.
- Shared contract coverage: deployment summary is exported and `unknown` capability is represented as `unknown` eligibility rather than eligible.
- Full Vitest: 57 files, 471 passed, 4 skipped.
- Typecheck, lint, ui:check, build, `npx specos check`, and `git diff --check` passed.

Artifacts: `tests/results/cli-gui-029.issue-092.local.json` and `tests/results/cli-gui-029.issue-092.migration.raw.json`.

## Boundary and status

Status: **blocked**. The store migration gate is locally evidenced. Independent deployment-registry/domain coverage for duplicate identity/reference validation, complete eligibility, and archived re-enable rejection is not present in this run and belongs to issue 093's API/compatibility scope. Those requirements must not be inferred from this migration evidence.
