---
requirement: R000
spec_package: S01
test_spec_id: TEST-R000-S01
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_version: 1.0.0
source_spec_hash: example-sha256-r000-s01
version: 1.0.0
status: approved
owner: testing-agent
---

# Test Design — S01 SSO 登录

## 0. Coverage Matrix

| Requirement | Spec | Test | Level | Planned Evidence |
|---|---|---|---|---|
| REQ-R000-001 | SPEC-R000-S01-001 | TEST-R000-S01-001 | Integration | trace + normalized result |
| REQ-R000-002 | SPEC-R000-S01-002 | TEST-R000-S01-002 | Integration | trace + normalized result |
| INV-R000-001 | SPEC-R000-S01-002 | TEST-R000-S01-003 | Security regression | trace + audit log |
| BR-R000-001 | SPEC-R000-S01-002 | TEST-R000-S01-004 | Concurrency | result report |
| INV-R000-002 | SPEC-R000-S01-001, SPEC-R000-S01-002 | TEST-R000-S01-005 | Audit regression | audit log |
| EDGE-R000-002 | SPEC-R000-S01-002 | TEST-R000-S01-006 | Negative | normalized result |
| EDGE-R000-003 | SPEC-R000-S01-002 | TEST-R000-S01-007 | Empty state | trace + screenshot |

## TEST-R000-S01-001 Happy Path — 完整 SSO 登录

Covers:
- REQ-R000-001
- SPEC-R000-S01-001
- AC-R000-001

Given:
- 用户未认证，企业 IdP 已配置。

When:
- 用户发起登录并完成 IdP 认证。

Then:
- 系统签发会话并进入默认授权子系统。
- 审计日志存在登录成功事件。

## TEST-R000-S01-002 Negative Path — 非法 state 拒绝登录

Covers:
- REQ-R000-002
- SPEC-R000-S01-002
- INV-R000-001
- AC-R000-002

Given:
- 回调 state 与已签发的 state 不匹配。

When:
- 系统处理回调。

Then:
- 登录失败且不签发会话。
- 审计日志记录失败事件。

## TEST-R000-S01-003 Permission / Security — 回调 CSRF 防护

Covers:
- SPEC-R000-S01-002

Given:
- 攻击者伪造没有对应 state 的回调链接。

When:
- 系统处理回调。

Then:
- 登录失败且不泄露用户信息。

## TEST-R000-S01-004 Concurrency / Idempotency — state 单次消费

Covers:
- BR-R000-001
- SPEC-R000-S01-002

Given:
- 同一 state 已被成功消费。

When:
- 同一 state 再次或并发用于回调。

Then:
- 除首次外的回调被拒绝，不签发新会话。

## TEST-R000-S01-005 Audit Regression — 登录审计完整

Covers:
- INV-R000-002
- SPEC-R000-S01-001
- SPEC-R000-S01-002

Given:
- 登录流程成功或失败。

When:
- 系统完成对应处理。

Then:
- 成功和失败都产生可追踪的审计事件。

## TEST-R000-S01-006 Negative Path — 授权码过期

Covers:
- EDGE-R000-002
- SPEC-R000-S01-002

Given:
- 回调携带已过期授权码。

When:
- 系统处理回调。

Then:
- 登录失败，不签发会话，并返回可重试错误。

## TEST-R000-S01-007 Empty State — 用户无授权子系统

Covers:
- EDGE-R000-003
- SPEC-R000-S01-002

Given:
- 用户认证成功但没有任何授权子系统。

When:
- 系统完成会话签发。

Then:
- 展示明确的空授权清单，不将用户误判为未认证。

## QA Exploratory Cases

- IdP 超时、取消认证与返回错误。
- 浏览器后退后重复回调。

## Exit Criteria

- [x] P1 REQ 已有测试设计。
- [x] state 失败与单次消费 Invariant 已有验证方法。
- [x] 自动化与探索性证据要求已定义。
