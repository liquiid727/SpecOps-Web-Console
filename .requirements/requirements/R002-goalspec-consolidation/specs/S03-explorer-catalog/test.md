---
requirement: R002
spec_package: S03
test_spec_id: TEST-R002-S03
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_version: 1.0.0
source_spec_hash: pending-final-verification
version: 1.0.0
status: approved
owner: implementation-agent
---

# Test Design — S03 Explorer and Catalog

## Coverage Matrix

| Requirement | Spec | Test | Level | Planned Evidence |
|---|---|---|---|---|
| REQ-R002-004 | SPEC-R002-S03-001 | TEST-R002-S03-001 | Integration | normalized result + command log |
| REQ-R002-004 | SPEC-R002-S03-002 | TEST-R002-S03-002 | Integration | normalized result + command log |
| REQ-R002-004 | SPEC-R002-S03-003 | TEST-R002-S03-003 | Integration | normalized result + command log |

## TEST-R002-S03-001 — Workspace fixture renders child packages

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## TEST-R002-S03-002 — Empty and invalid packages are explicit

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## TEST-R002-S03-003 — Catalog contains only GoalSpec assets

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## Exit Criteria

- Every listed test passes at its public seam.
- Existing regression suites pass.
- Evidence is indexed under this package's evidence directory.
- No inactive compatibility path remains in this surface.
