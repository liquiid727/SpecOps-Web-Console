---
id: ISSUE-R000-S01-001
requirement: R000
spec_package: S01
kind: implementation
track: implementation
primary_spec: SPEC-R000-S01-001
source_spec_version: 1.0.0
source_spec_hash: example-sha256-r000-change-s01
status: done
priority: P1
owner: implementation-agent
depends_on: []
---

# ISSUE-R000-S01-001 — 会话授权清单部门过滤

## Covers

- REQ-R000-001
- SPEC-R000-S01-001
- TEST-R000-S01-001
- TEST-R000-S01-002
- TEST-R000-S01-003

## Goal

在签发会话时按用户部门过滤授权子系统清单，且不改变既有认证和令牌行为。

## Scope

Must:
- 从权威源读取用户部门归属。
- 在会话签发前计算角色授权与部门授权的交集。
- 无部门归属时签发空清单会话。
- 覆盖 Unchanged Guarantees 的回归验证。

Must Not:
- 修改 SSO redirect、state 校验或授权码消费。
- 修改刷新令牌轮换。
- 重新定义 PRD 或 Delta Spec。

## Tasks

- [x] 接入部门归属读取与授权映射。
- [x] 在会话签发前应用部门过滤。
- [x] 覆盖无部门与既有认证/令牌回归测试。
- [x] 记录授权来源审计信息。

## Validation

- [x] TEST-R000-S01-001
- [x] TEST-R000-S01-002
- [x] TEST-R000-S01-003
- [x] Existing regression tests
- [x] No unexplained spec deviation

## Dependencies

Depends On:
- None

Blocks:
- None

## Completion Record

Status: DONE
Implemented By: implementation-agent
Completed At: 2026-08-13
PR / Commit: example/3456cdef
Changed Files: src/auth/authorization.ts, src/auth/session.ts
Tests Executed: TEST-R000-S01-001 through TEST-R000-S01-003
Evidence References: ../evidence/README.md
Spec Deviation: None
