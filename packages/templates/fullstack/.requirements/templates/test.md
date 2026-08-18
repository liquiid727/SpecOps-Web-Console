---
requirement: R001
source_prd: ./prd.md
source_spec: ./spec.md
status: draft
---

# Spec-Test — <Requirement Title>

## 0. Coverage Matrix

| Requirement | Spec | Test | Level | Status |
|---|---|---|---|---|
| REQ-R001-001 | SPEC-R001-F01-001 | TEST-R001-F01-001 | Integration | TODO |

---

# F01 — <Feature Name>

## TEST-R001-F01-001 <Happy Path>

Covers:
- REQ-R001-001
- SPEC-R001-F01-001
- AC-R001-001

Level:
- Integration

Given:
- ...

When:
- ...

Then:
- ...

## TEST-R001-F01-002 <Negative Path>

Covers:
- INV-R001-001
- SPEC-R001-F01-002

Given:
- ...

When:
- ...

Then:
- 操作必须失败
- 系统状态不得错误修改
- 不得产生非法 side effect

## TEST-R001-F01-003 <Permission / Security>

...

## TEST-R001-F01-004 <Concurrency / Idempotency>

如不适用可以省略。

---

## QA Checklist

- [ ] Happy Path
- [ ] Negative Path
- [ ] Error / Empty State
- [ ] Permission Boundary
- [ ] Cross-Tenant（如适用）
- [ ] Retry / Duplicate
- [ ] Refresh / Re-entry
- [ ] Failure Recovery
- [ ] Audit / Observability

## Exit Criteria

- [ ] 所有 P0/P1 REQ 有 Test 覆盖
- [ ] 所有关键 INV 有验证
- [ ] 必测项通过
- [ ] 无阻塞级缺陷
- [ ] Spec 与实际行为一致
