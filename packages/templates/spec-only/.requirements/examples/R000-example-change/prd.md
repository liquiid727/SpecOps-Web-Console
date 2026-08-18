---
id: R000
title: Department Restriction（变更示例）
type: change # 示例包，展示 Change/Delta 管理
status: example # draft | review | approved | implementing | done | example
priority: P1
owner: spec-editor
created_at: 2026-08-13
updated_at: 2026-08-13
affects:
  - R001
---

# PRD — Department Restriction（变更示例）

> 本目录是 `.requirements/examples/` 下的变更示例包。变更不改写旧 Spec，而是新建一个 `type: change` 的需求包，通过 `affects: [R001]` 指向被影响的需求，Spec 内用 `# Change Delta` 表达四种变化。

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
- 查看自己部门内的子系统

禁止：
- 查看其他部门的子系统

## 7. Functional Requirements

### REQ-R000-001 按部门过滤授权子系统

System MUST 在签发会话时，将授权子系统清单限制为用户所属部门可访问的子系统。

Actor:
- 企业用户

Trigger:
- 用户完成 SSO 认证

Expected:
- 授权清单 = 用户角色授权 ∩ 用户部门授权

Observable Result:
- 会话中的子系统清单不包含其他部门条目

## 8. Business Rules

- BR-R000-001: 部门无任何可访问子系统时，会话仍可签发，但清单为空。

## 10. Edge Cases

| ID | Case | Expected Behavior |
|---|---|---|
| EDGE-R000-001 | 用户没有部门归属 | 视为无部门授权，清单为空 |

## 11. Invariants / Forbidden Behavior

- INV-R000-001: 本次变更 MUST NOT 改变 SSO 认证流程与 state/授权码校验逻辑。

## 12. Acceptance Criteria

- AC-R000-001: Given 用户属于 A 部门，When 签发会话，Then 授权清单仅含 A 部门子系统。

## 14. Open Questions

- Q-R000-001: 部门信息从哪个权威源读取？
