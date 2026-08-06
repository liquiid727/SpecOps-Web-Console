# QA Report — CLI-GUI-029 / Issue 093

## Handoff and evidence

Handoff: `implementation/CLI-GUI-029-issue-093.md`.

The refreshed normalized result is `tests/results/cli-gui-029.issue-093.local.json`, schema `1.0`, standard `specos-test-standard/v1`, with `status=blocked` and `releaseDecision=blocked`. Raw evidence is `tests/results/cli-gui-029.issue-093.domain.raw.json`.

## Evidence matrix

| Gate | Evidence | Result |
|---|---|---|
| Registry/domain | Five independent domain tests cover protocol, exclusion, unknown, archived, and patch validation | Passed locally |
| CRUD/API | 44 application tests cover list/detail, mutations, errors, references, and archive | Passed locally |
| Secret and policy | Synthetic canary absent from response/state/logger; readonly and Origin/CSRF gates pass | Passed locally |
| In-process concurrency | Lock serializes duplicate tuple POST and concurrent archive/delete | Passed locally |
| Full/static gates | 58 files, 483 passed/4 skipped; typecheck, lint, ui:check, build, SpecOS and diff check pass | Passed |
| Cross-process concurrency | No multi-process runner available | Blocked |
| External/package boundary | No real Provider or packaged Tauri run | Blocked |

## QA decision

**blocked**. All local issue-specific gates pass, but the missing cross-process and real external/package evidence cannot be inferred from a single in-memory process.

## Minimum recovery

Run an isolated multi-process mutation/lock matrix and approved real Provider/packaged-host canaries with secret-free artifacts, then regenerate this result. Browser/platform-specific evidence remains outside CLI-GUI-029's feature gate unless later required by the aggregate.
