# EnterpriseSpec (Plugin Spec)

> EnterpriseSpec 已从官方模式降级为**可选插件规范**。本仓库唯一官方模式是 GoalSpec（Agent-Native SDLC），`--mode enterprisespec` 仅在需要 QA、审计、发布治理或多团队交付时启用。

EnterpriseSpec 不改变 Requirement Package 模型（`.requirements/requirements/R0NN-<slug>/`），而是在其之上增加治理面：

- `reviews/`：分层评审证据（architecture / implementation / qa / release / security / postmortem）。
- `tests/`：分类证据目录（unit / integration / e2e / performance / concurrency / security / api / scenarios）。
- `docs/adr/` `docs/incidents/` `docs/operations/` `docs/runbook/`：架构决策、事故、运维与操作手册。
- `implementation/_template/`：上线（rollout）与回滚（rollback）模板。

Requirement Package 内的 `prd.md` / `spec.md` / `test.md` / `issues.md` 写法与 GoalSpec 完全一致。
