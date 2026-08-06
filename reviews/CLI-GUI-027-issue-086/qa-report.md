# QA report — issue 086

## Evidence

- Implementation handoff exists: `implementation/CLI-GUI-027-issue-086.md`.
- Normalized result exists: `tests/results/cli-gui-027.issue-086.local.json`; schema is `specos-test-standard/v1`, actual `status` and `releaseDecision` are `accepted-with-waiver`.
- Local focused provider suite reports 98/98 passed, with typecheck, lint, build, ui:check, and `npx specos check` recorded as passed. This is local evidence only and is not release-ready evidence.
- Review-it: helper completed, typecheck passed, and no actionable finding was recorded.

## Evidence matrix

| Gate | Result | Evidence |
|---|---|---|
| Provider storage/API local suite | passed | Focused server test artifacts referenced by normalized result |
| Direct v4 input migration and malformed provider filtering | passed locally | `store.test.ts` direct v4 fixtures and readonly checks |
| Complete current CRUD validation and readonly matrix | passed locally | `application.test.ts` provider matrix |
| Credential safety | passed locally | API/state canary assertions and `cli-gui-027.issue-086.security.raw.json` |

## Decision

`accepted-with-waiver`

The local gates are complete for the current repository contract. The waiver records that CLI-GUI-028 has already superseded the older v1 endpoint/credential semantics, and that OS credential-adapter and packaged evidence belong to downstream issue 089/110 gates.
