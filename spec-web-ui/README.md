# spec-web-ui

`spec-web-ui` 是 SpecOS 面向开发人员的本地 AI 工程配置资产工作台。

它的核心价值不是做一个普通后台，也不是把所有 workflow 都塞进 UI 里执行，而是沉淀、浏览、选择和组合开发人员日常高频使用的 AI 工程资产，让项目可以快速建立自己的规则、Agent 能力、测试规范和交付结构。

它也不是单个目标项目的需求状态系统。具体项目的 Agent-Native SDLC 生命周期（一个需求 = 一个 Requirement Package：`.requirements/requirements/R0NN-<slug>/{prd.md, spec.md, test.md, issues.md}`，沿 prd-author → spec-generate → issue-execute → feature-verify 推进）应留在目标项目仓库内；`spec-web-ui` 可以只读展示这些 Markdown 包及其派生门禁，但不持有或复制目标项目的规范化需求真相。

## 核心定位

`spec-web-ui` 服务于两阶段目标。

第一阶段是人工选择和组合。开发人员进入工作台后，可以从资产目录中快速 pick 当前项目需要的内容，包括：

- rules
- skills
- agent roles
- workflows
- spec templates
- test patterns
- project conventions
- engineering packs for Go, React, Python, and future stacks

这些资产被组合成项目级本地配置。目标是让开发人员不需要每次从零开始写规则、Agent 职责、技能说明或测试约定，而是基于已有资产快速构建一套结构化、可复用、可追踪的 AI 协作配置。

第二阶段是 RAG 驱动的自动脚手架。随着工作台沉淀足够多的 rules、skills、agent 配置、模板和项目结构，这些内容会成为项目启动 Agent 的检索语料。未来只需要一个 `project-start-agent` 与开发人员交流，确认项目类型、技术栈、业务场景、团队规范、测试要求和交付方式，再自动推荐并生成类似项目的 AI 配置脚手架。

## 发展方向

前期链路：

```text
开发人员进入 spec-web-ui
-> 浏览 rules / skills / agents / templates
-> 选择适合项目的资产
-> 组合成项目级 AI 配置
-> 查看目录结构和 workflow 关系
-> 在当前工作台继续配置
```

后期链路：

```text
开发人员描述项目
-> project-start-agent 追问并确认项目边界
-> 从 spec-web-ui 资产库和 RAG 语料中检索匹配规则
-> 自动组合 skills / agents / rules / workflows / templates
-> 推荐项目级 AI 配置
```

## 非目标

- 不把 `spec-web-ui` 设计成普通 CRUD 管理后台。
- 不让它替代 CLI、测试执行器或 CI runner。
- 不让它承载具体项目的需求 lifecycle 状态。
- 不把它变成无边界的 Agent 聊天入口。
- 不绕过 SpecOS 的核心链路：标准化 Spec、规则、Agent 分工、测试、文档和交付门禁必须保持可追踪。

## 当前职责

当前实现以 catalog-first workspace 为主：

- 浏览 catalog 中的规则、模板和 Agent 角色。
- 在 `/engineering-packs` 浏览按技术栈组织的工程约束与 CLI 基座。
- 创建配置工作区。
- 组合项目所需资产。
- 预览项目级 AI 配置、目录结构和 workflow 关系。
- 在 `/requirements` 只读浏览目标项目的 Requirement Package、四件套文件、门禁和稳定 ID 统计。
- 提供工作台内部的配置草稿和目录预览，但不替代目标项目仓库中的 `.requirements/` Requirement Package（prd / spec / test / issues）、`design/` 或相关契约。

后续开发和改动应优先服务于“配置资产工作台”和“未来 RAG/项目脚手架入口”这两个方向。

## UX / 交互设计参考

- [Workbench UX Design](design/workbench-ux-design.md)
- [GoalSpec / Agent-Native SDLC](../docs/spec-modes/GoalSpec/README.md)

这些文档共同定义两条边界：`spec-web-ui` 是独立工具站点和资产工作台；具体项目需求流程属于目标项目仓库。后续首页、Discover、Configuration Workspace 等用户界面改动，应优先保持“清爽、简单、明确下一步”的工具站点体验。

## Vercel 部署

在 Vercel 导入仓库时，将项目的 **Root Directory** 设置为 `spec-web-ui`，其余构建设置会由本目录的 `vercel.json` 提供：

- Framework Preset：`Next.js`
- Install Command：`npm ci`
- Build Command：`npm run build`
- Runtime Mode：Vercel 通过 `SPECOS_RUNTIME_MODE=readonly` 部署只读 catalog 站点。

不要把 Root Directory 设置为仓库根目录，否则 Vercel 会读取根目录的 workspace 配置，而不是部署这个 Next.js 应用。

线上只读部署保留 catalog、template、skill、Agent 和资产详情浏览；projects、drafts 等需要写入 workspace 文件的页面会重定向到 `spec-templates`。本地运行不设置 `SPECOS_RUNTIME_MODE` 时，仍保留 workspace 开发模式。
