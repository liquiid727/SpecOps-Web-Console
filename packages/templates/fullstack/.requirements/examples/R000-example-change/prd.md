---
id: R000
title: Department Restriction（变更示例）
type: change
version: 1.0.0
status: accepted
priority: P1
owner: product-architect-agent
created_at: 2026-08-13
updated_at: 2026-08-13
affects:
  - R001
---

# PRD — Department Restriction（变更示例）

> 这是一个 v2 Delta Workspace 示例。变更不重写被影响需求；通过 affects 指向
> R001，并由 S01 的 Change Delta 明确增加、修改、删除和保持不变的行为。

## 1. Background

登录后用户能进入所有授权子系统，但企业安全策略要求：用户只能访问自己所在部门的子系统。

## 2. Goals

- G-R000-001: 登录签发会话时，根据用户所属部门过滤授权子系统清单。

## 3. Non-Goals

- NG-R000-001: 不改变 SSO 认证流程本身。
- NG-R000-002: 不改变会话签发与刷新的基本机制。

## 4. Actors

### ACT-R000-001 企业用户

允许：
- 查看自己部门内的子系统。

禁止：
- 查看其他部门的子系统。

## 5. Scope

### In Scope
- 在会话签发前按部门过滤授权子系统清单。
- 对无部门归属用户返回空清单。

### Out of Scope
- 修改 SSO redirect、state 校验和授权码消费。
- 修改会话令牌轮换。
- 新建部门目录同步能力。

## 6. User / Business Flow

### FLOW-R000-001 部门过滤会话签发

    企业用户完成 SSO 认证
      ↓
    系统解析部门归属
      ↓
    系统计算角色授权 ∩ 部门授权
      ↓
    签发会话与过滤后的子系统清单

## 7. Functional Requirements

### REQ-R000-001 按部门过滤授权子系统

System MUST 在签发会话时，将授权子系统清单限制为用户所属部门可访问的子系统。

## 8. Business Rules

- BR-R000-001: 部门无任何可访问子系统时，会话仍可签发，但清单为空。

## 9. Lifecycle / State Expectations

- 复用既有 SESSION_ISSUED 生命周期；本次不引入新状态。

## 10. Edge Cases

| ID | Case | Expected Behavior |
|---|---|---|
| EDGE-R000-001 | 用户没有部门归属 | 视为无部门授权，清单为空 |

## 11. Invariants / Forbidden Behavior

- INV-R000-001: 本次变更 MUST NOT 改变 SSO 认证流程与 state/授权码校验逻辑。
- INV-R000-002: 本次变更 MUST NOT 改变会话刷新令牌轮换机制。
- INV-R000-003: 本次变更 MUST NOT 改变 Identity 唯一性和登录/会话审计行为。

## 12. Acceptance Criteria

- AC-R000-001: Given 用户属于 A 部门，When 签发会话，Then 授权清单仅含 A 部门子系统。
- AC-R000-002: Given 用户无部门归属，When 签发会话，Then 会话可签发且授权清单为空。

## 13. Spec Package Decomposition

### S01 部门过滤

Covers:
- REQ-R000-001

Business Outcome:
- 用户只能看见角色和部门共同授权的子系统，且认证与令牌机制不回归。

Path:
- ./specs/S01-department-filter/

## 14. Open Questions

- Q-R000-001: 部门信息从哪个权威源读取？

> 示例假定权威源已由运行环境提供；生产包必须在实施前解析该问题。
