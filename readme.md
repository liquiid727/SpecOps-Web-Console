# SpecOS

SpecOS 是一个面向软件团队的 Spec-Driven AI workspace。它把产品设计、功能规格、Agent 执行、评审、测试与验收组织为一条可追溯的交付链，并将 AI 协作中反复使用的规则、技能、角色与模板沉淀为项目资产。

## English Overview

SpecOS is a spec-driven AI workspace for software teams. It connects product design, specifications, agent execution, review, testing, and acceptance through a traceable delivery chain.

- **Delivery model:** one PRD Workspace contains independently deliverable Spec Packages, linked to test design, Issues, evidence, review, QA acceptance, and release.
- **Reusable assets:** rules, skills, agent roles, workflows, and templates establish a project's AI-assisted engineering baseline.
- **Product surfaces:** `spec-web-ui` is the asset configuration workbench; `test-console` presents normalized verification evidence.

For the detailed workflow, repository map, and contributor entry points, see the Chinese sections below.

## 项目定位

这个仓库记录并实践个人与团队在 AI 协作开发中的方法论。重点不是把提示词或聊天记录堆在一起，而是把每一次交付所需的约束、上下文、决策和验证依据保留下来，让后续的人和 Agent 都能接着工作。

SpecOS 关注以下问题：

- 如何拆解需求和执行任务，使每个交付单元都有明确边界。
- 如何控制上下文，让 Agent 在正确的规格、规则和已有证据上工作。
- 如何控制生成质量，避免 AI 未经约束地改动项目或绕过工程标准。
- 如何把架构设计、工程规范、测试和验收连接起来，而不是分别维护孤立文档。

仓库中的可复用资产服务于全栈交付：前后端边界、数据与缓存、鉴权、第三方集成、部署、代码分层、环境隔离、可维护性和版本管理等问题都应有明确的设计与验证位置。目标是持续沉淀可复用的脚手架和开发范式，提高项目启动和交付的效率。

## 交付方式

SpecOS 使用 [GoalSpec](docs/spec-modes/GoalSpec/README.md) 作为唯一的 Agent-Native SDLC 标准。一个需求对应一个 PRD Workspace；Workspace 中的每个 Spec Package 都可以独立实现、验证、评审和验收。

```text
PRD Workspace -> Spec Packages -> Test Design -> Issue Files
-> Evidence / Review -> QA Acceptance -> PRD Acceptance -> Ship
```

稳定的需求链路如下：

```text
.requirements/requirements/R0NN-<slug>/
├── prd.md + index.yaml + acceptance.md
└── specs/S0N-<slug>/
    ├── spec.md + test.md + issues/
    ├── review.md + acceptance.md
    └── evidence/
```

`design/` 保存平台或系统级的长期设计决策；`.requirements/` 保存一次需求的可执行交付记录。完整目录、ID 与验收规则见 [GoalSpec 标准](docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md) 和 [.requirements 使用说明](.requirements/README.md)。

## 组成

| 区域 | 职责 |
| --- | --- |
| `rules/` 与 `.rules/` | 工程、交付与 Agent 执行规则；详细规范在 `rules/`，快速入口在 `.rules/`。 |
| `skills/` | 可版本化、可复用的开发、内容创作、教育与 Codex 定制技能。 |
| `ai/agents/` 与 `.agents/` | Agent 角色、工作流和本地路由配置；角色注册表是 `.agents/manifest.yaml`。 |
| `assets/` | 可被 Catalog 浏览和组合的角色、团队、技能、工程包与模板源。 |
| `packages/` | Catalog、核心能力与模板包的工作区。 |
| `spec-web-ui/` | 本地 AI 工程配置资产工作台，负责浏览、选择和组合项目级资产。 |
| `test-console/` | 读取 GoalSpec 证据并展示标准化测试计划与结果的验证控制台。 |
| `scripts/` | 检查和测试编排脚本。 |

[Code: Bugrail](https://github.com/liquiid727/bugrail) 是独立的兄弟项目（CodeG fork），不作为本仓库的子模块或源码副本维护。其开发、桌面打包和上游同步应在相邻的 Bugrail 仓库中进行。

## 当前状态

SpecOS 仍处于原型演进阶段。当前仓库已提供 GoalSpec 规范与模板、工程资产目录、Catalog 浏览与本地配置工作台，以及读取规范化证据的测试控制台；资产组织、生命周期和模板仍在持续调整。

使用时应遵循以下边界：

- 以 [GoalSpec](docs/spec-modes/GoalSpec/README.md) 在目标项目的 `.requirements/` 中组织需求与交付证据。
- 在 `design/` 中维护稳定的平台和系统设计，不在功能规格中复制或分叉设计真相。
- 通过 `rules/`、`skills/`、`ai/agents/` 和 `assets/` 组合项目的 AI 协作基线。
- 由 `spec-web-ui` 处理资产配置，由目标项目仓库持有需求生命周期的规范化真相。

## 快速开始

根工作区使用 npm workspaces。安装依赖、构建共享包并运行工作区测试：

```bash
make install
make build
make test
```

启动配置资产工作台：

```bash
cd spec-web-ui
npm install
npm run dev
```

随后访问 [http://localhost:3000](http://localhost:3000)。在 `spec-web-ui` 依赖已安装的情况下，也可以从仓库根目录执行 `make dev`。

测试控制台可单独启动：

```bash
cd test-console
npm install
npm run dev
```

关于应用职责、运行模式与部署边界，分别见 [spec-web-ui README](spec-web-ui/README.md) 和 [test-console README](test-console/README.md)。

## 从哪里开始

首次参与项目时，按以下顺序了解仓库：

1. [AGENTS.md](AGENTS.md)：项目意图、工作边界和验证要求。
2. [.rules/project.md](.rules/project.md) 与 [rules/README.md](rules/README.md)：Agent 与工程治理规则。
3. [GoalSpec 工作流](docs/spec-modes/GoalSpec/README.md)：需求、Spec、Issue、证据和验收的规范。
4. [design/README.md](design/README.md)：稳定平台和系统设计的边界。
5. [.requirements/README.md](.requirements/README.md)：需求 Workspace 模板与示例。

所有有意义的变更都应能追溯到设计文档、PRD、Spec Package、规则、评审或证据。实现、测试和验收应引用同一组稳定 ID；无法覆盖的链路需要明确记录为假设或后续工作，而不是被静默跳过。

## 仓库地图

```text
ai/                 Agent 角色、提示词、评审者与工作流
assets/             Catalog 可消费的可复用工程资产
design/             平台和系统级长期设计
docs/spec-modes/    GoalSpec（Agent-Native SDLC）规范
packages/           Catalog、核心能力与项目模板工作区
rules/              可复用工程与交付治理规则
scripts/            检查和测试编排脚本
skills/             仓库内可复用 Agent 技能
spec-web-ui/        AI 工程配置资产工作台
test-console/       GoalSpec 验证证据控制台
.requirements/      PRD Workspace、模板与示例
.agents/            Agent 路由与角色注册表
```
