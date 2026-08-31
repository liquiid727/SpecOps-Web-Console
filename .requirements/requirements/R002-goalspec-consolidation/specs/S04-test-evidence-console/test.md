---
requirement: R002
spec_package: S04
test_spec_id: TEST-R002-S04
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_version: 1.0.0
source_spec_hash: 3287e23f473cdd127cd6e4fdb0b322b4fb2fa7674ea44d0de7aade6024ee166d
version: 1.0.0
status: approved
owner: testing-agent
---

# Test Design — S04 Test Evidence Console

## Coverage Matrix

| Requirement | Spec | Test | Level | Planned Evidence |
|---|---|---|---|---|
| REQ-R002-005 | SPEC-R002-S04-001 | TEST-R002-S04-001 | Integration | normalized result + command log |
| REQ-R002-005 | SPEC-R002-S04-002 | TEST-R002-S04-002 | Integration | normalized result + command log |
| REQ-R002-005 | SPEC-R002-S04-002 | TEST-R002-S04-003 | Integration | normalized result + command log |

## TEST-R002-S04-001 — Console loads a GoalSpec evidence fixture

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## TEST-R002-S04-002 — Runner writes canonical run evidence

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## TEST-R002-S04-003 — Gate ignores evidence from other packages

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## Exit Criteria

- Every listed test passes at its public seam.
- Existing regression suites pass.
- Evidence is indexed under this package's evidence directory.
- No inactive compatibility path remains in this surface.
