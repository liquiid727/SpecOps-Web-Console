# GoalSpec — Agent-Native SDLC

> 本仓库**唯一官方研发模式**。GoalSpec = Agent-Native SDLC：一个需求一个 Requirement Package，PRD、Spec、Spec-Test、Issues 放在一起，用稳定 ID 串联全链路。
>
> 规范全文：[`agent-native-sdlc-standard.md`](./agent-native-sdlc-standard.md)

## 1. 是什么

GoalSpec 是 Spec-first、Agent 驱动的研发工作流。核心链路：

```text
Idea / Requirement
        ↓
      PRD          （产品行为契约）
        ↓
Feature Decomposition （逻辑分组，不按代码目录拆）
        ↓
      Spec          （可执行契约）
        ↓
   Spec-Test        （验证契约）
        ↓
     Issues         （执行与进度的最小单位）
        ↓
 Code / Test / PR
        ↓
 Feature Verify    （Done 判定 + 可追踪矩阵）
```

## 2. 核心模型

**一个需求 = 一个 Requirement Package。** 不要把 PRD、Spec、Test、Issue 分散到四套全局目录。人和 Agent 查询一个需求时，只需进入一个目录。

Feature 是**逻辑分组**（F01/F02），在 `spec.md` 内部通过章节和稳定 ID 表达，**不建子目录**。Feature Boundary ≠ Code Module Boundary：Feature 按业务行为（独立业务目标 / Actor / 生命周期 / 授权边界 / 可验收结果）拆，一个 Feature 可以横跨多个代码模块。

每一层只增加确定性，不重复父层：

```text
PRD        = 产品行为确定性
Spec       = 系统契约确定性
Spec-Test  = 可验证性确定性
Issue      = 执行范围确定性
```

## 3. 目录结构

```text
.requirements/
├── README.md                     # 包索引 / 入口
├── requirements/
│   └── R001-<slug>/
│       ├── prd.md                # 产品行为契约
│       ├── spec.md               # 可执行契约（F01/F02 逻辑分组）
│       ├── test.md               # 验证契约
│       └── issues.md             # 执行与进度
├── examples/                     # 示例包（R000- 前缀）
├── templates/                    # 空白模板
└── skills/
    └── SKILL.md                  # 统一 skill 入口
```

历史遗留目录（`.prd/` `.features/` `.issues/` `implementation/` `reviews/` `tests/`）已归档至 `archive/legacy/`，新工作一律走 `.requirements/`。

## 4. ID 规范

稳定 ID 是整个体系最重要的基础设施。格式：

| 类别 | 格式 | 示例 | 作用域 |
|---|---|---|---|
| Requirement Package | `R0NN` | `R001` | 全项目唯一，不复用不回收 |
| PRD Requirement | `REQ-<R>-<Seq>` | `REQ-R001-001` | 全项目唯一 |
| Business Rule | `BR-<R>-<Seq>` | `BR-R001-001` | 全项目唯一 |
| Invariant | `INV-<R>-<Seq>` | `INV-R001-001` | 全项目唯一 |
| Acceptance Criteria | `AC-<R>-<Seq>` | `AC-R001-001` | 全项目唯一 |
| Edge Case | `EDGE-<R>-<Seq>` | `EDGE-R001-001` | 全项目唯一 |
| Feature | `F0N` | `F01` | 仅包内唯一 |
| Spec | `SPEC-<R>-<F>-<Seq>` | `SPEC-R001-F01-001` | 全项目唯一 |
| Test | `TEST-<R>-<F>-<Seq>` | `TEST-R001-F01-001` | 全项目唯一 |
| Issue | `ISSUE-<R>-<Seq>` | `ISSUE-R001-001` | 全项目唯一，可横跨多个 Spec |

**ID 是永久锚点，不是排序号。** 一旦进入 `approved / implementing / done`，不得因删除中间条目而重新编号（例：`REQ-R001-003` 废弃后，`REQ-R001-004` 仍保持 004）。

## 5. 交付链路（8-mode）

| Mode | 输入 | 输出 | Gate |
|---|---|---|---|
| `prd-author` | 需求 + 相关包 + 产品上下文 | `prd.md` | Open Question 非阻塞 |
| `prd-review` | `prd.md` | PASS / WARN / BLOCK | PRD Ready |
| `spec-generate` | approved PRD + 代码库 | `spec.md` | 所有 REQ 有映射 |
| `spec-review` | `spec.md` | PASS / WARN / BLOCK | Spec Ready |
| `spec-test-generate` | approved PRD + Spec | `test.md` | P0/P1 REQ 全覆盖 |
| `issue-generate` | approved Spec + Test + 代码库 | `issues.md` | Issue Ready |
| `issue-execute` | Issue + prd/spec/test + 代码库 | 代码 / 测试 / 状态更新 | Issue Done |
| `feature-verify` | 全部 Issue + Exit Criteria | 可追踪矩阵 + Done | Feature Done |

实现与验证可按需并行，但 live 验证等待可部署目标。两条轨道在证据、review、ship gate 汇合。

## 6. 模板

空白模板在 `.requirements/templates/`（`prd.md` / `spec.md` / `test.md` / `issues.md`），与规范 §6/§9/§12/§15 一致。已填好的完整示例在 `.requirements/examples/`。

## 7. Change / Delta 管理

已有系统发生需求变化时，**不重写旧 Spec**，而是新建 Requirement Package：

```yaml
# prd.md front-matter
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
Unchanged Guarantees   ← 尤其重要：明确告诉 Agent「这次只改这些，其他不得顺手改掉」
```

## 8. RFC-2119 语言纪律

统一使用 `MUST / MUST NOT / SHOULD / SHOULD NOT / MAY`。不要大量使用「尽量 / 最好 / 合理 / 适当 / 一般来说 / 视情况」；如必须使用，应补充判断条件。

## 9. Ready 门禁 + Done 定义

**PRD Ready**：Goals 清晰、Scope 明确、REQ 可判断、关键 BR/INV 已定义、Edge Cases 足够、AC 可验证、Feature Decomposition 不需大量猜测、无阻塞 Open Question。

**Spec Ready**：所有相关 REQ 有映射、Preconditions 明确、State/Error/Authorization 明确、无产品层脑补、关键 Concurrency/Idempotency 已定义。

**Test Ready**：P0/P1 REQ 有覆盖、Negative/Permission 足够、关键 INV 有验证、Exit Criteria 明确。

**Issue Ready**：Scope 独立、依赖明确、Parent Spec 明确、Related Test 明确、Done 可判断。

**Issue Done** = `Code Complete AND Related Tests Pass AND No Unexplained Spec Deviation`。

**Feature Done** = `All Required Issues Done AND Spec-Test Exit Criteria Pass AND Actual Behavior == Spec`。

**Requirement Done** = `All Feature Specs Done AND Acceptance Criteria Verified AND No Blocking Open Question`。

## 10. 可追踪矩阵

由 `feature-verify` 生成（可写入包内 `traceability.md`），全局表可由 Agent 自动生成：

```text
| Requirement | Spec | Test | Issue | Status |
|---|---|---|---|---|
| REQ-R001-001 | SPEC-R001-F01-001 | TEST-R001-F01-001 | ISSUE-R001-001 | Done |
```

规则：每个 SPEC 引用 >=1 个 REQ；每个 TEST 引用 >=1 个 SPEC；每个 ISSUE 引用 SPEC 或 TEST；每个 P0/P1 REQ 被 >=1 个 SPEC 和 TEST 覆盖；关键 INV 有验证方式；**Issue Done ≠ Requirement Done**。

## 11. Source Priority + 禁止清单

信息冲突时按优先级取用，代码与测试可能过期：

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

**Never silently rewrite product intent to match current implementation.**

禁止（节选自规范 §24）：未读 PRD 直接写 Spec / 未读 Spec-Test 直接执行 Issue / 按代码目录拆 Feature / 为实现方便改产品语义 / 因代码与 Spec 不一致反向改 Spec / 弱化测试让 CI 通过 / 修改无关 Feature / 让 Open Question 自动变需求 / 同一 ID 改变语义 / 重写 Change 未涉及的行为 / 带未解释 Deviation 标记 Issue Done。

## 12. 统一 skill

`/requirement-package` skill（`.claude/skills/requirement-package/SKILL.md`）实现全部 8 个 mode，是需求包工作流的入口。映射：`prd`→prd-author、`prd-to-spec`→spec-generate+spec-review、`to-issues`→issue-generate、`loop-it-local`→issue-execute；`review-it` / `ship-it` 保留为 feature-verify 之后的 gate。

## 13. Agent 加载顺序

1. `readme.md`
2. `.requirements/README.md`（Requirement Package 索引）
3. `design/`（架构 / ADR 真相层）
4. 目标 Requirement Package：`prd.md` → `spec.md` → `test.md` → `issues.md`
5. 代码库 / Wiki / MCP / LSP 动态上下文

实现 Agent 不得读取独立测试 Agent 的私有笔记；独立测试 Agent 从 approved 需求与公开契约推导预期行为，不依赖实现内部细节。

## 14. 旧结构迁移说明

- 历史产物（旧 `.prd/` `.features/` `.issues/` `implementation/` `reviews/` `tests/`）已归档至 `archive/legacy/`，保留可追溯证据，不参与新工作流。
- 旧 Spec ID（如 `BUGRAIL-001`）是历史锚点，**不复用不重排**。
- 新工作一律按本 README 的 Requirement Package 写法执行。
