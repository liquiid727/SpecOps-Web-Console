---
requirement: R000
source_prd: ./prd.md
source_spec: ./spec.md
status: example
---

# Spec-Test — Department Restriction（变更示例）

## 0. Coverage Matrix

| Requirement | Spec | Test | Level | Status |
|---|---|---|---|---|
| REQ-R000-001 | SPEC-R000-F01-001 | TEST-R000-F01-001 | Integration | DONE |
| INV-R000-001 | SPEC-R000-F01-001 | TEST-R000-F01-002 | Regression | DONE |

---

# F01 — 部门过滤

## TEST-R000-F01-001 Happy Path — 按部门过滤授权清单

Covers:
- REQ-R000-001
- SPEC-R000-F01-001
- AC-R000-001

Level:
- Integration

Given:
- 用户属于 A 部门
- 子系统 X 授权 A 部门，子系统 Y 授权 B 部门

When:
- 系统签发会话

Then:
- 授权清单包含 X
- 授权清单不包含 Y

## TEST-R000-F01-002 Negative / Unchanged Guarantee — 认证流程不得被改变

Covers:
- INV-R000-001

Level:
- Regression

Given:
- 变更已上线

When:
- 执行原认证与回调全套测试（REQ-R001-001/002 相关）

Then:
- 全部原有登录行为保持不变
- state 校验、授权码消费、会话轮换逻辑无回归

## TEST-R000-F01-003 Edge — 无部门归属用户

Covers:
- EDGE-R000-001

Level:
- Integration

Given:
- 用户无部门归属

When:
- 系统签发会话

Then:
- 会话仍可签发
- 授权清单为空

---

## QA Checklist

- [x] Happy Path
- [x] Negative Path
- [x] Error / Empty State
- [ ] Permission Boundary
- [ ] Cross-Tenant（如适用）
- [ ] Retry / Duplicate
- [ ] Refresh / Re-entry
- [x] Failure Recovery
- [x] Audit / Observability

## Exit Criteria

- [x] 所有 P0/P1 REQ 有 Test 覆盖
- [x] 所有关键 INV 有验证
- [x] 必测项通过
- [ ] 无阻塞级缺陷
- [ ] Spec 与实际行为一致
