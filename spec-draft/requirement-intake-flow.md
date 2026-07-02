# Requirement Intake Flow / 需求进入 SpecOS 的流程草稿

> Status: draft-only
> Source: README.md, spec-draft/README.md, design/README.md, specs/README.md, tests/README.md
> Scope: describe how a new requirement should move through the canonical Design + Roadmap + Feature Spec model.

## 1. 背景

SpecOS 的目标不是把一句需求直接翻译成代码，而是把需求、设计、spec、实现、测试、评审和合并串成一条可追溯链路。

当前正式对象模型已经收敛为：

```text
spec-draft/      -> intake only
design/          -> one canonical design doc per platform/system
specs/roadmap.md -> epic/release/order/dependency map
specs/<SPEC-ID>-<slug>/spec.md
implementation/  -> implementation handoff and status by spec id
reviews/         -> review evidence by spec id
tests/           -> shared test evidence by spec id
```

## 2. 当前标准流程

### 2.1 主流程

```text
原始需求
-> 记录到 spec-draft/
-> spec-editor 整理并判断是否需要更新 design/
-> 更新 specs/roadmap.md，明确 Epic、顺序、依赖和发布分组
-> 生成或更新 specs/<SPEC-ID>-<slug>/spec.md
-> 生成 implementation/<SPEC-ID>-<slug>/ handoff
-> 生成 tests/plans/ 与 tests/schedules/
-> 产出 reviews/<SPEC-ID>-<slug>/ 评审证据
-> merge
```

### 2.2 角色分工

| 角色 | 职责 |
| --- | --- |
| Product / requester | 提供原始需求、业务目标、边界、验收口径 |
| Engineer | 补充技术约束、依赖、系统影响和交付边界 |
| Spec editor agent | 将 draft 收敛为 design 变更、roadmap 项和 feature spec |
| Architecture / domain agents | 校准 Domain、Application、Repository、API、Database Impact |
| Implementation agents | 按 feature spec 生成 implementation handoff、代码和测试 |
| Reviewer / QA | 检查 deliverables、done checklist、测试证据和 release risk |

### 2.3 关键产物

| 阶段 | 产物 | 说明 |
| --- | --- | --- |
| Intake | `spec-draft/*.md` | 草稿和开放问题，只作为入口 |
| Design | `design/*.md` | 每个平台或系统只有一份长期设计文档 |
| Roadmap | `specs/roadmap.md` | 管理 epic、发布节奏、spec 顺序和依赖 |
| Feature Spec | `specs/<SPEC-ID>-<slug>/spec.md` | 小粒度、可端到端交付的 feature slice |
| Implementation | `implementation/<SPEC-ID>-<slug>/` | handoff、状态、实现附件 |
| Review | `reviews/<SPEC-ID>-<slug>/` | architecture/design/release/gate evidence |
| Test Evidence | `tests/plans/`, `tests/schedules/`, `tests/results/` | 共享测试证据层，按 `spec_id` 建立追踪 |

## 3. Feature Spec 的进入标准

一个需求只有在满足以下条件后，才应该进入正式 feature spec：

- 原始需求已经进入 `spec-draft/`。
- 对应平台是否需要更新 `design/` 已经判断清楚。
- `specs/roadmap.md` 中已经有 epic、顺序和依赖信息。
- feature spec 已经获得稳定 `Spec ID`，例如 `RP-002`。
- `Depends On`、`Prerequisites`、`Out of Scope` 和 `Deliverables` 已明确。

## 4. 当前边界

- `spec-draft/` 仍然允许人工整理，不要求一次自动成稿。
- 旧的 change-workspace CLI 仍保留兼容解析语义，但已不再是规范交付模型。
- feature spec 目录只放 spec 内容；实现、评审和测试证据分别落在 `implementation/`、`reviews/` 和 `tests/`。
- `spec-web-ui` 仍然是模板、规则和 bundle 资产工作台，不承载单个需求的正式交付状态。
