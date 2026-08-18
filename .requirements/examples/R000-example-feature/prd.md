---
id: R000
title: Enterprise SSO Login（示例）
type: feature # 示例包，展示完整 feature 链路
status: example # draft | review | approved | implementing | done | example
priority: P1
owner: spec-editor
created_at: 2026-08-13
updated_at: 2026-08-13
affects: []
---

# PRD — Enterprise SSO Login（示例）

> 本目录是 `.requirements/examples/` 下的示例包，使用 `R000-` 前缀避免与真实需求编号混淆。ID 链为 R000 → REQ → SPEC → TEST → ISSUE。

## 1. Background

企业用户希望用统一的 SSO 身份登录平台，而不是为每个子系统单独注册账号。当前每个子系统各自维护账号体系，导致账号泛滥和权限难以统一管理。

## 2. Goals

- G-R000-001: 用户可以通过企业 SSO 一次登录，进入所有授权子系统。
- G-R000-002: 登录后获得可刷新的会话，避免频繁重新认证。

## 3. Non-Goals

- NG-R000-001: 不在本需求中实现企业内用户目录的实时同步。
- NG-R000-002: 不实现自有账号体系的注册/找回密码。

## 4. Actors

### ACT-R000-001 企业用户

允许：
- 发起 SSO 登录
- 查看自己已授权的子系统

禁止：
- 绕过 SSO 直接获得会话
- 访问未授权的子系统

## 5. Scope

### In Scope
- SSO 登录入口与回调
- 会话签发与刷新
- 授权子系统清单

### Out of Scope
- 用户目录同步
- 单点登出（SSO Logout）联盟协议细节

## 6. User / Business Flow

### FLOW-R000-001 SSO 登录

```text
企业用户
  ↓
点击「企业 SSO 登录」
  ↓
跳转企业 IdP 完成认证
  ↓
回调携带授权码
  ↓
系统换取令牌并签发会话
  ↓
进入授权子系统
```

## 7. Functional Requirements

### REQ-R000-001 发起 SSO 登录

System MUST 提供一个登录入口，将未认证用户重定向到企业 IdP，并携带可验证的 state 参数。

Actor:
- 企业用户

Trigger:
- 用户点击「企业 SSO 登录」

Expected:
- 生成一次性 state，重定向到 IdP 授权端点

Observable Result:
- 浏览器跳转到企业 IdP

### REQ-R000-002 处理回调并签发会话

System MUST 在校验授权码与 state 通过后，签发会话并跳转到用户授权的默认子系统。

Actor:
- 企业用户

Trigger:
- IdP 重定向回回调地址

Expected:
- 校验 state 与授权码，换取用户信息，签发会话

Observable Result:
- 用户已登录，可访问授权子系统

## 8. Business Rules

- BR-R000-001: 每个 state 参数只允许使用一次。
- BR-R000-002: 授权码必须在 5 分钟内消费，过期视为失败。

## 9. Lifecycle / State Expectations

```text
ANONYMOUS
├── REDIRECTING_TO_IDP
├── CALLBACK_RECEIVED
├── SESSION_ISSUED
└── AUTH_FAILED
```

## 10. Edge Cases

| ID | Case | Expected Behavior |
|---|---|---|
| EDGE-R000-001 | state 不匹配 | 拒绝回调，不签发会话 |
| EDGE-R000-002 | 授权码已过期 | 返回可重试错误，不签发会话 |
| EDGE-R000-003 | 用户未被授权任何子系统 | 登录成功但展示空授权清单 |

## 11. Invariants / Forbidden Behavior

- INV-R000-001: System MUST NOT 在 state 校验失败时签发会话。
- INV-R000-002: System MUST 记录每一次登录成功/失败的审计日志。

## 12. Acceptance Criteria

- AC-R000-001: Given 未认证用户点击「企业 SSO 登录」，When 完成 IdP 认证，Then 系统签发会话并进入授权子系统。
- AC-R000-002: Given 回调携带非法 state，When 系统处理回调，Then 登录失败且不产生任何会话。

## 13. Feature Decomposition

### F01 SSO 登录

Covers:
- REQ-R000-001
- REQ-R000-002

Business Outcome:
- 用户可以通过企业 IdP 完成认证并回到平台

### F02 会话管理

Covers:
- REQ-R000-002

Business Outcome:
- 登录后获得可刷新的会话，支持授权子系统清单展示

## 14. Open Questions

- Q-R000-001: 会话有效期是否按子系统差异化配置？

> Open Question 未确认前，Agent MUST NOT 自行作为已确认需求实现。
