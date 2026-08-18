---
requirement: R000
source_prd: ./prd.md
source_spec: ./spec.md
status: example
---

# Spec-Test — Enterprise SSO Login（示例）

## 0. Coverage Matrix

| Requirement | Spec | Test | Level | Status |
|---|---|---|---|---|
| REQ-R000-001 | SPEC-R000-F01-001 | TEST-R000-F01-001 | Integration | DONE |
| REQ-R000-002 | SPEC-R000-F01-002 | TEST-R000-F01-002 | Integration | DONE |
| REQ-R000-002 | SPEC-R000-F02-001 | TEST-R000-F02-001 | Unit | DONE |

---

# F01 — SSO 登录

## TEST-R000-F01-001 Happy Path — 完整 SSO 登录

Covers:
- REQ-R000-001
- SPEC-R000-F01-001
- AC-R000-001

Level:
- Integration

Given:
- 用户处于未认证状态
- 已配置企业 IdP 端点

When:
- 用户点击「企业 SSO 登录」
- 完成 IdP 认证并携带有效 code 回调

Then:
- 系统签发会话
- 用户进入默认授权子系统
- 审计日志存在登录成功事件

## TEST-R000-F01-002 Negative Path — 非法 state 拒绝登录

Covers:
- INV-R000-001
- SPEC-R000-F01-002
- AC-R000-002

Given:
- 回调携带的 state 与已签发的不匹配

When:
- 系统处理回调

Then:
- 操作必须失败
- 系统状态不得错误修改（不签发会话）
- 不得产生非法 side effect
- 审计日志存在登录失败事件

## TEST-R000-F01-003 Permission / Security — 回调 CSRF 防护

Covers:
- SPEC-R000-F01-002

Given:
- 攻击者伪造回调链接（无对应 state）

When:
- 系统处理回调

Then:
- 登录失败
- 不泄露任何用户信息

## TEST-R000-F01-004 Concurrency / Idempotency — state 单次消费

Covers:
- BR-R000-001
- SPEC-R000-F01-002

Given:
- 同一 state 已被成功消费过一次

When:
- 同一 state 再次用于回调

Then:
- 第二次回调被拒绝，不签发新会话

---

# F02 — 会话管理

## TEST-R000-F02-001 会话刷新与轮换

Covers:
- SPEC-R000-F02-001

Level:
- Unit

Given:
- 存在一个已签发的会话

When:
- 使用刷新令牌刷新

Then:
- 返回新访问令牌
- 旧访问令牌失效
- 重复使用旧刷新令牌被拒绝

---

## QA Checklist

- [x] Happy Path
- [x] Negative Path
- [x] Error / Empty State
- [x] Permission Boundary
- [ ] Cross-Tenant（如适用）
- [x] Retry / Duplicate
- [ ] Refresh / Re-entry
- [ ] Failure Recovery
- [x] Audit / Observability

## Exit Criteria

- [x] 所有 P0/P1 REQ 有 Test 覆盖
- [x] 所有关键 INV 有验证
- [x] 必测项通过
- [ ] 无阻塞级缺陷
- [ ] Spec 与实际行为一致
