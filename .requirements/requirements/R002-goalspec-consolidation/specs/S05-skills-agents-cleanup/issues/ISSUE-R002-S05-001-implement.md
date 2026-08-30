---
id: ISSUE-R002-S05-001
requirement: R002
spec_package: S05
kind: implementation
track: implementation
primary_spec: SPEC-R002-S05-001
source_spec_version: 1.0.0
source_spec_hash: 4b48bec2bcf86d651a3db8be4bc96bcde9d1095d1939b714bea2c47644e52565
status: in-progress
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

- [ ] TEST-R002-S05-001
- [ ] TEST-R002-S05-002
- [ ] TEST-R002-S05-003
- [ ] Existing regression tests
- [ ] Static workflow-residue scan

## Completion Record

Status: in-progress
Implemented By: liquiid
Completed At:
PR / Commit: 0909d672, fa771518
Changed Files: readme.md; prior S05 implementation files remain in 8588ace4
Tests Executed: npm test; npm run build; README link check; active workflow residue scan; global skill parity comparison
Evidence References: ../evidence/artifacts/S05-skills-agents-cleanup.2026-08-30T153310Z.run.json
Design Decisions: Split repository guidance into project delivery model and contributor entrypoint commits; preserve the GoalSpec package as the source of truth.
Tradeoffs: Documentation commits are locally complete, but the full S05 package remains blocked by active legacy references and global skill drift.
Spec Deviation: None
Open Questions: QA follow-up must remove active note-it/flat-evidence references and resolve user-global skill parity before promotion.
