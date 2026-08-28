# .requirements — PRD Workspace Workflow

本目录是仓库的规范研发工作区。一个需求 = 一个 PRD Workspace：根 PRD
表达产品真相，多个子 Spec Package 独立实现、验证、Review 与 QA 验收。

## 新建包结构

    .requirements/
    ├── requirements/                         # 真实需求包
    │   └── R0NN-<slug>/
    │       ├── prd.md                         # 产品行为契约
    │       ├── index.yaml                     # 子 Spec Package 汇总
    │       ├── acceptance.md                  # PRD AC / UAT 汇总
    │       └── specs/
    │           └── S01-<slug>/
    │               ├── spec.md                # 可执行契约
    │               ├── test.md                # 验证设计
    │               ├── issues/ISSUE-R0NN-S0N-NNN-<slug>.md # 一文件一个执行单
    │               ├── review.md              # Review finding
    │               ├── acceptance.md          # QA 决策
    │               └── evidence/              # 运行证据
    ├── examples/                              # R000- 示例，不是活动需求
    ├── templates/                             # v2 根与 Spec Package 模板
    └── skills/SKILL.md

## 关系与状态

    R001 PRD Workspace
    ├── S01 Spec Package
    │   ├── SPEC-R001-S01-001
    │   ├── TEST-R001-S01-001
    │   └── ISSUE-R001-S01-001
    └── S02 Spec Package

- PRD 1:N Spec Package；Spec Package 1:N Issue。
- 每个 Issue 有一个 primary_spec；跨 Spec 只用 covers 显式引用。
- test.md 描述计划，不写最终执行结果；证据在所属 Spec Package 的 evidence/。
- Spec Package acceptance.md 记录 QA 的 accepted、blocked 或
  accepted-with-waiver 决策。
- 根 acceptance.md 汇总所有 required Spec Package 与 PRD AC/UAT。
- ID 是永久锚点，不复用、不重排。

## 使用

- 新需求：复制 templates/ 的根文件，以及 templates/spec-package/ 为每个 S0N
  子目录初始化。
- 模板字段与 ID 约定见 [templates/README.md](templates/README.md)。
- 示例：R000-example-feature 展示一个 PRD 下两个独立 Spec Package；
  R000-example-change 展示 Delta Spec Package。
- 规范入口：docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md。
