---
id: ISSUE-R002-S05-001
requirement: R002
spec_package: S05
kind: implementation
track: implementation
primary_spec: SPEC-R002-S05-001
source_spec_version: 1.0.0
source_spec_hash: pending-final-verification
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
Implemented By:
Completed At:
PR / Commit:
Changed Files:
Tests Executed:
Evidence References:
Design Decisions:
Tradeoffs:
Spec Deviation: None
Open Questions: None
