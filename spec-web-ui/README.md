# spec-web-ui

`spec-web-ui` 是 SpecOS 面向开发人员的 AI 工程配置资产工作台。

它的核心价值不是做一个普通后台，也不是把所有 workflow 都塞进 UI 里执行，而是沉淀、浏览、选择和组合开发人员日常高频使用的 AI 工程资产，让项目可以快速建立自己的规则、Agent 能力、测试规范和交付结构。

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

这些资产被组合成项目级 AI 配置骨架，并导出为可安装 bundle。目标是让开发人员不需要每次从零开始写规则、Agent 职责、技能说明或测试约定，而是基于已有资产快速构建一套结构化、可复用、可追踪的 AI 协作配置。

第二阶段是 RAG 驱动的自动脚手架。随着工作台沉淀足够多的 rules、skills、agent 配置、模板和项目结构，这些内容会成为项目启动 Agent 的检索语料。未来只需要一个 `project-start-agent` 与开发人员交流，确认项目类型、技术栈、业务场景、团队规范、测试要求和交付方式，再自动推荐并生成类似项目的 AI 配置脚手架。

## 发展方向

前期链路：

```text
开发人员进入 spec-web-ui
-> 浏览 rules / skills / agents / templates
-> 选择适合项目的资产
-> 组合成项目级 AI 配置
-> 导出 bundle / scaffold
-> 安装到目标项目
```

后期链路：

```text
开发人员描述项目
-> project-start-agent 追问并确认项目边界
-> 从 spec-web-ui 资产库和 RAG 语料中检索匹配规则
-> 自动组合 skills / agents / rules / workflows / templates
-> 生成项目级 AI 配置脚手架
-> 输出可安装 bundle
```

## 非目标

- 不把 `spec-web-ui` 设计成普通 CRUD 管理后台。
- 不让它替代 CLI、测试执行器或 CI runner。
- 不把它变成无边界的 Agent 聊天入口。
- 不绕过 SpecOS 的核心链路：标准化 Spec、规则、Agent 分工、测试、文档和交付门禁必须保持可追踪。

## 当前职责

当前实现以 catalog-first workspace 为主：

- 浏览 catalog 中的规则、模板和 Agent 角色。
- 创建项目工作区。
- 维护项目 draft。
- 组合项目所需资产。
- 导出 review snapshot。
- 生成可被 CLI 安装的 `.specos-bundle/`。

后续开发和改动应优先服务于“配置资产工作台”和“未来 RAG/项目脚手架入口”这两个方向。
