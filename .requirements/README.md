# .requirements — Requirement Package Workflow

本目录是仓库的**规范研发工作区**。一个需求 = 一个 Requirement Package（co-located 目录），PRD、Spec、Test、Issues 放在一起，通过稳定 ID 串联全链路。

## 结构

```text
.requirements/
├── requirements/                 # 真实需求包（一个目录一个需求）
│   └── R001-<slug>/
│       ├── prd.md                # 产品行为契约
│       ├── spec.md               # 可执行契约（F01/F02 为逻辑分组）
│       ├── test.md               # 验证契约
│       └── issues.md             # 执行与进度
├── examples/                     # 示例包（R000- 前缀，勿当真实需求）
│   ├── R000-example-feature/     # 完整 feature 链路示例
│   └── R000-example-change/      # Change/Delta 示例
├── templates/                    # 空白模板（prd/spec/test/issues）
└── skills/
    └── SKILL.md                  # 统一 skill（8 个 mode）
```

## 链路

```text
Idea → PRD → Feature Decomposition → Spec → Spec-Test → Issues → Issue Execution → Feature Verify → Done
```

- ID 体系：`R001` / `REQ-R001-001` / `SPEC-R001-F01-001` / `TEST-R001-F01-001` / `ISSUE-R001-001`；ID 是永久锚点，不复用不重排。
- 变更：新建 `type: change` 包 + `affects: [R001]`，Spec 含 `# Change Delta`（Added/Modified/Removed/Unchanged Guarantees）。
- 完整规范见 [`docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md`](../docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md)。

## 使用

- 新需求：复制 `templates/` 四件套到 `requirements/R0NN-<slug>/` 填写，或直接调用统一 skill（`/requirement-package`）。
- 参考：示例包在 `examples/`，与模板 1:1 对照。
- 规范入口：`/requirement-package` skill 实现 8 个 mode。
