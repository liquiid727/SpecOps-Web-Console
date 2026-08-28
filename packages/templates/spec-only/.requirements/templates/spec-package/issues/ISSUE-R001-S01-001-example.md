---
id: ISSUE-R001-S01-001
requirement: R001
spec_package: S01
kind: implementation # implementation | verification
track: implementation # implementation | verification
primary_spec: SPEC-R001-S01-001
source_spec: ../spec.md
source_spec_id: SPEC-R001-S01-001
source_spec_version: 1.0.0
source_spec_hash: <sha256-or-immutable-revision>
source_test: ../test.md
source_test_id: TEST-R001-S01
source_test_version: 1.0.0
source_test_hash: <sha256-or-immutable-revision>
status: todo # todo | in-progress | implemented_pending_verification | verified | blocked
priority: P1
owner: <owner>
depends_on: []
---

# ISSUE-R001-S01-001 — <Issue Title>

## Covers

- REQ-R001-001
- SPEC-R001-S01-001
- TEST-R001-S01-001
- AC-R001-001

## Goal

完成后系统增加 / 改变什么，以及用户或运营方能观察到的结果。

## Scope

### Must

- ...
- 代码与关联单元测试在同一变更中提交；如不适用，记录理由。

### Must Not

- 不修改无关 Spec Package。
- 不重新定义 PRD / Spec / Test Design。
- 不通过弱化测试绕过 Spec。
- 不进行无关重构。
- 不把 AI 生成的测试草稿未经人工审核直接作为 Gate Evidence。

## Implementation Context

执行前 MUST 按顺序读取：

1. 根 `prd.md` 和 `index.yaml`。
2. 本目录的 `spec.md`。
3. 本目录的 `test.md`（verification Issue 必须读取）。
4. 本 Issue、`review.md`、`evidence/` 和 `acceptance.md`。
5. 真实 Codebase、Architecture 和 Existing Tests。

## Tasks

- [ ] ...
- [ ] 添加或更新关联单元测试。
- [ ] 生成并登记所需执行证据。
- [ ] 对 AI 生成的用例草稿完成人工审核（适用时）。

## Acceptance Criteria

- Given ... When ... Then ...
- Observable result: ...

## Validation

- [ ] TEST-R001-S01-001
- [ ] Existing regression tests
- [ ] Evidence written or referenced under `../evidence/`
- [ ] Evidence is normalized and registered in `evidence/index.yaml`
- [ ] No unexplained Spec Deviation

## Dependencies

Depends On:

- None

Blocks:

- ...

## Required Evidence

- Evidence type: <normalized-result | report | trace | screenshot | log | gate-report>
- Gate impact: blocking | warning | informational
- Location: ../evidence/<plans|runs|gates|artifacts>/<run-id>/
- Must include: TEST, SPEC/version, ISSUE, commit, environment, time, result

## Completion Record

Status: todo
Implemented By:
Completed At:
PR / Commit:
Changed Files:
Tests Executed:
Evidence References:
Design Decisions:
Tradeoffs:
AI Draft Review:
Spec Deviation: None
Open Questions: None
