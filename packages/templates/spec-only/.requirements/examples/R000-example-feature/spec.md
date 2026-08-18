---
requirement: R000
source_prd: ./prd.md
status: example
---

# Spec — Enterprise SSO Login（示例）

## 0. Traceability

| Feature | PRD Requirements | Spec IDs |
|---|---|---|
| F01 | REQ-R000-001, REQ-R000-002 | SPEC-R000-F01-001, SPEC-R000-F01-002 |
| F02 | REQ-R000-002 | SPEC-R000-F02-001 |

---

# F01 — SSO 登录

## SPEC-R000-F01-001 发起登录（redirect to IdP）

Implements:
- REQ-R000-001

### Preconditions
- 用户未认证（ANONYMOUS）
- IdP 授权端点与回调地址已在配置中声明

### Scenario

Given:
- 用户处于 ANONYMOUS 状态

When:
- 用户点击「企业 SSO 登录」

Then:
- 系统生成一次性 state 并持久化
- 系统重定向到 IdP 授权端点（携带 state 与 client_id）
- 用户状态变为 REDIRECTING_TO_IDP

### Authorization
- 公开端点，无需会话；不得泄露任何用户信息

### State / Transition
- ANONYMOUS → REDIRECTING_TO_IDP

### Data Semantics
- state: 一次性、加密随机、有效期 10 分钟、与当前会话绑定

### Error Semantics
- IdP 不可达：返回可重试错误页，状态回到 ANONYMOUS

### Idempotency / Concurrency
- 连续点击只生成一个有效 state；旧 state 失效

### Side Effects
- audit: 记录 REDIRECTING_TO_IDP 事件

### Observability
- log: 登录发起日志（含 state 指纹）
- metric: login_redirect_total

### Acceptance Mapping
- AC-R000-001

---

## SPEC-R000-F01-002 处理回调（exchange & session）

Implements:
- REQ-R000-002

### Preconditions
- 回调携带 code、state 参数
- 存在一个未消费的对应 state

### Scenario

Given:
- 用户从 IdP 被重定向回回调地址

When:
- 系统校验 state 匹配且未消费
- 系统用授权码换取用户信息

Then:
- 校验通过则签发会话并跳转到默认子系统
- 校验失败则记录审计并拒绝登录

### Authorization
- 回调端点必须校验 state，防止 CSRF 登录注入

### State / Transition
- CALLBACK_RECEIVED → SESSION_ISSUED | AUTH_FAILED

### Data Semantics
- 授权码: 一次性，5 分钟内消费；用户信息映射到内部 Identity

### Error Semantics
- state 不匹配 / 授权码过期 / IdP 返回错误：登录失败，不签发会话，返回可重试错误

### Idempotency / Concurrency
- 同一 state 只可消费一次；并发回调以首次消费为准

### Side Effects
- audit: 登录成功/失败审计事件
- event: identity.login.succeeded | identity.login.failed

### Observability
- log: 回调处理日志（含 state 指纹、失败原因）
- metric: login_callback_total{result=success|failure}

### Acceptance Mapping
- AC-R000-001
- AC-R000-002

---

# F02 — 会话管理

## SPEC-R000-F02-001 会话签发与刷新

Implements:
- REQ-R000-002

### Preconditions
- 用户已通过 F01 认证

### Scenario

Given:
- 用户完成 SSO 认证

When:
- 系统签发会话

Then:
- 会话可刷新，刷新令牌过期时间 > 访问令牌
- 授权子系统清单随会话返回

### Authorization
- 刷新令牌必须绑定设备/会话指纹

### State / Transition
- SESSION_ISSUED → ACTIVE → REFRESHED → EXPIRED

### Data Semantics
- 访问令牌: 短时（如 15 分钟）；刷新令牌: 长时（如 7 天）

### Error Semantics
- 刷新令牌被复用：作废该会话并审计

### Idempotency / Concurrency
- 并发刷新以最新签发为准，旧令牌轮换失效

### Side Effects
- audit: 会话刷新事件

### Observability
- metric: session_active_total, token_refresh_total

### Acceptance Mapping
- AC-R000-001

---

# Change Delta

> 示例包为 type=feature，无 Delta。Delta 见 `../R000-example-change/`。
