# SpecOS 使用说明

## 一句话介绍
SpecOS 是一个面向工程与业务系统开发的 **Spec-Driven AI IDE**。  
它的核心不是“让 AI 直接写代码”，而是让需求、Spec、Agent、测试、接口、CI、报告，围绕同一套工程语义持续流转。

## 核心定位
- 把需求变成结构化输入，而不是零散对话。
- 把 `spec-draft` 变成可追踪、可演进的正式 Spec。
- 把 Agent 从“随意发挥”变成“职责明确、上下文受控”。
- 把测试和报告纳入同一条业务链路，支持回溯和审计。

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




