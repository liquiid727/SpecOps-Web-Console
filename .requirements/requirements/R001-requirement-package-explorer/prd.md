---
id: R001
title: Requirement Package Explorer
type: feature
status: implementing
priority: P1
owner: implementation-agent
created_at: 2026-08-17
updated_at: 2026-08-17
affects: []
---

# PRD — Requirement Package Explorer

## 1. Background

SpecOS 已将研发真相迁移到 `.requirements/requirements/R0NN-<slug>/`，但 `spec-web-ui` 只能说明该流程，不能读取真实需求包。用户无法从 UI 确认一个包是否完整、当前处于什么阶段，或检查 PRD、Spec、Test、Issues 的关联状态。

## 2. Goals

- G-R001-001: 开发者可以在 Web UI 只读浏览真实 Requirement Package。
- G-R001-002: 开发者可以看到四件套文件完整性、阶段状态、Issue 完成计数和可追踪 ID 统计。
- G-R001-003: UI 不复制或写入目标项目的需求真相。

## 3. Non-Goals

- NG-R001-001: 本需求不提供 PRD、Spec、Test 或 Issues 的编辑能力。
- NG-R001-002: 本需求不在 UI 内执行 Agent workflow、CLI 或 Feature Verify。
- NG-R001-003: 本需求不将 Markdown 解析结果写入数据库。

## 4. Actors

### ACT-R001-001 开发者

允许：
- 查看 Requirement Package 列表、文件和派生状态。

禁止：
- 通过此版本 UI 修改 Requirement Package 内容。

## 5. Scope

### In Scope
- `/requirements` 列表页。
- Requirement Package 详情和 PRD / Spec / Test / Issues 源文件视图。
- 空包、缺失文件、有效包与加载状态。
- 基于当前 Markdown 的稳定 ID 与 Issue 完成计数。

### Out of Scope
- 写操作、执行 Agent、外部项目连接、实时文件监视、CLI hash gate 的 UI 展示。

## 6. User / Business Flow

### FLOW-R001-001 浏览需求包

```text
开发者
  ↓
打开 /requirements
  ↓
系统扫描 .requirements/requirements/R0NN-<slug>/
  ↓
展示包状态与四件套完整性
  ↓
开发者打开单个文件或追踪统计
```

## 7. Functional Requirements

### REQ-R001-001 列表真实需求包

System MUST 只扫描 `.requirements/requirements/` 下符合 `R0NN-<slug>` 的目录，MUST NOT 将 templates 或 examples 显示为活动需求。

### REQ-R001-002 展示四件套与门禁

System MUST 展示 `prd.md`、`spec.md`、`test.md`、`issues.md` 是否存在，并将缺失文件标记为 blocked。

### REQ-R001-003 展示可追踪信息

System MUST 从当前 Markdown 派生 REQ / SPEC / TEST / ISSUE ID 数量和 Issue 状态计数，MUST NOT 持久化副本。

### REQ-R001-004 源文件只读查看

System MUST 提供单包的 PRD、Spec、Spec-Test、Issues 路由，并以只读方式展示当前文件内容。

## 8. Business Rules

- BR-R001-001: `.requirements` Markdown 是唯一事实来源。
- BR-R001-002: Package 完整性通过不等同于 Feature Done。

## 9. Edge Cases

| ID | Case | Expected Behavior |
|---|---|---|
| EDGE-R001-001 | 没有真实需求包 | 显示空态，不显示示例包 |
| EDGE-R001-002 | 缺少任一四件套文件 | 显示 missing 和 blocked |
| EDGE-R001-003 | 路由指向不存在包 | 显示 unavailable 状态 |

## 10. Invariants / Forbidden Behavior

- INV-R001-001: System MUST NOT 写入 Requirement Package。
- INV-R001-002: System MUST NOT 将 example 或 template 当作活动需求。
- INV-R001-003: System MUST NOT 将 Issue Done 误报为 Requirement Done。

## 11. Acceptance Criteria

- AC-R001-001: Given 存在真实 R0NN 包，When 打开 `/requirements`，Then 仅显示该包并可进入详情。
- AC-R001-002: Given 四件套缺失，When 打开详情，Then 缺失文件和 blocked 状态可见。
- AC-R001-003: Given 没有真实包，When 打开列表，Then 显示明确空态。

## 12. Feature Decomposition

### F01 Requirement Package Reader

Covers:
- REQ-R001-001
- REQ-R001-002
- REQ-R001-003
- REQ-R001-004

Business Outcome:
- 开发者可在不改变 Markdown 真相源的前提下检查真实需求包。

## 13. Open Questions

- Q-R001-001: CLI hash/version stale gate 何时以可交互 UI 方式接入？
