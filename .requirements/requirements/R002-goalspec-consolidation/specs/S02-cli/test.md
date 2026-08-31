---
requirement: R002
spec_package: S02
test_spec_id: TEST-R002-S02
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_version: 1.0.0
source_spec_hash: 3829f6b78dd9bf9d888e8c8ccd86e78bf2685667fc329b55e834dbd3e32787eb
version: 1.0.0
status: approved
owner: implementation-agent
---

# Test Design — S02 CLI

## Coverage Matrix

| Requirement | Spec | Test | Level | Planned Evidence |
|---|---|---|---|---|
| REQ-R002-003 | SPEC-R002-S02-001 | TEST-R002-S02-001 | Integration | normalized result + command log |
| REQ-R002-003 | SPEC-R002-S02-002 | TEST-R002-S02-002 | Integration | normalized result + command log |
| REQ-R002-003 | SPEC-R002-S02-003 | TEST-R002-S02-003 | Integration | normalized result + command log |

## TEST-R002-S02-001 — Fresh init emits the GoalSpec manifest

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## TEST-R002-S02-002 — Intake creates canonical workspace

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## TEST-R002-S02-003 — CLI resolves every GoalSpec entrypoint

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## Exit Criteria

- Every listed test passes at its public seam.
- Existing regression suites pass.
- Evidence is indexed under this package's evidence directory.
- No inactive compatibility path remains in this surface.
