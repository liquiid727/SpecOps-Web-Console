# Spec Modes

SpecOS 当前官方模式是 GoalSpec（Agent-Native SDLC）。

- GoalSpec：一个 R0NN PRD Workspace 下组织多个独立 Spec Package。链路为
  PRD → Spec Package → Test Design → Issue files → Evidence / Review →
  QA Acceptance → PRD Acceptance。

## 目录

GoalSpec 在 .requirements/requirements/R0NN-<slug>/ 中存放根 PRD、索引、
需求级验收和 specs/S0N-<slug>/ 子包。每个子包独立包含 spec.md、test.md、
issues/、review.md、acceptance.md 和 evidence/。

完整规范见 GoalSpec/agent-native-sdlc-standard.md。

## Agent 加载

Agent 先读取 README、规则和 design，再读取根 prd.md/index.yaml、目标
specs/S0N-<slug>/ 的 Spec/Test 和当前 Issue 文件。QA 阶段还读取 Review、
Evidence 与两级 Acceptance。
