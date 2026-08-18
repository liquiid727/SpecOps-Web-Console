# Agent-Native SDLC 标准
## PRD → Spec → Spec-Test → Issues → Code/Test

> 版本：v1.0  
> 适用场景：AI Coding / Agent 驱动研发、持续需求迭代、Spec-first 开发  
> 推荐目录：`.xx/`  
> 核心原则：**一个需求一个 Requirement Package；PRD、Spec、Test、Issues 放在一起；通过稳定 ID 串联全链路。**

---

# 1. 总览

本体系用于解决以下研发问题：

- 需求不断新增和变化。
- PRD 需要足够完整，能够交给 Agent 自动拆解。
- Agent 需要生成可执行 Feature Spec。
- Spec 需要同步生成 Spec-Test / QA 验证计划。
- Spec + Test 继续拆分成可执行 Issues。
- Issues 成为实际开发与进度记录的最小单位。
- 每一个实现都能够反向追溯到原始 Requirement。
- 已有系统发生需求变化时，可以明确“新增 / 修改 / 删除 / 保持不变”的行为。
- Agent 不允许因为代码现状、实现便利或测试失败而擅自修改产品语义。

核心链路：

```text
Idea / Requirement
        ↓
      PRD
        ↓
Feature Decomposition
        ↓
      Spec
        ↓
   Spec-Test
        ↓
     Issues
        ↓
 Code / Test / PR
        ↓
 Feature Verify
```

完整追踪：

```text
R001
└── REQ-R001-001
      ↓
   SPEC-R001-F01-001
      ↓
   TEST-R001-F01-001
      ↓
   ISSUE-R001-001
      ↓
   Code / Test / PR
```

---

# 2. 设计原则

## 2.1 一个需求就是一个 Requirement Package

不要把 PRD、Spec、Test、Issue 分散到四套全局目录。

推荐：

```text
.xx/
└── requirements/
    └── R001-dingtalk-login/
        ├── prd.md
        ├── spec.md
        ├── test.md
        └── issues.md
```

这样人和 Agent 查询一个需求时，只需要进入一个目录。

---

## 2.2 Feature 是逻辑分组，不是目录分组

PRD 可能拆成多个 Feature：

```text
F01 Enterprise Login
F02 Access Request
F03 Approval
```

但不需要：

```text
specs/
├── authentication/
├── membership/
└── approval/
```

也不需要：

```text
F01/
F02/
F03/
```

而是在：

```text
spec.md
test.md
```

内部通过章节和稳定 ID 表达。

---

## 2.3 Feature Boundary ≠ Code Module Boundary

Feature 按业务行为拆，不按代码目录拆。

一个 Feature 可能影响：

```text
backend/auth/
backend/member/
frontend/pages/
infra/
```

一个代码模块也可能被多个 Feature 使用。

Feature 的拆分依据：

- 独立业务目标
- 独立 Actor
- 独立生命周期 / 状态机
- 独立授权边界
- 独立可验收结果
- 行为内聚性

---

## 2.4 每一层只增加确定性，不重复父层

```text
PRD
= 产品行为确定性

Spec
= 系统契约确定性

Spec-Test
= 可验证性确定性

Issue
= 执行范围确定性
```

---

# 3. 推荐目录结构

```text
.xx/
├── README.md
├── config.yaml
│
├── requirements/
│   ├── R001-dingtalk-login/
│   │   ├── prd.md
│   │   ├── spec.md
│   │   ├── test.md
│   │   └── issues.md
│   │
│   ├── R002-access-request/
│   │   ├── prd.md
│   │   ├── spec.md
│   │   ├── test.md
│   │   └── issues.md
│   │
│   └── R003-temporary-access/
│       ├── prd.md
│       ├── spec.md
│       ├── test.md
│       └── issues.md
│
├── templates/
│   ├── prd.md
│   ├── spec.md
│   ├── test.md
│   └── issues.md
│
└── skills/
    └── SKILL.md
```

可选：

```text
.xx/
├── index.md
├── traceability.md
└── archive/
```

只有项目复杂到需要全局索引时再增加，不建议一开始就做重。

---

# 4. ID / 序列号规范

稳定 ID 是整个体系最重要的基础设施之一。

## 4.1 Requirement Package

```text
R001
R002
R003
```

目录：

```text
R001-dingtalk-login
R002-access-request
```

规则：

- 全项目唯一。
- 一旦分配不复用。
- 删除需求后也不回收编号。

---

## 4.2 PRD Requirement

```text
REQ-R001-001
REQ-R001-002
```

格式：

```text
REQ-<R-ID>-<Sequence>
```

---

## 4.3 Business Rule

```text
BR-R001-001
```

---

## 4.4 Invariant

```text
INV-R001-001
```

用于描述任何实现都不得破坏的规则。

---

## 4.5 Acceptance Criteria

```text
AC-R001-001
```

---

## 4.6 Feature

```text
F01
F02
F03
```

Feature ID 只需要在当前 Requirement Package 内唯一。

---

## 4.7 Spec

```text
SPEC-R001-F01-001
SPEC-R001-F01-002
SPEC-R001-F02-001
```

格式：

```text
SPEC-<R-ID>-<Feature-ID>-<Sequence>
```

---

## 4.8 Test

```text
TEST-R001-F01-001
TEST-R001-F01-002
```

---

## 4.9 Issue

```text
ISSUE-R001-001
ISSUE-R001-002
```

Issue 不强制只属于一个 Feature，因为一个 Issue 可能横跨多个 Spec。

---

## 4.10 ID 稳定原则

一旦进入：

```text
approved
implementing
done
```

不得因为删除中间条目而重新编号。

例如：

```text
REQ-R001-003 被废弃
```

那么：

```text
REQ-R001-004
```

仍然保持 `004`。

ID 是永久锚点，不是排序号。

---

# 5. PRD 标准

PRD 的定位：

> 产品行为契约。

PRD 要足够完整，使 Agent 能够稳定生成 Spec，但不提前承担技术设计。

PRD 应回答：

```text
WHY
WHO
WHAT
BOUNDARY
RULE
STATE
EDGE
SUCCESS
```

PRD 不应该回答：

```text
数据库怎么建
API 路径叫什么
Repository 放哪里
Redis 怎么用
事务怎么实现
代码文件怎么拆
```

---

# 6. PRD Template

```markdown
---
id: R001
title: <Requirement Title>
type: feature # feature | change | bug | refactor
status: draft # draft | review | approved | implementing | done
priority: P1
owner: <owner>
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
affects: []
---

# PRD — <Requirement Title>

## 1. Background

为什么现在需要这个需求？
当前用户、业务或系统遇到了什么问题？

## 2. Goals

- G-R001-001: ...
- G-R001-002: ...

## 3. Non-Goals

- NG-R001-001: ...

## 4. Actors

### ACT-R001-001 <Actor>

允许：
- ...

禁止：
- ...

## 5. Scope

### In Scope
- ...

### Out of Scope
- ...

## 6. User / Business Flow

### FLOW-R001-001 <Flow Name>

```text
Actor
  ↓
Action
  ↓
System Behavior
  ↓
Outcome
```

## 7. Functional Requirements

### REQ-R001-001 <Requirement Name>

System MUST ...

Actor:
- ...

Trigger:
- ...

Expected:
- ...

Observable Result:
- ...

### REQ-R001-002 <Requirement Name>

...

## 8. Business Rules

- BR-R001-001: ...
- BR-R001-002: ...

## 9. Lifecycle / State Expectations

如适用：

```text
PENDING
├── APPROVED
├── REJECTED
└── CANCELLED
```

## 10. Edge Cases

| ID | Case | Expected Behavior |
|---|---|---|
| EDGE-R001-001 | ... | ... |

## 11. Invariants / Forbidden Behavior

- INV-R001-001: System MUST NOT ...
- INV-R001-002: System MUST ...

## 12. Acceptance Criteria

- AC-R001-001: Given ..., When ..., Then ...
- AC-R001-002: Given ..., When ..., Then ...

## 13. Feature Decomposition

### F01 <Feature Name>

Covers:
- REQ-R001-001
- REQ-R001-002

Business Outcome:
- ...

### F02 <Feature Name>

Covers:
- REQ-R001-003

Business Outcome:
- ...

## 14. Open Questions

- Q-R001-001: ...

> Open Question 未确认前，Agent MUST NOT 自行作为已确认需求实现。
```

---

# 7. PRD 的 Feature Decomposition 标准

Agent 从 PRD 拆 Feature 时，不按代码模块拆。

推荐算法：

```text
1. Extract Requirements
2. Extract Actors
3. Extract User Journeys
4. Extract Business Objects / Lifecycles
5. Extract Authorization Boundaries
6. Cluster Requirements by business outcome
7. Merge behaviors sharing one goal/lifecycle
8. Split behaviors with independent actor/state/acceptance boundary
9. Produce Feature Dependency
10. Verify every REQ belongs to >= 1 Feature
11. Verify no Feature exists without REQ
```

一个 Feature 应满足大部分条件：

- 有独立业务目标。
- 有明确 Trigger → Outcome。
- 有相对内聚的行为。
- 有独立状态或权限边界。
- QA 可以独立判断 Done。

不应该成为 Feature：

```text
生成 OAuth State
创建 Repository
新增数据库字段
写一个 Handler
```

这些属于 Spec 或 Issue。

---

# 8. Spec 标准

Spec 的定位：

> 把 PRD 的产品行为转换成可执行的系统契约。

Spec 可以进入：

- Preconditions
- Given / When / Then
- State Transition
- Data Semantics
- API Contract
- Error Semantics
- Authorization
- Idempotency
- Concurrency
- Side Effects
- Observability
- Migration / Compatibility

但 Spec 不允许重新发明产品规则。

---

# 9. Spec Template

```markdown
---
requirement: R001
source_prd: ./prd.md
status: draft
---

# Spec — <Requirement Title>

## 0. Traceability

| Feature | PRD Requirements | Spec IDs |
|---|---|---|
| F01 | REQ-R001-001, REQ-R001-002 | SPEC-R001-F01-001 ... |
| F02 | REQ-R001-003 | SPEC-R001-F02-001 ... |

---

# F01 — <Feature Name>

## SPEC-R001-F01-001 <Behavior Name>

Implements:
- REQ-R001-001

### Preconditions
- ...

### Scenario

Given:
- ...

When:
- ...

Then:
- ...

### Authorization
- ...

### State / Transition
- ...

### Data Semantics
- ...

### Error Semantics
- ...

### Idempotency / Concurrency
- N/A | ...

### Side Effects
- audit:
- event:
- notification:

### Observability
- log:
- metric:
- trace:

### Acceptance Mapping
- AC-R001-001

---

## SPEC-R001-F01-002 <Behavior Name>

...

---

# F02 — <Feature Name>

## SPEC-R001-F02-001 <Behavior Name>

...

---

# Change Delta

> 仅 type=change 时使用。

## Added
- ...

## Modified
- ...

## Removed
- ...

## Unchanged Guarantees
- 本次 Change MUST NOT 改变 ...
```

---

# 10. Change / Delta-Spec 标准

已有系统发生需求变化时，不重新重写旧 Spec。

仍然新建 Requirement Package：

```text
R027-dingtalk-department-restriction/
├── prd.md
├── spec.md
├── test.md
└── issues.md
```

PRD：

```yaml
id: R027
type: change
affects:
  - R001
```

Spec 必须明确四种变化：

```text
Added
Modified
Removed
Unchanged Guarantees
```

其中：

```text
Unchanged Guarantees
```

尤其重要。

它用于明确告诉 Agent：

> 这次只改这些行为，其他行为不得顺手改掉。

例如：

```text
本次 Change MUST NOT 改变：
- OAuth 原有登录流程
- Corp 校验
- Identity 唯一性规则
- Audit 行为
```

---

# 11. Spec-Test 标准

Spec-Test 的定位：

> 证明 Spec 是正确实现的。

Spec-Test 应独立于具体实现生成。

必须覆盖：

- Happy Path
- Negative Path
- Authorization
- State Transition
- Invariant
- Retry / Duplicate
- Idempotency / Concurrency（如适用）
- External Failure（如适用）
- Audit / Observability（关键行为）
- QA Exploratory Cases

---

# 12. Spec-Test Template

```markdown
---
requirement: R001
source_prd: ./prd.md
source_spec: ./spec.md
status: draft
---

# Spec-Test — <Requirement Title>

## 0. Coverage Matrix

| Requirement | Spec | Test | Level | Status |
|---|---|---|---|---|
| REQ-R001-001 | SPEC-R001-F01-001 | TEST-R001-F01-001 | Integration | TODO |

---

# F01 — <Feature Name>

## TEST-R001-F01-001 <Happy Path>

Covers:
- REQ-R001-001
- SPEC-R001-F01-001
- AC-R001-001

Level:
- Integration

Given:
- ...

When:
- ...

Then:
- ...

## TEST-R001-F01-002 <Negative Path>

Covers:
- INV-R001-001
- SPEC-R001-F01-002

Given:
- ...

When:
- ...

Then:
- 操作必须失败
- 系统状态不得错误修改
- 不得产生非法 side effect

## TEST-R001-F01-003 <Permission / Security>

...

## TEST-R001-F01-004 <Concurrency / Idempotency>

如不适用可以省略。

---

## QA Checklist

- [ ] Happy Path
- [ ] Negative Path
- [ ] Error / Empty State
- [ ] Permission Boundary
- [ ] Cross-Tenant（如适用）
- [ ] Retry / Duplicate
- [ ] Refresh / Re-entry
- [ ] Failure Recovery
- [ ] Audit / Observability

## Exit Criteria

- [ ] 所有 P0/P1 REQ 有 Test 覆盖
- [ ] 所有关键 INV 有验证
- [ ] 必测项通过
- [ ] 无阻塞级缺陷
- [ ] Spec 与实际行为一致
```

---

# 13. 测试层级选择标准

不要机械要求所有功能都有 Unit + Integration + E2E。

按风险选择：

```text
纯函数规则
→ Unit

DB Constraint / Repository
→ Integration

HTTP API Contract
→ Integration / Contract

跨模块核心业务链路
→ E2E

权限 / Tenant 隔离
→ Integration + 必要 E2E

并发 Invariant
→ Concurrency Test
```

---

# 14. Issues 标准

Issue 是实际执行和进度追踪的最小单位。

建议一个 Issue：

- 能独立开发。
- 能独立验收。
- 0.5～2 个工程日内完成为宜。
- 有明确 Parent Spec。
- 有明确 Related Tests。
- 有 Scope。
- 有 Done 判断条件。

不要拆成：

```text
创建文件
增加 import
写一个函数
```

这种机械碎片。

---

# 15. Issues Template

```markdown
---
requirement: R001
source_prd: ./prd.md
source_spec: ./spec.md
source_test: ./test.md
status: todo
---

# Issues — <Requirement Title>

## Summary

| Issue | Goal | Covers | Status |
|---|---|---|---|
| ISSUE-R001-001 | ... | SPEC-R001-F01-001 | TODO |

---

## ISSUE-R001-001 — <Issue Title>

Status: TODO
Priority: P1

Covers:
- REQ-R001-001
- SPEC-R001-F01-001
- TEST-R001-F01-001

### Goal

完成后系统增加 / 改变什么。

### Scope

Must:
- ...

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

- [ ] ...
- [ ] ...

### Validation

- [ ] TEST-R001-F01-001
- [ ] Existing regression tests
- [ ] No unexplained spec deviation

### Dependencies

Depends On:
- None

Blocks:
- ...

### Completion Record

Status: TODO
Implemented By:
Completed At:
PR / Commit:
Changed Files:
Tests Executed:
Spec Deviation: None
```

---

# 16. Traceability 标准

必须保证：

```text
REQ
 ↓
SPEC
 ↓
TEST
 ↓
ISSUE
```

规则：

1. 每个 SPEC MUST 引用至少一个 REQ。
2. 每个 TEST MUST 引用至少一个 SPEC。
3. 每个 ISSUE MUST 引用 SPEC 或 TEST。
4. 每个 P0/P1 REQ MUST 被至少一个 SPEC 覆盖。
5. 每个 P0/P1 REQ MUST 被至少一个 TEST 覆盖。
6. 关键 INV MUST 有测试或验证方式。
7. Issue Done 不等于 Requirement Done。

推荐全局追踪矩阵：

```text
| Requirement | Spec | Test | Issue | Status |
|---|---|---|---|---|
| REQ-R001-001 | SPEC-R001-F01-001 | TEST-R001-F01-001 | ISSUE-R001-001 | Done |
```

该表可以由 Agent 自动生成，不一定人工维护。

---

# 17. 状态与 Gate

推荐状态：

## Requirement

```text
draft
review
approved
implementing
done
deprecated
```

## Spec / Test

```text
draft
review
approved
implementing
done
```

## Issue

```text
todo
ready
in_progress
blocked
review
done
```

---

# 18. Ready Gate

## PRD Ready

必须：

- Goals 清晰。
- Scope 明确。
- Functional Requirements 可判断。
- 关键 Business Rules 已定义。
- Invariants 已定义。
- Edge Cases 足够。
- Acceptance Criteria 可验证。
- Feature Decomposition 不需要大量猜测。
- 无阻塞 Open Question。

---

## Spec Ready

必须：

- 所有相关 REQ 有映射。
- Preconditions 明确。
- State / Error / Authorization 明确。
- 没有产品层脑补。
- 关键 Concurrency / Idempotency 已定义。

---

## Test Ready

必须：

- P0/P1 Requirement 有 Coverage。
- Negative / Permission Cases 足够。
- 关键 Invariant 有验证。
- Exit Criteria 明确。

---

## Issue Ready

必须：

- Scope 独立。
- 依赖明确。
- Parent Spec 明确。
- Related Test 明确。
- Done 可判断。

---

# 19. Done Definition

## Issue Done

```text
Code Complete
AND
Related Tests Pass
AND
No Unexplained Spec Deviation
```

---

## Feature Done

```text
All Required Issues Done
AND
Spec-Test Exit Criteria Pass
AND
Actual Behavior == Spec
```

---

## Requirement Done

```text
All Feature Specs Done
AND
Acceptance Criteria Verified
AND
No Blocking Open Question
```

---

# 20. Change Management

新需求到来时先判断：

## 新 Feature

```text
type: feature
```

完整：

```text
PRD → Spec → Test → Issues
```

---

## Existing Behavior Change

```text
type: change
affects:
  - Rxxx
```

必须生成 Delta：

```text
Added
Modified
Removed
Unchanged Guarantees
```

---

## Bug

如果当前实现不符合 Approved Spec：

```text
type: bug
```

通常不应该修改原 PRD / Spec，而是创建修复 Requirement Package / Issue。

---

## Refactor

外部行为不变化：

```text
type: refactor
```

不重新定义产品 Requirement。

---

# 21. Codebase / Architecture Context

Project Context 不建议复制到 `.xx/` 形成另一份容易过期的 Wiki。

Agent 在 Spec / Issue 阶段通过：

```text
Codebase Index
MCP
Wiki
LSP
Repository Search
Architecture Docs
ADR
```

动态获取。

因此：

```text
.xx/
= normative development contracts

Codebase / Wiki / MCP
= runtime engineering context
```

---

# 22. Agent Skill

推荐一个统一 Skill，内部通过 Mode 工作。

---

## Skill Template

```markdown
# SKILL — Requirement Package Workflow

## Canonical Package

Every requirement/change uses:

.xx/requirements/Rxxx-name/
├── prd.md
├── spec.md
├── test.md
└── issues.md

Feature decomposition is logical only:
F01 / F02 / F03

Do not create Feature subdirectories by default.

---

## Modes

1. prd-author
2. prd-review
3. spec-generate
4. spec-review
5. spec-test-generate
6. issue-generate
7. issue-execute
8. feature-verify

---

## Source Priority

When information conflicts:

Approved latest PRD / Change Requirement
    ↓
Approved Spec
    ↓
Architecture / ADR
    ↓
Actual Code
    ↓
Existing Tests

Code and tests may be stale.

Never silently rewrite product intent to match current implementation.

---

## prd-author

Input:
- User requirement
- Existing related Requirement Packages
- Relevant product context

Output:
- prd.md

MUST:
- define Goal
- define Non-Goal
- define Actors
- define Scope
- define Requirements
- define Business Rules
- define Invariants
- define Edge Cases
- define Acceptance
- produce Feature Decomposition
- preserve unresolved decisions as Open Questions

MUST NOT:
- invent material business policy
- prematurely decide DB/API/code layout

---

## prd-review

Check:

- Is Goal clear?
- Is Scope clear?
- Are Requirements testable?
- Are Actor permissions clear?
- Are lifecycle and edge cases sufficient?
- Are Invariants explicit?
- Can Features be decomposed without guessing?
- Are Open Questions blocking?

Output:
PASS / WARN / BLOCK

---

## spec-generate

Before writing Spec:

1. Read prd.md
2. Extract REQ / BR / INV / AC
3. Query related existing Requirements
4. Read Codebase / Wiki / Architecture
5. Perform Impact Analysis
6. Produce logical Feature grouping
7. Generate Spec

MUST NOT split Feature by code module.

Feature split basis:
- business outcome
- actor boundary
- lifecycle boundary
- authorization boundary
- independent testability

If material business behavior is missing:
BLOCK the affected Spec
and return to PRD review.

---

## spec-test-generate

Input:
- Approved PRD
- Approved Spec

Generate test.md.

MUST cover:
- Happy Path
- Negative Path
- Permission
- State Transition
- Invariant
- Retry / Duplicate
- Concurrency when specified
- External failure when relevant
- Audit / Observability when required

Every P0/P1 REQ MUST have test coverage.

---

## issue-generate

Input:
- Approved Spec
- Approved Test
- Actual Codebase

Generate issues.md.

Each Issue MUST:
- have one clear Goal
- reference SPEC
- reference TEST
- define Scope
- define Must Not
- include codebase-derived implementation context
- include validation
- be independently completable

---

## issue-execute

Before coding:

1. Read current Issue
2. Read related PRD
3. Read related Spec
4. Read related Test
5. Query actual Codebase
6. Run existing relevant tests when practical

During implementation:

MUST:
- stay inside Issue Scope
- preserve Invariants
- satisfy Related Tests
- record deviations

MUST NOT:
- invent product behavior
- weaken tests to make code pass
- silently change approved Spec
- perform unrelated refactor

If Spec conflicts materially with code reality:

STOP
→ Record Spec Deviation
→ Return to Spec Review

---

## feature-verify

Feature Done only if:

- all required Issues are Done
- Spec-Test Exit Criteria pass
- no unresolved Spec Deviations
- implementation matches Spec
- mapped PRD Acceptance Criteria pass

Generate Traceability Matrix:

Requirement | Spec | Test | Issue | Status

---

## Change Mode

A Change is still a new Requirement Package.

Example:

R027-something/
├── prd.md
├── spec.md
├── test.md
└── issues.md

prd.md:

type: change
affects:
  - R001

spec.md MUST identify:

- Added
- Modified
- Removed
- Unchanged Guarantees

Agent MUST NOT rewrite unaffected behavior.
```

---

# 23. RFC 风格规范词

统一使用：

```text
MUST
MUST NOT
SHOULD
SHOULD NOT
MAY
```

不要大量使用：

```text
尽量
最好
合理
适当
一般来说
视情况
```

如果必须使用，应补充判断条件。

---

# 24. 禁止事项

Agent / Developer MUST NOT：

1. 未读 PRD 就直接写 Spec。
2. 未读 Spec / Test 就直接执行 Issue。
3. 按代码目录机械拆 Feature。
4. 为了实现方便修改产品语义。
5. 因为 Current Code 与 Spec 不一致而反向修改 Spec。
6. 通过删除/弱化测试让 CI 通过。
7. 修改无关 Feature。
8. 让 Open Question 自动变成 Requirement。
9. 让同一个 ID 在后续版本改变语义。
10. 重写 Change 未涉及的 Existing Behavior。
11. 将 Issue 标记 Done，但存在未解释 Spec Deviation。
12. 把技术实现选择写进 PRD，除非它本身就是硬性产品/合规约束。

---

# 25. 推荐项目入口约定

项目根目录：

```text
AGENTS.md
.xx/
src/
...
```

AGENTS.md 可以写：

```markdown
This project uses the .xx Requirement Package workflow.

Before implementation:

1. Locate the active Rxxx requirement.
2. Read prd.md.
3. Read related spec.md.
4. Read related test.md.
5. Read current issue in issues.md.
6. Query codebase / wiki / architecture context.
7. Follow .xx/skills/SKILL.md.

Never change approved product behavior silently.
Never mark an Issue done with unresolved Spec Deviation.
```

---

# 26. 最终简化模型

目录：

```text
.xx/
├── requirements/
│   └── Rxxx-name/
│       ├── prd.md
│       ├── spec.md
│       ├── test.md
│       └── issues.md
│
├── templates/
│   ├── prd.md
│   ├── spec.md
│   ├── test.md
│   └── issues.md
│
└── skills/
    └── SKILL.md
```

语义：

```text
Folder
= Requirement / Change

prd.md
= Intent / Product Behavior

spec.md
= Executable Contract

test.md
= Verification Contract

issues.md
= Execution & Progress
```

流程：

```text
Idea
 ↓
PRD
 ↓
Feature Decomposition
 ↓
Spec
 ↓
Spec-Test
 ↓
Issues
 ↓
Issue Execution
 ↓
Verify
 ↓
Done
```

变更：

```text
Existing Requirement
        +
New Requirement Package(type=change)
        ↓
Delta Spec
        ↓
Delta Test
        ↓
Issues
        ↓
Implementation
```

核心底线：

> **PRD 足够完整，让 Agent 不需要大量脑补。**

> **Spec 足够精确，让开发者知道系统应该如何工作。**

> **Spec-Test 足够明确，让 QA 可以证明 Spec 是否成立。**

> **Issue 足够小，让 Agent 可以独立执行、验证和记录状态。**

> **所有层通过稳定 ID 建立可追踪链路。**

> **一个需求一个目录，逻辑 Feature 不制造额外目录层级。**

> **Agent 发现不确定性时回退到上一层，而不是自行决定。**
