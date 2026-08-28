---
requirement: R000
spec_package: S01
source_spec: ./spec.md
source_test: ./test.md
source_review: ./review.md
source_spec_version: 1.0.0
source_test_version: 1.0.0
decision: accepted
qa_owner: qa-agent
accepted_at: 2026-08-13
promotion: allowed
---

# QA Acceptance — S01 部门过滤

> 示例证据引用用于表达结构，不代表本仓库真实执行的测试结果。

## Evidence Manifest

| Evidence | Covers | Location | Result |
|---|---|---|---|
| Department filter integration run | TEST-R000-S01-001, TEST-R000-S01-002 | ./evidence/README.md | pass |
| Unchanged guarantees regression | TEST-R000-S01-003 | ./evidence/README.md | pass |

## Acceptance Decision

Decision:
- accepted

Blocking Gaps:
- None

Review Status:
- REVIEW-R000-S01-001 resolved.

Residual Risk:
- 权威部门源不可用时会话签发被阻断。

Waiver:
- None

Promotion Recommendation:
- allowed

## Spec Package Done Check

- [x] All required Issues are done.
- [x] Test exit criteria are supported by evidence.
- [x] Review blockers are resolved.
- [x] No unexplained Spec Deviation remains.
- [x] Mapped PRD Acceptance Criteria are verified.
- [x] Unchanged Guarantees are verified.
