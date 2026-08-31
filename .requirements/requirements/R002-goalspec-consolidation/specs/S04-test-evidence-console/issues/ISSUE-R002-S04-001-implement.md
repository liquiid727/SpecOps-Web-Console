---
id: ISSUE-R002-S04-001
requirement: R002
spec_package: S04
kind: implementation
track: implementation
primary_spec: SPEC-R002-S04-001
source_spec_version: 1.0.0
source_spec_hash: 3287e23f473cdd127cd6e4fdb0b322b4fb2fa7674ea44d0de7aade6024ee166d
status: verified
priority: P0
owner: testing-agent
depends_on: []
---

# ISSUE-R002-S04-001 — Implement Test Evidence Console

## Covers

- REQ-R002-005
- SPEC-R002-S04-001
- SPEC-R002-S04-002
- TEST-R002-S04-001
- TEST-R002-S04-002
- TEST-R002-S04-003

## Goal

Deliver the test evidence console portion of the GoalSpec consolidation.

## Must

- Implement only the approved contracts in this child package.
- Add behavior tests at public seams before implementation.
- Store final command output and gate references under ../evidence/.

## Must Not

- Add migration, compatibility aliases, read fallback, or project modes.
- Touch Bugrail or unrelated user changes.
- Weaken tests to make the cutover pass.

## Validation

- [x] TEST-R002-S04-001
- [x] TEST-R002-S04-002
- [x] TEST-R002-S04-003
- [x] Existing regression tests
- [x] Static workflow-residue scan

## Completion Record

Status: complete
Implemented By: liquiid
Completed At: 2026-08-30
PR / Commit: cff32689; verification working-tree@85690a48
Changed Files: rules/ci; rules/testing; scripts/checks; scripts/orchestration; test-console/app; test-console/lib; test-console/tests
Tests Executed: npm --prefix test-console run test; npm --prefix test-console run build; node --test scripts/checks/spec-test-gates.test.mjs scripts/orchestration/test-runner.test.mjs
Evidence References: ../evidence/artifacts/S04-test-evidence-console.2026-08-30T165500Z.run.json; ../evidence/gates/S04-test-evidence-console.R002.gate-report.json
Design Decisions: Treat each child evidence directory as the only read/write scope for plans, schedules, runs, gates, and artifacts.
Tradeoffs: Gate evidence uses the local working tree revision marker until a delivery commit is created.
Spec Deviation: None
Open Questions: None
