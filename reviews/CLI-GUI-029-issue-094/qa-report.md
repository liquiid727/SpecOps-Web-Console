# QA Report — CLI-GUI-029 / Issue 094

## Handoff and evidence

Handoff: `implementation/CLI-GUI-029-issue-094.md`.

Normalized result: `tests/results/cli-gui-029.issue-094.local.json`, schema `1.0`, standard `specos-test-standard/v1`, with `status=accepted` and `releaseDecision=accepted`. Raw evidence: `tests/results/cli-gui-029.issue-094.legacy.raw.json`.

## Evidence matrix

| Gate | Evidence | Result |
|---|---|---|
| Legacy precedence and normalization | Pure resolver and route resolver tests; active/launch/profile-default order and `default`/empty handling | Passed independently |
| No-route runtime | Real application fixture asserts terminal argv/env, chat backend model, no Deployment identity, and no fake deployment creation | Passed independently |
| Route safety | Bound route with missing candidate returns route error and no `legacyResolution` fallback | Passed independently |
| Resume/fork | Chat backend resume regression plus fork identity/BackendSessionRef/activeModel and resume-token cleanup | Passed independently |
| Archive/history | Real Deployment POST→DELETE→GET tombstone followed by fresh disk repository recovery of frozen task/attempt snapshot | Passed independently |
| Missing references | Actual API start returns `PROFILE_NOT_FOUND` or `WORKSPACE_NOT_FOUND`; deployment matrix covers Provider/model stable errors | Passed independently |
| Full/static gates | 59 files, 493 passed/4 skipped; typecheck, lint/ui:check, build, SpecOS and diff check pass | Passed |
| Browser/platform | CLI-GUI-029 Test Spec marks both N/A | N/A |

## QA decision

**accepted**. The issue-specific local implementation and independent evidence satisfy the feature gate. This is local acceptance, not shipped/released status.

## Remaining boundary

Real external Provider, packaged Tauri, and browser/platform behavior were not run because they are outside this issue's feature-specific Test Spec. No claim is made for those environments.
