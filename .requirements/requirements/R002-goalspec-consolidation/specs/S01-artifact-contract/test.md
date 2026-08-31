---
requirement: R002
spec_package: S01
test_spec_id: TEST-R002-S01
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_version: 1.0.0
source_spec_hash: f6c96c872ccd5fc89ce41b978744e99557475a73d4066615364672987a18ef09
version: 1.0.0
status: approved
owner: architecture-agent
---

# Test Design — S01 Artifact Contract

## Coverage Matrix

| Requirement | Spec | Test | Level | Planned Evidence |
|---|---|---|---|---|
| REQ-R002-001 | SPEC-R002-S01-001 | TEST-R002-S01-001 | Integration | normalized result + command log |
| REQ-R002-001 | SPEC-R002-S01-002 | TEST-R002-S01-002 | Integration | normalized result + command log |

## TEST-R002-S01-001 — Manifest rejects legacy fields

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## TEST-R002-S01-002 — Evidence paths resolve within one child package

Given a controlled GoalSpec fixture, when the public interface is exercised, then the expected behavior is observed and invalid input fails explicitly.

## Exit Criteria

- Every listed test passes at its public seam.
- Existing regression suites pass.
- Evidence is indexed under this package's evidence directory.
- No inactive compatibility path remains in this surface.
