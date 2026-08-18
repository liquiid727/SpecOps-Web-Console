---
name: requirement-package
description: "Agent-Native SDLC 需求包工作流（本仓库 GoalSpec 的唯一规范）：一个需求一个 Requirement Package（.requirements/requirements/R001-<slug>/{prd,spec,test,issues}.md），稳定 ID 串联 REQ→SPEC→TEST→ISSUE。8 个 mode：prd-author / prd-review / spec-generate / spec-review / spec-test-generate / issue-generate / issue-execute / feature-verify。Triggers on: 需求、PRD、拆需求、写spec、写测试、拆issue、实现issue、验证feature、requirement package、需求包、sdlc。"
user-invocable: true
allowed-tools:
  - Bash(git:*)
  - Bash(mkdir:*)
  - Bash(cp:*)
---

# Requirement Package Workflow（Agent-Native SDLC）

> 规范全文：`docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md`；空白模板：`.requirements/templates/`；示例：`.requirements/examples/`。

## Canonical Package

Every requirement/change uses one co-located directory:

```text
.requirements/requirements/R001-<slug>/
├── prd.md                # 产品行为契约（WHY / WHO / WHAT / BOUNDARY / RULE / STATE / EDGE / SUCCESS）
├── spec.md               # 可执行契约（F01/F02 为逻辑分组，不建子目录）
├── test.md               # 验证契约
└── issues.md             # 执行与进度（## ISSUE-R001-001 小节）
```

Feature decomposition is logical only: `F01 / F02 / F03`。**Do not create Feature subdirectories by default.**

## Modes

1. `prd-author`
2. `prd-review`
3. `spec-generate`
4. `spec-review`
5. `spec-test-generate`
6. `issue-generate`
7. `issue-execute`
8. `feature-verify`

## Source Priority

When information conflicts:

```text
Approved latest PRD / Change Requirement
    ↓
Approved Spec
    ↓
Architecture / ADR
    ↓
Actual Code
    ↓
Existing Tests
```

Code and tests may be stale. **Never silently rewrite product intent to match current implementation.**

## 禁止事项（MUST NOT）

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

## prd-author

Input:
- User requirement
- Existing related Requirement Packages
- Relevant product context

Output:
- `.requirements/requirements/R0NN-<slug>/prd.md`

MUST:
- define Goal / Non-Goal / Actors / Scope / Requirements(REQ) / Business Rules(BR) / Invariants(INV) / Edge Cases(EDGE) / Acceptance(AC)
- produce Feature Decomposition（F0N 逻辑分组）
- preserve unresolved decisions as Open Questions

MUST NOT:
- invent material business policy
- prematurely decide DB/API/code layout

流程：
1. 用 `.requirements/templates/prd.md` 初始化。
2. 分配稳定 `R0NN` 编号（全项目唯一，不复用；查 `.requirements/requirements/` 现有最大编号 +1）。
3. 按模板填满各节，生成 REQ/BR/INV/EDGE/AC ID。
4. 完成 Feature Decomposition（F01/F02…，每条 REQ 归属 >=1 个 Feature）。

## prd-review

Check:
- Is Goal clear? Is Scope clear? Are Requirements testable?
- Are Actor permissions clear? Are lifecycle and edge cases sufficient?
- Are Invariants explicit? Can Features be decomposed without guessing?
- Are Open Questions blocking?

Output:
- PASS / WARN / BLOCK

BLOCK 时回写 `prd.md` 的 `status: review`，返回 prd-author 修正；PASS 时 `status: approved`。

## spec-generate

Before writing Spec:
1. Read `prd.md`
2. Extract REQ / BR / INV / AC
3. Query related existing Requirements
4. Read Codebase / Wiki / Architecture（source priority）
5. Perform Impact Analysis
6. Produce logical Feature grouping
7. Generate `spec.md`

MUST NOT split Feature by code module. Feature split basis:
- business outcome
- actor boundary
- lifecycle boundary
- authorization boundary
- independent testability

If material business behavior is missing: **BLOCK** the affected Spec and return to PRD review.

## spec-review

Output: PASS / WARN / BLOCK。核对：
- 所有相关 REQ 有映射（`## 0. Traceability`）
- Preconditions / State / Error / Authorization 明确
- 没有产品层脑补
- 关键 Concurrency / Idempotency 已定义

PASS → `status: approved`。变更需求必须含 `# Change Delta` 四段。

## spec-test-generate

Input:
- Approved PRD
- Approved Spec

Output: `test.md`

MUST cover:
- Happy Path / Negative Path / Permission / State Transition / Invariant
- Retry / Duplicate / Concurrency（如适用）/ External failure（如适用）
- Audit / Observability（关键行为）

Every P0/P1 REQ MUST have test coverage（`## 0. Coverage Matrix`）。按风险选层级（Unit / Integration / E2E / Concurrency），不机械要求全三层。

## issue-generate

Input:
- Approved Spec
- Approved Test
- Actual Codebase

Output: `issues.md`

Each Issue MUST:
- have one clear Goal
- reference SPEC
- reference TEST
- define Scope（Must / Must Not）
- include codebase-derived implementation context
- include validation
- be independently completable（0.5~2 工程日）

Do NOT split into mechanical fragments（创建文件 / 加 import / 写一个函数）。

## issue-execute

Before coding:
1. Read current Issue
2. Read related `prd.md`
3. Read related `spec.md`
4. Read related `test.md`
5. Query actual Codebase
6. Run existing relevant tests when practical

During implementation:
- stay inside Issue Scope
- preserve Invariants
- satisfy Related Tests
- record deviations

If Spec conflicts materially with code reality:
**STOP** → record Spec Deviation in `### Completion Record` → return to Spec Review.

完成后更新 `## ISSUE-R0NN-NNN` 的 `Status:` 与 `### Completion Record`。

## feature-verify

Feature Done only if:
- all required Issues are Done
- Spec-Test Exit Criteria pass
- no unresolved Spec Deviations
- implementation matches Spec
- mapped PRD Acceptance Criteria pass

Generate Traceability Matrix（可写入包内 `traceability.md`）：

```text
| Requirement | Spec | Test | Issue | Status |
|---|---|---|---|---|
| REQ-R001-001 | SPEC-R001-F01-001 | TEST-R001-F01-001 | ISSUE-R001-001 | Done |
```

更新包状态：Requirement `done`。

---

## Change Mode

A Change is still a new Requirement Package.

```text
.requirements/requirements/R027-something/
├── prd.md    # type: change; affects: [R001]
├── spec.md   # 含 # Change Delta: Added / Modified / Removed / Unchanged Guarantees
├── test.md
└── issues.md
```

`# Change Delta` 的 **Unchanged Guarantees** 尤其重要：明确告诉 Agent「这次只改这些行为，其他行为不得顺手改掉」。Agent MUST NOT rewrite unaffected behavior.

---

## 映射到现有 skill

| 旧 skill（全局，其他仓库仍在用） | 本 skill mode |
|---|---|
| `prd` | `prd-author` |
| `prd-to-spec` | `spec-generate` + `spec-review` |
| `to-issues` | `issue-generate` |
| `loop-it-local` | `issue-execute`（格式以本 skill 的 `issues.md` 为准） |
| `review-it` / `ship-it` | feature-verify 之后的 gate，原样保留 |

## 示例

完整参考 `.requirements/examples/R000-example-feature/`（feature 链路）与 `.requirements/examples/R000-example-change/`（change/delta）。
