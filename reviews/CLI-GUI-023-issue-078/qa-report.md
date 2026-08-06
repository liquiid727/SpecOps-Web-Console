# QA Report: CLI-GUI-023 Issue 078

## Decision

`blocked`

## Evidence Summary

- Implementation-coupled focused tests: 141/141 passed.
- Focused Chat browser journeys: 4/4 passed.
- Original full browser run: 11/12 passed; concurrent isolation failed.
- Revalidation: full browser run 12/12 passed and isolation repeat 3/3 passed
  after stale-session cleanup in the E2E fixture.
- Normalized result: `tests/results/cli-gui-023.issue-078.local.json`.
- Real Codex A-gate: partial evidence with a failed first structured-token gate.
- Real retry-after-failed-turn and real approval/diff: missing.

## Gate Rationale

CLI-GUI-023 still requires real-engine retry, approval/diff, and lifecycle evidence.
The browser isolation failure is resolved locally, but the remaining real-engine
gates keep QA from returning `accepted` or `accepted-with-waiver`.

## Recovery Conditions

Produce the missing normalized P0/P1 real-engine evidence and execute real-engine
failed-turn retry plus approval/diff journeys with versioned artifact references.
