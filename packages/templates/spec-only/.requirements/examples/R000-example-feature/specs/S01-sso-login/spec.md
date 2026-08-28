---
requirement: R000
spec_package: S01
spec_id: SPEC-R000-S01
title: SSO 登录
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: accepted
owner: implementation-agent
---

# Spec Package S01 — SSO 登录

## 0. Traceability

| PRD Requirement | Contract Behavior |
|---|---|
| REQ-R000-001 | SPEC-R000-S01-001 |
| REQ-R000-002 | SPEC-R000-S01-002 |

## SPEC-R000-S01-001 发起登录（redirect to IdP）

Implements:
- REQ-R000-001

### Preconditions
- 用户未认证（ANONYMOUS）。
- IdP 授权端点与回调地址已配置。

### Scenario

Given:
- 用户处于 ANONYMOUS 状态。

When:
- 用户点击「企业 SSO 登录」。

Then:
- 系统生成并持久化一次性 state。
- 系统重定向到 IdP 授权端点，携带 state 与 client_id。
- 用户状态变为 REDIRECTING_TO_IDP。

### Authorization
- 公开端点，无需会话；不得泄露用户信息。

### State / Transition
- ANONYMOUS → REDIRECTING_TO_IDP

### Data Semantics
- state 一次性、加密随机、有效期 10 分钟且与当前会话绑定。

### Error Semantics
- IdP 不可达时返回可重试错误页，状态回到 ANONYMOUS。

### Idempotency / Concurrency
- 连续点击只保留一个有效 state，旧 state 失效。

### Side Effects
- audit: REDIRECTING_TO_IDP 事件。

### Observability
- log: 含 state 指纹的登录发起日志。
- metric: login_redirect_total。

### Acceptance Mapping
- AC-R000-001

## SPEC-R000-S01-002 处理回调并签发会话

Implements:
- REQ-R000-002

### Preconditions
- 回调携带 code、state 参数。
- 存在一个未消费的对应 state。

### Scenario

Given:
- 用户从 IdP 被重定向回回调地址。

When:
- 系统校验 state 匹配且未消费。
- 系统用授权码换取用户信息。

Then:
- 校验通过则签发会话并跳转到默认子系统。
- 校验失败则记录审计并拒绝登录。

### Authorization
- 回调端点必须校验 state，防止 CSRF 登录注入。

### State / Transition
- CALLBACK_RECEIVED → SESSION_ISSUED | AUTH_FAILED

### Data Semantics
- 授权码一次性且必须在 5 分钟内消费；用户信息映射为内部 Identity。

### Error Semantics
- state 不匹配、授权码过期或 IdP 返回错误：不签发会话并返回可重试错误。

### Idempotency / Concurrency
- 同一 state 只可消费一次；并发回调以首次消费为准。

### Side Effects
- audit: 登录成功/失败审计事件。
- event: identity.login.succeeded | identity.login.failed。

### Observability
- log: 含 state 指纹和失败原因的回调日志。
- metric: login_callback_total{result=success|failure}。

### Acceptance Mapping
- AC-R000-001
- AC-R000-002
