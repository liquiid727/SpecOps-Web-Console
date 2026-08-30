---
id: ISSUE-R002-S05-001
requirement: R002
spec_package: S05
kind: implementation
track: implementation
primary_spec: SPEC-R002-S05-001
source_spec_version: 1.0.0
source_spec_hash: 4b48bec2bcf86d651a3db8be4bc96bcde9d1095d1939b714bea2c47644e52565
status: verified
priority: P0
owner: qa-agent
depends_on: []
---

# ISSUE-R002-S05-001 — Implement Skills, Agents, and Cleanup

## Covers

- REQ-R002-006, REQ-R002-007
- SPEC-R002-S05-001
- SPEC-R002-S05-002
- SPEC-R002-S05-003
- SPEC-R002-S05-004
- TEST-R002-S05-001
- TEST-R002-S05-002
- TEST-R002-S05-003

## Goal

Deliver the skills, agents, and cleanup portion of the GoalSpec consolidation.

## Must

- Implement only the approved contracts in this child package.
- Add behavior tests at public seams before implementation.
- Store final command output and gate references under ../evidence/.

## Must Not

- Add migration, compatibility aliases, read fallback, or project modes.
- Touch Bugrail or unrelated user changes.
- Weaken tests to make the cutover pass.

## Validation

- [x] TEST-R002-S05-001
- [x] TEST-R002-S05-002
- [x] TEST-R002-S05-003
- [x] Existing regression tests
- [x] Static workflow-residue scan

## Completion Record

Status: complete
Implemented By: liquiid
Completed At: 2026-08-31
PR / Commit: 8588ace4, 0909d672, fa771518, 3885d5b0, db185fba
Changed Files: README; active workflow documentation; Core evidence-path generation and tests; Test Console run copy; asset guidance; .gitignore; six user-global GoalSpec skills
Tests Executed: npm test; npm run build; npm --prefix test-console test; README link check; active workflow residue scan; global skill parity comparison; GoalSpec gate checker
Evidence References: ../evidence/artifacts/S05-skills-agents-cleanup.2026-08-30T161738Z.run.json; ../evidence/gates/S05-skills-agents-cleanup.ISSUE-R002-S05-001.gate-report.json
Design Decisions: Split repository guidance into project delivery model and contributor entrypoint commits; use child-package evidence paths for plans, runs, gates, and artifacts; keep repository skills as the source for user-global parity.
Tradeoffs: The six user-global skill files were synchronized outside the repository to satisfy the explicit S05 parity contract.
Spec Deviation: None
Open Questions: None
