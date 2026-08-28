---
id: ISSUE-R002-S03-001
requirement: R002
spec_package: S03
kind: implementation
track: implementation
primary_spec: SPEC-R002-S03-001
source_spec_version: 1.0.0
source_spec_hash: pending-final-verification
status: in-progress
priority: P0
owner: implementation-agent
depends_on: []
---

# ISSUE-R002-S03-001 — Implement Explorer and Catalog

## Covers

- REQ-R002-004
- SPEC-R002-S03-001
- SPEC-R002-S03-002
- SPEC-R002-S03-003
- TEST-R002-S03-001
- TEST-R002-S03-002
- TEST-R002-S03-003

## Goal

Deliver the explorer and catalog portion of the GoalSpec consolidation.

## Must

- Implement only the approved contracts in this child package.
- Add behavior tests at public seams before implementation.
- Store final command output and gate references under ../evidence/.

## Must Not

- Add migration, compatibility aliases, read fallback, or project modes.
- Touch Bugrail or unrelated user changes.
- Weaken tests to make the cutover pass.

## Validation

- [ ] TEST-R002-S03-001
- [ ] TEST-R002-S03-002
- [ ] TEST-R002-S03-003
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
