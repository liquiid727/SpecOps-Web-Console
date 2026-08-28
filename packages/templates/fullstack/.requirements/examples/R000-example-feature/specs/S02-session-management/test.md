---
requirement: R000
spec_package: S02
test_spec_id: TEST-R000-S02
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_version: 1.0.0
source_spec_hash: example-sha256-r000-s02
version: 1.0.0
status: approved
owner: testing-agent
---

# Test Design — S02 会话管理

## 0. Coverage Matrix

| Requirement | Spec | Test | Level | Planned Evidence |
|---|---|---|---|---|
| REQ-R000-002 | SPEC-R000-S02-001 | TEST-R000-S02-001 | Integration | normalized result + audit log |

## TEST-R000-S02-001 会话刷新与轮换

Covers:
- REQ-R000-002
- SPEC-R000-S02-001
- AC-R000-001

Given:
- 用户持有已签发的会话和有效刷新令牌。

When:
- 使用刷新令牌刷新，随后重复使用旧刷新令牌。

Then:
- 返回新访问令牌和新刷新令牌。
- 旧访问令牌与旧刷新令牌失效。
- 旧刷新令牌复用被拒绝并产生审计事件。

## QA Exploratory Cases

- 多设备会话和设备指纹变更。
- 网络重试造成的并发刷新。

## Exit Criteria

- [x] P1 REQ 有测试设计。
- [x] 令牌轮换和复用 Invariant 有验证方法。
- [x] 所需证据类型已定义。
