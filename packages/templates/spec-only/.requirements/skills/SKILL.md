---
name: requirement-package
description: "本仓库 Requirement Package 工作流的统一 skill 入口。规范见 docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md；实现见 .claude/skills/requirement-package/SKILL.md。"
---

# Skill — Requirement Package Workflow

本文件是 `.requirements/skills/` 布局的占位/入口，保持与规范推荐的目录结构一致。

统一 skill 的实际实现位于：

```text
.claude/skills/requirement-package/SKILL.md
```

包含 8 个 mode：`prd-author` / `prd-review` / `spec-generate` / `spec-review` / `spec-test-generate` / `issue-generate` / `issue-execute` / `feature-verify`，以及 Source Priority、禁止清单、Change/Delta 模式。

模板：`.requirements/templates/`；示例：`.requirements/examples/`。
