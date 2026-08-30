---
requirement: R002
spec_package: S05
test_spec_id: TEST-R002-S05
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_version: 1.0.0
source_spec_hash: 4b48bec2bcf86d651a3db8be4bc96bcde9d1095d1939b714bea2c47644e52565
version: 1.0.0
status: approved
owner: qa-agent
---

# Test Design — S05 Skills, Agents, and Cleanup

## Coverage Matrix

| Requirement | Spec | Test | Level | Planned Evidence |
|---|---|---|---|---|
| REQ-R002-006 | SPEC-R002-S05-001 | TEST-R002-S05-001 | Integration | normalized result + command log |
| REQ-R002-006 | SPEC-R002-S05-002 | TEST-R002-S05-002 | Integration | normalized result + command log |
| REQ-R002-006 | SPEC-R002-S05-003 | TEST-R002-S05-003 | Integration | normalized result + command log |
| REQ-R002-006, REQ-R002-007 | SPEC-R002-S05-004 | TEST-R002-S05-003 | Integration | normalized result + command log |

## TEST-R002-S05-001 — Skill pressure scenarios preserve GoalSpec traceability

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## TEST-R002-S05-002 — Static scan finds no removed workflow assets

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## TEST-R002-S05-003 — Global and repository skills match

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## Exit Criteria

- Every listed test passes at its public seam.
- Existing regression suites pass.
- Evidence is indexed under this package's evidence directory.
- No inactive compatibility path remains in this surface.
