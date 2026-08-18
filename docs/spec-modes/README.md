# Spec Modes

本仓库采用**唯一官方研发模式**：

- `GoalSpec`（Agent-Native SDLC）：Spec-first、Agent 驱动，一个需求一个 Requirement Package，稳定 ID 串联 PRD → Spec → Spec-Test → Issues → Code/Test → Verify。

> 说明：此前的 `LiteSpec` / `EnterpriseSpec` 只是同一套流程的不同配置档位（少一些 / 多一些设置），现降级为**可选插件规范**，见 [`plugins/`](./plugins/)。不推荐新项目使用。

## 模式选择

**默认使用 `GoalSpec`。** 它适用于：

- AI Coding / Agent 驱动研发
- 持续需求迭代、Spec-first 开发
- 小团队按 Issue 逐个交付
- 需要显式 review / ship gate 但不需要全量角色分离审计治理的项目

如果将来需要更轻（更少 token）或更重（QA/审计/合规证据）的档位，可参考 `plugins/` 里的 LiteSpec / EnterpriseSpec 作为配置参考，而不是引入第二套模式。

## 目录

- [GoalSpec（唯一官方模式）](./GoalSpec/README.md)
- 插件参考：[LiteSpec](./plugins/LiteSpec/README.md)（轻量档位）、[EnterpriseSpec](./plugins/EnterpriseSpec/README.md)（治理档位）

## 共享约定

- 稳定 `Spec ID` 命名（本仓库新体系用 `R0NN` 需求包 + `SPEC-R0NN-F0N-NNN`）
- 一个 durable `design/` 真相层（架构 / ADR）
- Agent 加载：`README.md` → 当前状态 → `design/` → 目标需求包（`prd.md → spec.md → test.md → issues.md`）
- 按需求包稳定归属与追踪

## 与分层 Agent 模型

所有工作都跑在 `.agents/manifest.yaml` 的分层注册表上：`pola` 协调、四个主 Agent（`architecture-agent` / `implementation-agent` / `testing-agent` / `qa-agent`）是唯一可路由入口，其余角色由主 Agent 按需打开。GoalSpec 只叠加行为，不改变路由层级。

## 速查

- 新需求：调用 `/requirement-package`（mode `prd-author`）或复制 `.requirements/templates/` 四件套。
- 规范全文：`docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md`
- 工作区：`.requirements/`（需求包 / 模板 / 示例 / skill 入口）
