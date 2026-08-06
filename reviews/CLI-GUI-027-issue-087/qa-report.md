# QA report — issue 087

## Evidence

- Implementation handoff exists: `implementation/CLI-GUI-027-issue-087.md`.
- Normalized result exists: `tests/results/cli-gui-027.issue-087.local.json`; schema is `specos-test-standard/v1`, actual `status` and `releaseDecision` are `accepted-with-waiver`.
- Local focused suite reports 104/104 passed, with typecheck, lint, build, ui:check, and `npx specos check` recorded as passed. This is local evidence only and is not release-ready evidence.
- Review-it: helper completed, typecheck passed, and no actionable finding was recorded.

## Evidence matrix

| Gate | Result | Evidence |
|---|---|---|
| Existing injection/model-merge unit coverage | passed | Focused server artifacts referenced by normalized result |
| Dual-protocol injection | passed locally | PTY assertions plus fake AgentBackend launch material |
| Concurrent provider isolation | passed locally | Two-session `Promise.all` PTY fixture |
| No-provider regression | passed locally | Field-level profile args/env baseline |
| Resume/headless lifecycle | passed locally | AgentBackend resume reference plus adapter resume tests |
| Token safety | passed locally | Response/state/logger negative assertions and #086 persisted JSON canary evidence |

## Decision

`accepted-with-waiver`

The local blocking gates are covered. The waiver is limited to real external CLI/provider behavior, OS credential adapters, packaged Tauri, and later deployment-selected provider routing.
