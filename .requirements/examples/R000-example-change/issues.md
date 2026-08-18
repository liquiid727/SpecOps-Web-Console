---
requirement: R000
source_prd: ./prd.md
source_spec: ./spec.md
source_test: ./test.md
status: example
---

# Issues — Department Restriction（变更示例）

## Summary

| Issue | Goal | Covers | Status |
|---|---|---|---|
| ISSUE-R000-001 | 在会话签发时接入部门过滤 | SPEC-R000-F01-001 | DONE |

---

## ISSUE-R000-001 — 会话授权清单部门过滤

Status: DONE
Priority: P1

Covers:
- REQ-R000-001
- SPEC-R000-F01-001
- TEST-R000-F01-001
- TEST-R000-F01-002

### Goal

完成后，签发会话时授权子系统清单按用户部门过滤，且不改变既有认证流程。

### Scope

Must:
- 读取用户部门归属（权威源）
- 在会话签发时计算 角色授权 ∩ 部门授权
- 保持 SSO 认证、会话轮换逻辑不变

Must Not:
- 不修改无关 Feature。
- 不重新定义 PRD / Spec。
- 不通过弱化测试绕过 Spec。
- 不进行无关重构。
- 不重写 R001 的既有认证 Spec。

### Implementation Context

Agent 执行前 MUST：

1. 读取 `prd.md`
2. 读取关联 `spec.md`
3. 读取关联 `test.md`
4. 查询真实 Codebase / Wiki / Architecture
5. 查询 Existing Tests（尤其 R001 认证回归套件）

### Tasks

- [x] 接入部门归属解析
- [x] 会话授权清单增加部门过滤
- [x] 补充审计与日志标记

### Validation

- [x] TEST-R000-F01-001
- [x] TEST-R000-F01-002（回归）
- [x] Existing regression tests
- [x] No unexplained spec deviation

### Dependencies

Depends On:
- None

Blocks:
- None

### Completion Record

Status: DONE
Implemented By: implementation-agent
Completed At: 2026-08-13
PR / Commit: example/3456cdef
Changed Files: src/auth/session.ts, src/auth/dept.ts
Tests Executed: TEST-R000-F01-001, TEST-R000-F01-002
Spec Deviation: None
