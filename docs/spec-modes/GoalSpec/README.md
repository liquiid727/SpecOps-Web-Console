# GoalSpec — Agent-Native SDLC

> 本仓库使用 GoalSpec，以一个 PRD Workspace 为根，包含多个
> 独立交付的 Spec Package；稳定 ID 贯穿产品、系统、测试、执行和验收。

规范全文：agent-native-sdlc-standard.md。

## 1. 核心模型

    PRD Workspace (R001)
    ├── S01 Spec Package
    │   ├── Spec
    │   ├── Test Design
    │   ├── N Issue files
    │   ├── Review
    │   ├── Evidence
    │   └── QA Acceptance
    └── S02 Spec Package
        └── ...

PRD 负责产品行为、范围、业务规则和跨 Spec 的验收条件。每个 Spec Package
负责一个可独立交付与验收的系统结果。Issue 是一个 Spec Package 内最小的
执行单元，而不是整个 PRD 的共享章节。

## 2. 目录结构

    .requirements/
    ├── requirements/
    │   └── R0NN-<slug>/
    │       ├── prd.md
    │       ├── index.yaml
    │       ├── acceptance.md
    │       └── specs/S01-<slug>/
    │           ├── spec.md
    │           ├── test.md
    │           ├── issues/ISSUE-R0NN-S01-001-<slug>.md
    │           ├── review.md
    │           ├── acceptance.md
    │           └── evidence/
    ├── templates/
    └── examples/

根目录四件套（prd.md/spec.md/test.md/issues.md）仅用于读取历史证据。
新需求必须使用上述 Workspace 结构。

## 3. ID 规范

| 类别 | 格式 | 作用 |
|---|---|---|
| Requirement Workspace | R0NN | PRD 根 |
| Product Requirement | REQ-R0NN-NNN | 产品需求 |
| Spec Package | S0N | 包内交付单元 |
| Contract Behavior | SPEC-R0NN-S0N-NNN | 系统契约 |
| Test | TEST-R0NN-S0N-NNN | 验证场景 |
| Issue | ISSUE-R0NN-S0N-NNN | 执行工作单 |
| Review Finding | REVIEW-R0NN-S0N-NNN | 审查发现 |

ID 不复用、不重排。每个 Issue MUST 声明一个 primary_spec；跨 Spec 关系通过
covers 显式表示。

## 4. 交付链路

    Idea → PRD → N × Spec Package → N × Issue
         → Evidence + Review → Spec QA Acceptance
         → PRD AC / UAT Acceptance → Ship

| Stage | 输出 |
|---|---|
| prd-author / prd-review | 根 prd.md |
| spec-generate / spec-review | specs/S0N-<slug>/spec.md |
| spec-test-generate | 同目录 test.md |
| issue-generate | 同目录 issues/ISSUE-*.md |
| issue-execute | 代码、Issue Completion Record、evidence/ |
| feature-verify | 子 acceptance.md，再聚合根 acceptance.md |

## 5. QA 与 Done

- Issue Done：代码、关联测试、证据齐全，且没有未解释的 Spec Deviation。
- Spec Package Accepted：所有必要 Issue 完成，测试 Exit Criteria 有证据支持，
  Review 阻塞项已解决或获豁免，且 QA acceptance.md 给出明确决策。
- Requirement Done：所有 required Spec Package 已接受，PRD AC 已验证，
  无阻塞 Open Question，且完成产品/UAT 决策。

QA decision 只能是 accepted、blocked 或 accepted-with-waiver。test.md 只写
验证设计；实际结果和证据在 evidence/ 并由 acceptance.md 引用。

## 6. Change / Delta

Change 仍然是一个新的 R0NN Workspace，PRD 声明 type: change 和 affects。
受影响 Spec Package 的 spec.md 必须包含 Added、Modified、Removed 与
Unchanged Guarantees；不受影响行为不得被静默重写。

## 7. 示例与工具范围

templates/ 是新建 Workspace 的唯一模板源。R000 示例已经采用该结构。
所有入口均使用 GoalSpec；仓库不提供旧布局模板、兼容读取或迁移路径。
