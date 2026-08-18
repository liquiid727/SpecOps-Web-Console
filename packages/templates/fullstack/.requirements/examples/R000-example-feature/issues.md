---
requirement: R000
source_prd: ./prd.md
source_spec: ./spec.md
source_test: ./test.md
status: example
---

# Issues — Enterprise SSO Login（示例）

## Summary

| Issue | Goal | Covers | Status |
|---|---|---|---|
| ISSUE-R000-001 | 实现 SSO 登录发起与回调处理 | SPEC-R000-F01-001, SPEC-R000-F01-002 | DONE |
| ISSUE-R000-002 | 实现会话签发与刷新 | SPEC-R000-F02-001 | DONE |

---

## ISSUE-R000-001 — SSO 登录发起与回调

Status: DONE
Priority: P1

Covers:
- REQ-R000-001
- REQ-R000-002
- SPEC-R000-F01-001
- SPEC-R000-F01-002
- TEST-R000-F01-001
- TEST-R000-F01-002

### Goal

完成后，用户可以从平台跳转企业 IdP 认证，并在回调校验通过后获得会话。

### Scope

Must:
- 实现登录入口（redirect 到 IdP，携带一次性 state）
- 实现回调端点（校验 state、换取用户信息、签发会话）
- 记录登录成功/失败审计日志

Must Not:
- 不修改无关 Feature。
- 不重新定义 PRD / Spec。
- 不通过弱化测试绕过 Spec。
- 不进行无关重构。

### Implementation Context

Agent 执行前 MUST：

1. 读取 `prd.md`
2. 读取关联 `spec.md`
3. 读取关联 `test.md`
4. 查询真实 Codebase / Wiki / Architecture
5. 查询 Existing Tests

### Tasks

- [x] 新增登录入口路由（state 生成 + 重定向）
- [x] 新增回调路由（state 校验 + 授权码消费）
- [x] 会话签发与审计日志

### Validation

- [x] TEST-R000-F01-001
- [x] TEST-R000-F01-002
- [ ] Existing regression tests
- [x] No unexplained spec deviation

### Dependencies

Depends On:
- None

Blocks:
- ISSUE-R000-002

### Completion Record

Status: DONE
Implemented By: implementation-agent
Completed At: 2026-08-13
PR / Commit: example/1234abcd
Changed Files: src/auth/login.ts, src/auth/callback.ts
Tests Executed: TEST-R000-F01-001, TEST-R000-F01-002
Spec Deviation: None

---

## ISSUE-R000-002 — 会话签发与刷新

Status: DONE
Priority: P1

Covers:
- REQ-R000-002
- SPEC-R000-F02-001
- TEST-R000-F02-001

### Goal

完成后，登录用户持有可刷新的会话，刷新令牌轮换时旧令牌失效。

### Scope

Must:
- 签发访问令牌 + 刷新令牌
- 刷新端点轮换令牌
- 复用旧刷新令牌时作废会话

Must Not:
- 不修改无关 Feature。
- 不重新定义 PRD / Spec。
- 不通过弱化测试绕过 Spec。
- 不进行无关重构。

### Implementation Context

Agent 执行前 MUST：

1. 读取 `prd.md`
2. 读取关联 `spec.md`
3. 读取关联 `test.md`
4. 查询真实 Codebase / Wiki / Architecture
5. 查询 Existing Tests

### Tasks

- [x] 令牌签发与存储
- [x] 刷新端点与轮换
- [x] 复用检测与会话作废

### Validation

- [x] TEST-R000-F02-001
- [ ] Existing regression tests
- [x] No unexplained spec deviation

### Dependencies

Depends On:
- ISSUE-R000-001

Blocks:
- None

### Completion Record

Status: DONE
Implemented By: implementation-agent
Completed At: 2026-08-13
PR / Commit: example/2345bcde
Changed Files: src/auth/session.ts, src/auth/refresh.ts
Tests Executed: TEST-R000-F02-001
Spec Deviation: None
