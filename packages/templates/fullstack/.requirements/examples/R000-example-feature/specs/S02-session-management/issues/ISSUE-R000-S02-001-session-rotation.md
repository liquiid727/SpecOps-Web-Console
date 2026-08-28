---
id: ISSUE-R000-S02-001
requirement: R000
spec_package: S02
kind: implementation
track: implementation
primary_spec: SPEC-R000-S02-001
source_spec_version: 1.0.0
source_spec_hash: example-sha256-r000-s02
status: done
priority: P1
owner: implementation-agent
depends_on:
  - ISSUE-R000-S01-001
---

# ISSUE-R000-S02-001 — 会话签发与刷新

## Covers

- REQ-R000-002
- SPEC-R000-S02-001
- TEST-R000-S02-001

## Goal

让登录用户获得可刷新的会话，并在刷新令牌轮换后使旧令牌失效。

## Scope

Must:
- 签发访问令牌和刷新令牌。
- 实现刷新与轮换。
- 检测旧刷新令牌复用并作废会话。

Must Not:
- 修改 S01 的认证与回调规则。
- 重新定义 PRD 或 Spec。
- 通过弱化测试绕过 Spec。

## Tasks

- [x] 令牌签发与存储。
- [x] 刷新端点与令牌轮换。
- [x] 复用检测与会话作废。

## Validation

- [x] TEST-R000-S02-001
- [x] Existing regression tests
- [x] No unexplained spec deviation

## Dependencies

Depends On:
- ISSUE-R000-S01-001

Blocks:
- None

## Completion Record

Status: done
Implemented By: implementation-agent
Completed At: 2026-08-13
PR / Commit: example/2345bcde
Changed Files: src/auth/session.ts, src/auth/refresh.ts
Tests Executed: TEST-R000-S02-001
Evidence References: ../evidence/README.md
Spec Deviation: None
