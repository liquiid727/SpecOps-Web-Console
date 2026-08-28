# GoalSpec — Agent-Native SDLC

本仓库唯一官方研发模式。一个需求 = 一个 Requirement Package：

```text
.requirements/
├── README.md
├── requirements/
│   └── R001-<slug>/
    │       ├── prd.md                # 产品行为契约
    │       ├── index.yaml            # Spec Package 汇总
    │       ├── acceptance.md         # PRD 验收汇总
    │       └── specs/S01-<slug>/
    │           ├── spec.md           # 可执行契约
    │           ├── test.md           # 验证契约
    │           ├── issues/ISSUE-*.md  # 一文件一执行单
    │           ├── review.md
    │           ├── acceptance.md
    │           └── evidence/
├── examples/                     # 示例包（R000- 前缀）
├── templates/                    # 空白模板
└── skills/
    └── SKILL.md                  # 统一 skill 入口
```

链路：`Idea → PRD → Feature Decomposition → Spec → Spec-Test → Issues → Issue Execution → Feature Verify → Done`。

- ID 体系：`R001` / `REQ-R001-001` / `SPEC-R001-S01-001` / `TEST-R001-S01-001` / `ISSUE-R001-S01-001`；ID 是永久锚点，不复用不重排。
- 变更：新建 `type: change` 包 + `affects: [R001]`，Spec 含 `# Change Delta`（Added/Modified/Removed/Unchanged Guarantees）。
- 模板与示例：`.requirements/templates/` 与 `.requirements/examples/`。
