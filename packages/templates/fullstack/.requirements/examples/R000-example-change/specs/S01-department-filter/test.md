---
requirement: R000
spec_package: S01
test_spec_id: TEST-R000-S01
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_version: 1.0.0
source_spec_hash: example-sha256-r000-change-s01
version: 1.0.0
status: approved
owner: testing-agent
---

# Test Design — S01 部门过滤

## 0. Coverage Matrix

| Requirement | Spec | Test | Level | Planned Evidence |
|---|---|---|---|---|
| REQ-R000-001 | SPEC-R000-S01-001 | TEST-R000-S01-001 | Integration | normalized result |
| EDGE-R000-001 | SPEC-R000-S01-001 | TEST-R000-S01-002 | Integration | normalized result |
| INV-R000-001 | SPEC-R000-S01-001 | TEST-R000-S01-003 | Regression | trace + result |
| INV-R000-002 | SPEC-R000-S01-001 | TEST-R000-S01-003 | Regression | trace + result |
| INV-R000-003 | SPEC-R000-S01-001 | TEST-R000-S01-004 | Regression | identity + audit log |

## TEST-R000-S01-001 Happy Path — 按部门过滤授权清单

Covers:
- REQ-R000-001
- SPEC-R000-S01-001
- AC-R000-001

Given:
- 用户属于 A 部门，X 授权 A 部门，Y 授权 B 部门。

When:
- 系统签发会话。

Then:
- 清单包含 X。
- 清单不包含 Y。

## TEST-R000-S01-002 Edge — 无部门归属用户

Covers:
- EDGE-R000-001
- SPEC-R000-S01-001
- AC-R000-002

Given:
- 用户无部门归属。

When:
- 系统签发会话。

Then:
- 会话仍可签发。
- 授权清单为空。

## TEST-R000-S01-003 Negative / Unchanged Guarantee — 认证与令牌行为不得回归

Covers:
- INV-R000-001
- INV-R000-002

Given:
- 部门过滤变更已集成。

When:
- 执行既有 SSO redirect、回调 state 校验、授权码消费和刷新令牌轮换测试。

Then:
- 认证流程保持不变。
- state 校验和授权码消费保持不变。
- 令牌轮换保持不变。

## TEST-R000-S01-004 Negative / Unchanged Guarantee — Identity 与审计不得回归

Covers:
- INV-R000-003
- SPEC-R000-S01-001

Given:
- 部门过滤变更已集成。

When:
- 执行 Identity 唯一性和登录/会话审计回归测试。

Then:
- 同一 Identity 不产生重复主体。
- 登录和会话审计事件仍然完整。

## QA Exploratory Cases

- 部门权威源短暂不可用。
- 角色与部门授权交集为空。

## Exit Criteria

- [x] P1 REQ 和 Edge Case 有测试设计。
- [x] Unchanged Guarantees 有回归验证方法。
- [x] 自动化和探索性证据要求已定义。
