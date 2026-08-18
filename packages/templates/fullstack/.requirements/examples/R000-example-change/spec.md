---
requirement: R000
source_prd: ./prd.md
status: example
---

# Spec — Department Restriction（变更示例）

> 变更不重写被影响需求（R001）的旧 Spec。本 Spec 只表达本次变更的 Delta，并显式声明 Unchanged Guarantees。

## 0. Traceability

| Feature | PRD Requirements | Spec IDs |
|---|---|---|
| F01 | REQ-R000-001 | SPEC-R000-F01-001 |

---

# F01 — 部门过滤

## SPEC-R000-F01-001 会话授权清单按部门过滤

Implements:
- REQ-R000-001

### Preconditions
- 用户已完成 SSO 认证
- 用户身份可解析出部门归属

### Scenario

Given:
- 用户属于 A 部门

When:
- 系统签发会话

Then:
- 授权子系统清单 = 用户角色授权 ∩ A 部门授权
- 其他部门子系统不出现

### Authorization
- 部门归属必须来自权威源，服务端校验，客户端不可篡改

### State / Transition
- 无新状态；复用 SESSION_ISSUED 流程

### Data Semantics
- 部门授权映射: 子系统 → 部门白名单

### Error Semantics
- 部门源不可用：会话签发失败，不降级为放行

### Idempotency / Concurrency
- 过滤为纯函数，无副作用

### Side Effects
- audit: 记录会话授权清单来源（含部门过滤标记）

### Observability
- log: 会话签发日志含部门过滤结果
- metric: session_issued_total{dept_filtered=true|false}

### Acceptance Mapping
- AC-R000-001

---

# Change Delta

## Added
- SPEC-R000-F01-001：授权子系统清单按部门过滤的行为。

## Modified
- 会话签发流程在返回授权清单前增加部门过滤步骤。

## Removed
- 无。

## Unchanged Guarantees

本次 Change MUST NOT 改变：
- SSO 认证流程（redirect、state 校验、授权码消费）。
- 会话签发与刷新令牌轮换机制。
- Identity 唯一性规则。
- 审计日志行为。
