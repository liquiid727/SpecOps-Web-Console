---
requirement: R000
spec_package: S01
spec_id: SPEC-R000-S01
title: 部门过滤
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: accepted
owner: implementation-agent
---

# Spec Package S01 — 部门过滤

## 0. Traceability

| PRD Requirement | Contract Behavior |
|---|---|
| REQ-R000-001 | SPEC-R000-S01-001 |

## SPEC-R000-S01-001 会话授权清单按部门过滤

Implements:
- REQ-R000-001

### Preconditions
- 用户已完成 SSO 认证。
- 用户身份可解析出部门归属或明确为无归属。

### Scenario

Given:
- 用户属于 A 部门。
- 子系统 X 授权 A 部门，子系统 Y 授权 B 部门。

When:
- 系统签发会话。

Then:
- 授权子系统清单等于用户角色授权与 A 部门授权的交集。
- 其他部门子系统不出现。

### Authorization
- 部门归属来自权威源并在服务端校验，客户端不可篡改。

### State / Transition
- 无新状态；复用 SESSION_ISSUED 流程。

### Data Semantics
- 部门授权映射：子系统到部门白名单。

### Error Semantics
- 部门源不可用时会话签发失败，不降级为放行。

### Idempotency / Concurrency
- 过滤为纯函数，无副作用。

### Side Effects
- audit: 记录会话授权清单来源和部门过滤标记。

### Observability
- log: 会话签发日志含部门过滤结果。
- metric: session_issued_total{dept_filtered=true|false}。

### Acceptance Mapping
- AC-R000-001
- AC-R000-002

## Change Delta

### Added
- SPEC-R000-S01-001：会话授权清单按部门过滤。

### Modified
- 会话签发在返回授权清单前增加部门过滤步骤。

### Removed
- 无。

### Unchanged Guarantees
- SSO redirect、state 校验和授权码消费 MUST NOT 改变。
- 会话签发与刷新令牌轮换机制 MUST NOT 改变。
- Identity 唯一性规则 MUST NOT 改变。
- 登录和会话审计行为 MUST NOT 消失。
