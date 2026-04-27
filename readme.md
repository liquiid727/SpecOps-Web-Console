# SpecOS 使用说明

## 一句话介绍
SpecOS 是一个面向工程与业务系统开发的 **Spec-Driven AI IDE**。  
它的核心不是“让 AI 直接写代码”，而是让需求、Spec、Agent、测试、接口、CI、报告，围绕同一套工程语义持续流转。

## 核心定位
- 把需求变成结构化输入，而不是零散对话。
- 把 `spec-draft` 变成可追踪、可演进的正式 Spec。
- 把 Agent 从“随意发挥”变成“职责明确、上下文受控”。
- 把测试和报告纳入同一条业务链路，支持回溯和审计。

## 当前仓库怎么用
如果你只想知道“今天这个仓库实际能怎么跑起来”，可以直接按下面三条路线理解：

1. `CLI`：初始化或检查一个 SpecOS 项目骨架。
2. `spec-web-ui`：选择规则/模板/Agent，创建项目工作区，编辑 draft，导出 bundle 快照。
3. `test-console`：读取现成的 `test-plan`，触发 runner，生成规范化测试结果并可视化。

当前实现流程图见：
- [todo/specos-current-implemented-flow.md](/Users/liquiid/code/specos-ai/todo/specos-current-implemented-flow.md)

### 0. 环境准备

根目录安装和构建：

```bash
npm install
npm run build
```

说明：
- 根目录的 `npm install` / `npm run build` 主要服务于 `packages/core` 和 `packages/cli`
- `spec-web-ui/` 和 `test-console/` 是独立 Next.js 应用，需要各自安装依赖

### 1. 用 CLI 初始化一个 SpecOS 项目

当前仓库提供一个最小可用的 `specos` CLI，用来初始化和检查 SpecOS 项目骨架。

推荐在一个单独目录里试用，不要直接在本仓库根目录执行 `init`：

```bash
mkdir -p /tmp/specos-demo
cd /tmp/specos-demo
node /Users/liquiid/code/specos-ai/packages/cli/dist/main.js init --template fullstack
node /Users/liquiid/code/specos-ai/packages/cli/dist/main.js check
```

如果你想用轻量模板：

```bash
node /Users/liquiid/code/specos-ai/packages/cli/dist/main.js init --template spec-only
```

当前支持命令：
- `specos init`
- `specos init --template fullstack`
- `specos init --template spec-only`
- `specos check`

当前内置模板：
- `fullstack`
- `spec-only`

初始化后会写入：
- `.specos/manifest.yaml`
- `.specos/workflows/default-fullstack.yaml`
- `spec/`
- `spec-draft/`
- `tests/`
- `ai/agents/`

`spec-only` 模板会保留更轻的骨架：
- `.specos/manifest.yaml`
- `.specos/workflows/default-spec-only.yaml`
- `spec/`
- `spec-draft/`
- `tests/`

`check` 当前会验证：
- `.specos/manifest.yaml` 存在且结构合法
- artifact 目录路径不越出项目根目录
- `spec-draft`、`spec`、`tests`、`tests/results` 等基础目录存在

### 2. 用 `spec-web-ui` 组织项目资产

`spec-web-ui` 当前不是完整 workflow runner，它更像一个“catalog-first workspace”：
- 浏览 rules / templates / agent roles
- 创建项目工作区
- 维护项目 draft
- 导出当前选择资产的 bundle 快照

启动方式：

```bash
cd spec-web-ui
npm install
npm run dev -- --port 3001
```

打开浏览器访问：

- [http://localhost:3001](http://localhost:3001)

建议使用路径：

1. 进入 `discover`，浏览规则、模板、agent 资产
2. 进入 `projects`，创建一个项目工作区
3. 进入项目 draft 页面，编辑结构化草稿
4. 进入 export 页面，生成导出快照并做差异评审

你会看到的主要数据位置：
- 项目工作区：`spec-web-ui/workspace/projects/`
- 导出快照：`spec-web-ui/workspace/exports/`

注意：
- 当前导出默认写到 `spec-web-ui/workspace/exports/<projectId>/`
- 它不会自动把内容回写到仓库根目录的 `spec/`、`tests/`、`ai/agents/`

### 3. 准备 `test-plan`

当前仓库里，`test-console` 不会直接从 `spec-draft/` 或 `spec/` 自动生成测试计划。

它需要你先准备好：

- `tests/plans/<spec>.test-plan.json`

可以先参考现成示例：

- [tests/plans/reward-order.test-plan.json](/Users/liquiid/code/specos-ai/tests/plans/reward-order.test-plan.json)

当前真实情况是：
- `packages/core` 里已经有 `spec`、`test-plan`、`scenario-result` 的 schema 和校验逻辑
- 但仓库里还没有统一命令把 `accepted spec` 自动落成 `tests/plans/*.json`
- 所以这一步目前需要人工准备，或通过你自己的脚本/Agent 生成

### 4. 跑 runner，生成规范化测试结果

当你准备好 `tests/plans/<spec>.test-plan.json` 后，可以从仓库根目录运行：

```bash
node scripts/orchestration/test-runner.mjs reward-order 1.2.0 all
```

参数格式：

```bash
node scripts/orchestration/test-runner.mjs <specId> [specVersion] [api|scenario|all]
```

例如：

```bash
node scripts/orchestration/test-runner.mjs reward-order latest api
node scripts/orchestration/test-runner.mjs reward-order latest scenario
node scripts/orchestration/test-runner.mjs reward-order latest all
```

输出结果会写到：

- `tests/results/<spec>.<run_id>.json`

注意：
- 这个 runner 当前是“模拟/归一化脚本”
- 它会读取 `test-plan` 并拼出标准化 `scenario-result`
- 它当前不会真的去调用 Bruno 或 Playwright 执行测试

### 5. 用 `test-console` 查看结果

启动方式：

```bash
cd test-console
npm install
npm run dev -- --port 3002
```

打开浏览器访问：

- [http://localhost:3002](http://localhost:3002)

你可以做的事：
- 查看最近一次 run 摘要
- 按 spec 查看业务流、场景链、接口拓扑
- 查看 run detail 里的证据摘要
- 通过表单重新触发 runner

`test-console` 当前只消费两类输入：
- `tests/plans/*.json`
- `tests/results/*.json`

### 6. 一条最短可运行闭环

如果你只是想最快体验一遍当前实现，按这个顺序即可：

```bash
# 1) 根目录
npm install
npm run build

# 2) 直接生成一份规范化结果
node scripts/orchestration/test-runner.mjs reward-order 1.2.0 all

# 3) 打开测试控制台
cd test-console
npm install
npm run dev -- --port 3002
```

然后打开：

- [http://localhost:3002](http://localhost:3002)

这会让你看到当前仓库里最完整、最可演示的一条实现链路：

`现成 test-plan -> runner 生成 normalized result -> test-console 可视化`

### 7. 当前还没有自动化打通的部分

下面这些能力在仓库里“有设计、有 schema、有角色定义”，但按当前实现还没有串成统一执行链：

- `spec-draft -> accepted spec` 自动 refine
- `accepted spec -> tests/plans/*.json` 自动生成
- Bruno / Playwright 真实执行并自动归一化
- `spec-web-ui` 一键串联到 `test-console`
- workflow yaml 直接驱动整个运行时

所以更准确地说，当前版本是：

- 已实现 MVP：`项目骨架 -> 资产编排 -> 手工准备 test-plan -> runner 产出 normalized result -> console 展示`
- 未完全实现的大闭环：`draft -> accepted spec -> 自动测试生成 -> 真执行 -> 自动汇总 -> CI 门禁`

## 解决什么问题
- Feature 如何稳定进入 Spec，而不是停留在口头描述。
- Agent 应该读取哪些上下文，如何避免跑偏。
- 接口生成后如何进入 Bruno / API 测试链路。
- 自动化场景测试如何按业务链路可视化。
- 每次改动对应哪个 Spec 版本，如何可追溯。

## 主要能力
### 1. Web UI 初始化与选择
- 选择项目类型：后端 / 前端 / 混合。
- 选择 `project`、`architecture`。
- 按方向与标签筛选 Rules（如 `backend`、`frontend`、`vue`、`react`、`go`、`java`）。
- 快速组合规则、Agent、Spec 模板库，形成项目工程基线。

示例规则（后端）：
- Redis 规范
- 数据库迁移规范（Goose）
- 错误码规范
- 日志规范
- CI 规范

### 2. Spec Draft Studio
- 内置大量可读、可编辑的 Spec 草稿模板。
- 支持先由人写“草稿”，再由 Agent 进行结构化补全和收敛。

建议模板结构：
- 背景 / 目标 / 非目标
- 用户角色 / User Flow / System Flow
- API 草案 / 状态机 / 数据模型
- 业务规则 / 异常场景 / 测试场景
- 运营配置 / 指标日志 / 待确认问题

### 3. Spec Refine Agent
- 负责把 `spec-draft` 转为正式 Spec。
- 自动读取项目 Rules，并按模板补全缺失内容。

工作职责：
- 补充边界、异常、状态、幂等
- 补充权限、审计、测试、错误码
- 发现冲突并提示用户修正

### 4. Agent Template Center
预置标准 Agent 模板，明确输入输出和职责范围：
- Backend API Agent
- DDD Domain Agent
- DB Migration Agent
- Redis Key Agent
- OpenAPI Agent
- Bruno Test Agent
- Playwright Test Agent
- Code Review Agent
- Runbook Agent
- Failure Analysis Agent

### 5. Scenario Test Generator
统一场景测试产物与执行能力：
- `test-scenarios.yaml`
- Bruno API E2E
- Playwright UI E2E
- `scenario-result schema`

支持：
- 生成测试
- 运行测试
- 保存结果
- 失败分析
- 生成报告

### 6. Scenario Report UI
不是普通测试报告，而是业务链路验证视图：
- 按业务场景展示
- 按 User Flow 展示
- 按 System Flow 展示
- 每一步呈现请求、响应、断言、`trace_id`、日志链接

V1 建议独立于 `spec-web-ui/` 落地为单独的测试控制台，只消费统一的 `test-plan` 和 `scenario-result` 产物。

### 7. Workflow Runner
通过工作流编排把“规范、接口、测试、代码、报告”串起来：

```yaml
workflow: reward-feature
steps:
  - refine_spec
  - generate_openapi
  - generate_bruno
  - generate_backend_code
  - run_api_tests
  - generate_report
```

一次触发，串联流程：
`spec draft -> final spec -> 测试 -> 代码 -> 报告`

当前仓库中的最小闭环示例：

- `tests/plans/reward-order.test-plan.json`
- `tests/results/reward-order.run-2026-04-24-001.json`
- `scripts/orchestration/test-runner.mjs`
- `test-console/`

## 与编码 Agent 的关系
SpecOS 不替代代码生成模型，代码仍可由如 `codex`、`claude code` 等工具完成。  
SpecOS 的价值是给这些工具稳定的工程语义与执行边界，降低“生成可跑但不可维护、不可追溯”的风险。

## 为什么要做
- 需求输入不稳定
- Spec 格式不稳定
- 上下文散落
- Agent 角色混乱
- 测试没有固定入口
- 生成结果不可追溯
- 每次对话都要重复解释工程规则

## V1 建议
第一版不追求全自动，建议每一步都支持人工确认（Human-in-the-loop）。
