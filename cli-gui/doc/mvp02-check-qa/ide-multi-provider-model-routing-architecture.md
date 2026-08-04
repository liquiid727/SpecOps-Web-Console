# IDE 多供应商模型与 Agent 路由架构设计

> 状态：Draft  
> 适用范围：桌面 IDE、远程 Web/App 控制端、CLI/API 模型接入层  
> 核心目标：支持多供应商、多模型、自动故障切换、A/B 对比、独立 Review、项目级 Agent 配置与运行时覆盖。

---

## 1. 背景

IDE 将同时接入多种模型执行方式，包括但不限于：

- Codex CLI
- Claude Code CLI
- OpenAI / Anthropic 等官方 API
- GLM、Kimi、Grok、Gemini 等供应商 API
- OpenAI-compatible API
- Ollama 等本地模型
- 企业内部模型网关

不同模型在代码实现、方案规划、规格编写、测试生成、代码审查、长上下文处理、速度和成本方面各有优势。

因此，系统不能只提供一个简单的“默认模型”下拉框，而需要实现一套：

- 多供应商连接管理
- 多模型注册与能力描述
- 模型优先级与路由
- 自动故障回退和熔断
- 用户手动切换模型
- 多模型并行运行与 A/B 对比
- 实现模型与 Review 模型分离
- 全局、项目、Session 和单次运行配置覆盖
- Agent 的 Skill、Knowledge、Tool 和权限配置

---

## 2. 核心设计原则

### 2.1 Agent 不直接绑定具体模型

Agent 不应直接配置：

```yaml
model: claude-sonnet
```

而应绑定一个逻辑模型槽位：

```yaml
modelSlot: review
```

模型槽位再指向一个模型路由：

```yaml
modelSlots:
  review:
    route: review-route
```

路由最终选择具体供应商和模型。

这样可以在不修改 Agent 配置的情况下：

- 更换供应商
- 调整模型优先级
- 增加备用模型
- 启用自动故障切换
- 使用项目级模型覆盖
- 进行 A/B 对比
- 根据成本、延迟或质量动态选择模型

---

### 2.2 Agent 行为与模型执行解耦

Agent 负责定义：

- Prompt
- Skill
- Knowledge
- Tool
- Permission
- Context Rule
- Execution Policy
- Model Slot

模型层负责定义：

- 调用方式
- 供应商认证
- 模型能力
- 上下文限制
- 路由与回退
- 成本和性能
- 健康状态

即：

> Agent 决定“如何完成任务”，Model Route 决定“由谁执行任务”。

---

### 2.3 一次任务允许存在多个执行 Attempt

一个用户任务不应只对应一次模型调用。

```text
ExecutionTask
├── Attempt A：Claude
├── Attempt B：Codex
└── Attempt C：GLM
```

每次切换模型、自动重试、A/B 运行和质量重做，都创建新的 `ExecutionAttempt`，而不是覆盖原结果。

这样可以完整支持：

- 保留历史输出
- 对比多个模型结果
- 选择最终结果
- 统计模型成功率和质量
- 分析故障切换过程
- 追踪成本、Token 和延迟

---

## 3. 总体架构

```text
Provider Connection
        ↓
Model Deployment
        ↓
Model Route / Model Pool
        ↓
Model Slot
        ↓
Agent Profile
        ↓
Pipeline
        ↓
Task / Attempt Runtime
```

各层职责如下：

| 层级 | 主要职责 |
|---|---|
| Provider Connection | 描述如何连接和调用供应商 |
| Model Deployment | 描述一个具体可执行模型实例 |
| Model Route | 决定本次使用哪个模型，以及如何回退 |
| Model Slot | 为 Agent 提供稳定的逻辑模型类型 |
| Agent Profile | 定义 Agent 的行为、技能、知识和权限 |
| Pipeline | 定义多个 Agent 和验证步骤如何协作 |
| Task / Attempt | 保存任务及每一次真实执行记录 |

---

## 4. Provider Connection：供应商连接

Provider Connection 表示“如何调用模型”。

示例：

```text
openai-main
anthropic-main
claude-code-cli
codex-cli
glm-company
kimi-personal
ollama-local
custom-openai-compatible
```

配置示例：

```yaml
providers:
  anthropic-main:
    type: anthropic-api

    auth:
      type: api-key
      secretRef: anthropic-main-key

    endpoint: https://api.anthropic.com

    limits:
      maxConcurrency: 5
      requestsPerMinute: 60

    healthCheck:
      enabled: true
      failureThreshold: 3
      cooldownSeconds: 60
```

### 4.1 Provider 类型

建议至少支持：

```text
openai-api
anthropic-api
openai-compatible
claude-code-cli
codex-cli
local-process
ollama
custom-http
```

### 4.2 Adapter 统一接口

CLI、SDK 和 HTTP API 应通过 Adapter 适配到统一执行接口。

```ts
interface ModelExecutor {
  execute(request: ModelRequest): AsyncIterable<ModelEvent>;

  cancel(runId: string): Promise<void>;

  getCapabilities(): Promise<ModelCapabilities>;

  checkHealth(): Promise<HealthStatus>;
}
```

可实现：

```text
ClaudeCodeCliAdapter
CodexCliAdapter
OpenAIAdapter
AnthropicAdapter
OpenAICompatibleAdapter
OllamaAdapter
LocalProcessAdapter
```

上层 Agent 不关心底层是 CLI、SDK 还是 HTTP。

---

## 5. Model Deployment：模型部署

`ModelDeployment` 表示一个具体可调用的模型实例。

同一个逻辑模型可能通过不同账户、区域、代理节点或调用方式提供，因此不能只保存一个 `modelName`。

```yaml
models:
  claude-sonnet-primary:
    provider: anthropic-main
    model: claude-sonnet-x

    capabilities:
      reasoning: true
      toolCalling: true
      structuredOutput: true
      vision: true
      codeEditing: true

    limits:
      contextWindow: 200000
      maxOutputTokens: 32000

  claude-sonnet-cli:
    provider: claude-code-cli
    model: default

    capabilities:
      nativeSession: true
      terminalTools: true
      codeEditing: true

  local-code-model:
    provider: ollama-local
    model: local-code-model

    capabilities:
      offline: true
      codeEditing: true
```

### 5.1 推荐能力字段

```text
reasoning
toolCalling
structuredOutput
vision
codeEditing
nativeSession
terminalTools
longContext
offline
streaming
promptCaching
```

### 5.2 其他模型元数据

建议同时维护：

- 上下文窗口
- 最大输出长度
- 是否支持图片
- 是否支持 Tool Calling
- 是否支持结构化输出
- 是否支持原生 Session
- 成本等级
- 速度等级
- 质量等级
- 数据隐私等级
- 可用区域
- 最大并发
- 历史成功率
- 历史延迟

---

## 6. Model Route：模型路由

Model Route 决定一次任务最终使用哪个模型。

```yaml
routes:
  general-route:
    strategy: priority

    candidates:
      - model: claude-sonnet-primary
        priority: 100

      - model: codex-cli-default
        priority: 90

      - model: glm-coding
        priority: 60

    fallback:
      maxAttempts: 3

      on:
        - timeout
        - rate_limit
        - provider_error
        - unavailable
        - context_overflow

    circuitBreaker:
      failureThreshold: 3
      cooldownSeconds: 60

    constraints:
      requiredCapabilities:
        - toolCalling
        - codeEditing
```

### 6.1 路由策略

建议逐步支持：

| 策略 | 说明 |
|---|---|
| `priority` | 按优先级依次尝试 |
| `manual` | 由用户手动选择 |
| `parallel` | 多模型并行执行 |
| `weighted` | 按权重分流 |
| `least_latency` | 优先近期延迟最低的模型 |
| `least_cost` | 优先低成本模型 |
| `quality_first` | 优先历史质量较高的模型 |

MVP 优先实现：

```text
priority
manual
parallel
```

### 6.2 路由候选约束

路由可以要求模型必须具备某些能力：

```yaml
constraints:
  requiredCapabilities:
    - toolCalling
    - codeEditing

  minContextWindow: 100000
  allowLocalModel: true
  allowRemoteModel: true
```

---

## 7. Model Slot：逻辑模型槽位

Model Slot 是 Agent 和模型路由之间的稳定抽象层。

```yaml
modelSlots:
  general:
    route: general-route

  plan:
    route: planning-route

  spec:
    route: specification-route

  implementation:
    route: coding-route

  test:
    route: testing-route

  review:
    route: review-route
```

### 7.1 基础槽位

建议系统内置：

| Slot | 用途 |
|---|---|
| `general` | 普通对话和默认任务 |
| `plan` | 方案规划与任务拆解 |
| `spec` | 规格和需求设计 |
| `implementation` | 代码实现与修改 |
| `test` | 测试设计、生成和修复 |
| `review` | 代码与方案审查 |

### 7.2 可扩展槽位

后续可以增加：

```text
fast
cheap
long-context
vision
security
refactor
documentation
research
```

用户修改一个 Model Slot 后，所有引用该 Slot 的 Agent 都会自动使用新的路由配置。

---

## 8. Agent Profile：Agent 配置

Agent Profile 定义角色的行为方式。

```yaml
agents:
  architecture-agent:
    modelSlot: plan

    promptRef: agents/architecture.md

    skills:
      - system-design
      - ddd
      - architecture-review

    knowledge:
      - project-architecture
      - internal-conventions

    tools:
      - filesystem.read
      - code.search
      - git.diff

    permissions:
      filesystemWrite: false
      shellExecute: false

  implementation-agent:
    modelSlot: implementation

    promptRef: agents/implementation.md

    skills:
      - coding
      - refactoring
      - debugging

    tools:
      - filesystem.read
      - filesystem.write
      - shell.execute
      - git.diff

  reviewer:
    modelSlot: review

    promptRef: agents/reviewer.md

    tools:
      - filesystem.read
      - git.diff
      - test.results

    permissions:
      filesystemWrite: false
```

### 8.1 Agent 配置内容

```text
Prompt
Model Slot
Skills
Knowledge
Tools
Permissions
Context Includes
Context Excludes
Execution Policy
Output Schema
```

### 8.2 不应放入 Agent 的内容

以下配置应位于模型或路由层，而不是 Agent：

- API Key
- Endpoint
- 模型优先级
- 熔断策略
- 请求限流
- 供应商健康状态
- 模型成本
- 模型故障切换

---

## 9. Skill 与 Knowledge 配置

Skill 和 Knowledge 属于 Agent 行为层，不属于模型层。

### 9.1 Agent 固有能力

```yaml
agents:
  reviewer:
    skills:
      - code-review
      - security-review
```

### 9.2 项目公共知识

```yaml
project:
  knowledge:
    - AGENTS.md
    - docs/architecture/**
    - docs/specs/**
```

### 9.3 项目级 Agent 覆盖

```yaml
project:
  agents:
    reviewer:
      knowledge:
        add:
          - docs/review-checklist.md

      skills:
        add:
          - tauri-security-review
```

### 9.4 Knowledge 类型

可以支持：

```text
file
directory
glob
url
database
vector-index
generated-summary
session-memory
```

---

## 10. 配置覆盖规则

系统会同时存在全局、项目和运行时配置，因此必须定义稳定的覆盖优先级。

```text
系统内置默认值
    ↓
用户全局配置
    ↓
工作区配置
    ↓
项目配置
    ↓
Agent 项目覆盖
    ↓
Session 临时配置
    ↓
单次运行 Override
```

越靠下优先级越高。

### 10.1 全局配置

```yaml
modelSlots:
  general:
    route: general-route

  review:
    route: review-route
```

### 10.2 项目覆盖

```yaml
project:
  id: spec-os

  modelSlots:
    implementation:
      route: spec-os-coding-route

    review:
      route: strict-review-route

  agents:
    implementation-agent:
      skills:
        add:
          - spec-os-conventions
          - tauri-development

      knowledge:
        add:
          - docs/architecture/**
          - docs/coding-standards.md
```

### 10.3 单次运行覆盖

用户可以在运行前选择：

```text
本次使用 Claude
本次使用 Codex
同时运行 Claude 与 Codex
忽略自动回退
启用严格 Review
```

### 10.4 配置来源可视化

UI 必须展示最终配置来自哪一层：

```text
系统默认
用户全局
工作区
项目
Agent 覆盖
Session
本次运行
```

否则配置问题会非常难以排查。

---

## 11. 自动切换机制

自动切换应分为三类，不能全部放在同一个 fallback 中。

---

### 11.1 技术故障回退

适合完全自动处理：

- 网络错误
- 请求超时
- 供应商限流
- 服务不可用
- CLI 异常退出
- 模型不存在
- 上下文超限
- 临时认证故障
- 流式响应中断

执行流程：

```text
模型请求失败
    ↓
记录 ExecutionAttempt
    ↓
更新模型健康状态
    ↓
判断是否触发熔断
    ↓
选择下一个候选模型
    ↓
创建新的 ExecutionAttempt
```

---

### 11.2 性能退化切换

可以根据运行指标动态降低模型优先级：

- 首 Token 延迟
- 总响应时长
- 工具调用失败率
- 中断率
- 平均成本
- 最近错误率
- 队列等待时间

```yaml
routingRules:
  - when:
      p95LatencyGreaterThanMs: 15000
    action:
      lowerPriority: claude-sonnet-primary

  - when:
      errorRateGreaterThan: 0.3
      sampleWindow: 20
    action:
      openCircuit: true
```

---

### 11.3 质量不足重试

“质量差”不能依赖 HTTP 状态判断，需要质量评估器。

可用评价信号：

- 编译是否成功
- 测试是否通过
- Lint 是否通过
- 类型检查是否通过
- 是否符合 Spec
- Reviewer 评分
- 用户是否接受
- 是否发生回滚
- 修改是否超出允许范围

```yaml
qualityGate:
  evaluators:
    - type: test-result
      required: true

    - type: model-review
      modelSlot: review
      minimumScore: 0.75

  onFailure:
    action: retry-with-next-model
    maxRetries: 1
```

应明确区分：

```text
Technical Fallback
技术故障后的自动切换

Quality Retry
质量评估失败后的重新生成

User Retry
用户不满意后的主动切换
```

质量重试会产生额外成本，不建议默认无限自动执行。

---

## 12. 熔断与恢复

每个 Model Deployment 应维护独立健康状态。

```text
closed
open
half-open
```

### 12.1 状态说明

- `closed`：正常接受请求
- `open`：暂时停止路由
- `half-open`：冷却后允许少量探测请求

### 12.2 示例配置

```yaml
circuitBreaker:
  failureThreshold: 3
  sampleWindowSeconds: 120
  cooldownSeconds: 60
  halfOpenMaxRequests: 1
```

### 12.3 错误分类

并非所有错误都应触发熔断。

建议区分：

```text
provider_failure
rate_limit
timeout
network_failure
authentication_failure
invalid_request
context_overflow
tool_failure
user_cancelled
```

例如：

- `invalid_request` 通常是请求配置问题，不应判定供应商不可用
- `user_cancelled` 不应计入失败率
- `rate_limit` 可以暂时降级或短期熔断
- `authentication_failure` 应提示用户修复配置

---

## 13. 用户主动切换模型

用户对结果不满意时，可以选择“换一个模型”。

切换时应：

1. 保留当前输出
2. 固定相同输入快照
3. 选择路由中的下一个模型
4. 创建新的 ExecutionAttempt
5. 在独立环境中执行
6. 展示结果差异
7. 允许用户选择最终结果

```ts
interface ExecutionAttempt {
  id: string;
  taskId: string;

  providerConnectionId: string;
  modelDeploymentId: string;
  routeId: string;

  inputSnapshotId: string;
  outputArtifactId?: string;

  status:
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";

  latencyMs?: number;
  tokenUsage?: TokenUsage;
  cost?: number;

  failureReason?: string;
  evaluation?: EvaluationResult;
}
```

---

## 14. A/B 多模型运行

A/B 模式可以作为一种模型路由策略。

```yaml
routes:
  coding-ab-route:
    strategy: parallel

    candidates:
      - model: claude-sonnet-primary
      - model: codex-cli-default

    parallel:
      maxCandidates: 2
      completionPolicy: all

    comparison:
      mode: user-select
```

### 14.1 用户手动选择

```text
Claude 结果 ─┐
             ├── 用户选择最终结果
Codex 结果  ─┘
```

### 14.2 Reviewer 自动推荐

```text
Claude 结果 ─┐
             ├── Reviewer ── 推荐最终结果
Codex 结果  ─┘
```

### 14.3 综合多个结果

适合：

- Plan
- Spec
- 架构方案
- 测试计划
- 风险分析

```text
模型 A 方案 ─┐
             ├── Synthesis Agent ── 最终方案
模型 B 方案 ─┘
```

对于代码修改，不建议直接把两个模型的修改自动合并。

---

## 15. 代码 Attempt 的隔离环境

多个模型并行修改代码时，不能直接写入同一工作区。

每个 Attempt 应使用独立环境：

```text
Git Worktree
临时 Git 分支
虚拟文件系统快照
Patch Sandbox
Container Workspace
```

推荐流程：

```text
基础代码快照
├── Attempt A Worktree
└── Attempt B Worktree
        ↓
生成独立 Patch
        ↓
测试与 Review
        ↓
用户选择
        ↓
合并到主工作区
```

每个 Attempt 应记录：

- 基础 Commit
- 工作区快照
- 修改文件列表
- Patch
- 构建结果
- 测试结果
- Review 结果
- 最终是否被采用

---

## 16. 独立 Review Pipeline

实现模型完成代码后，应允许使用另一个模型进行独立 Review。

```text
Plan
  ↓
Implementation
  ↓
Build / Test / Lint
  ↓
Independent Review
  ↓
Fix
  ↓
Final Verification
```

配置示例：

```yaml
pipelines:
  coding-default:
    steps:
      - id: implement
        agent: implementation-agent
        modelSlot: implementation

      - id: verify
        type: command
        commands:
          - npm run lint
          - npm run test
          - npm run build

      - id: review
        agent: reviewer
        modelSlot: review

        input:
          - taskSpec
          - gitDiff
          - changedFiles
          - testResults

      - id: fix
        agent: implementation-agent
        modelSlot: implementation

        when:
          reviewDecision: changes_requested

      - id: final-verify
        type: command
```

### 16.1 Review 策略

```yaml
reviewPolicy:
  requireDifferentModel: true
  requireDifferentProvider: false
  maxFixRounds: 2
```

例如：

```text
实现：Claude
审查：Codex
```

或：

```text
实现：Codex
审查：Claude
```

`requireDifferentProvider` 不应默认开启，因为同一供应商的不同模型也可能形成有效审查。

---

## 17. Pipeline 设计

Pipeline 用于编排 Agent、模型调用和确定性工具。

支持的 Step 类型可以包括：

```text
agent
command
approval
condition
parallel
review
merge
artifact
notification
```

示例：

```yaml
pipelines:
  feature-development:
    steps:
      - id: plan
        agent: planning-agent

      - id: approve-plan
        type: approval

      - id: implement
        agent: implementation-agent

      - id: test
        agent: testing-agent

      - id: verify
        type: command

      - id: review
        agent: reviewer

      - id: finish
        type: artifact
```

Pipeline 应保存每一步：

- 输入
- 输出
- Agent
- Model Slot
- 实际 Model Deployment
- Attempt
- 状态
- 耗时
- 费用
- 失败原因

---

## 18. 运行时选择流程

一次 Agent 运行的建议流程：

```text
1. 解析 Agent Profile
2. 合并全局、项目、Session 和 Run Override
3. 得到最终 Model Slot
4. 根据 Model Slot 找到 Model Route
5. 过滤不满足能力约束的模型
6. 排除处于熔断状态的模型
7. 根据 Route Strategy 选择候选模型
8. 创建 ExecutionTask
9. 创建 ExecutionAttempt
10. 调用 Model Executor
11. 收集流式事件与工具调用
12. 保存输出 Artifact
13. 执行 Quality Gate
14. 必要时回退、重试或等待用户选择
15. 标记最终采用的 Attempt
```

---

## 19. 推荐配置结构

```yaml
version: 1

providers:
  anthropic-main:
    type: anthropic-api
    auth:
      secretRef: anthropic-key

  claude-cli:
    type: claude-code-cli
    executable: claude

  codex-cli:
    type: codex-cli
    executable: codex

models:
  claude-primary:
    provider: anthropic-main
    model: claude-sonnet-x

    capabilities:
      - reasoning
      - tools
      - code
      - vision

  claude-code:
    provider: claude-cli
    model: default

    capabilities:
      - native-session
      - tools
      - code

  codex-code:
    provider: codex-cli
    model: default

    capabilities:
      - native-session
      - tools
      - code

routes:
  general-route:
    strategy: priority

    candidates:
      - model: claude-primary
        priority: 100

      - model: codex-code
        priority: 80

    fallback:
      maxAttempts: 2

      on:
        - timeout
        - rate_limit
        - unavailable
        - provider_error

  implementation-route:
    strategy: priority

    candidates:
      - model: codex-code
        priority: 100

      - model: claude-code
        priority: 90

  review-route:
    strategy: priority

    candidates:
      - model: claude-primary
        priority: 100

      - model: codex-code
        priority: 80

modelSlots:
  general:
    route: general-route

  plan:
    route: general-route

  spec:
    route: general-route

  implementation:
    route: implementation-route

  test:
    route: implementation-route

  review:
    route: review-route

agents:
  general-agent:
    modelSlot: general
    promptRef: agents/general.md

  planning-agent:
    modelSlot: plan
    promptRef: agents/planning.md

    skills:
      - planning
      - decomposition

  implementation-agent:
    modelSlot: implementation
    promptRef: agents/implementation.md

    skills:
      - coding
      - debugging

  testing-agent:
    modelSlot: test
    promptRef: agents/testing.md

    skills:
      - test-design
      - test-execution

  reviewer:
    modelSlot: review
    promptRef: agents/reviewer.md

    skills:
      - code-review

pipelines:
  implementation-with-review:
    steps:
      - agent: implementation-agent
      - type: verification
      - agent: reviewer
```

---

## 20. UI 信息架构

建议将配置中心拆成五个页面。

### 20.1 供应商与账户

展示：

```text
Anthropic API       正常
Claude Code CLI     正常
Codex CLI           正常
GLM API             限流中
Ollama              离线
```

支持配置：

- API Key / OAuth / CLI 登录
- Endpoint
- 代理
- 请求限流
- 最大并发
- 健康检查
- 数据隐私说明
- 启用与停用

---

### 20.2 模型

展示模型能力：

```text
工具调用
代码编辑
图片理解
结构化输出
上下文长度
最大输出
费用等级
速度等级
Session 恢复
健康状态
```

模型能力可以由系统自动探测，但应允许用户人工修正。

---

### 20.3 模型路由

可视化配置：

```text
Implementation Route

1. Codex CLI
2. Claude Code CLI
3. GLM Coding

技术故障自动切换：开启
质量失败后重试：询问用户
熔断：开启
```

支持拖拽排序、启停候选模型和设置权重。

---

### 20.4 Agent

配置：

```text
Prompt
Model Slot
Skills
Knowledge
Tools
Permissions
Context Rules
Execution Policy
```

---

### 20.5 项目覆盖

展示继承关系：

```text
General
全局：general-route
项目：未覆盖

Review
全局：review-route
项目：strict-review-route
```

每个字段应展示：

- 当前最终值
- 来源层级
- 是否被覆盖
- 恢复继承按钮

---

## 21. 核心数据实体

建议至少包含：

```text
ProviderConnection
ModelDeployment
ModelRoute
ModelRouteCandidate
ModelSlotBinding
AgentProfile
AgentProjectOverride
PipelineDefinition
PipelineRun
PipelineStepRun
ExecutionTask
ExecutionAttempt
ModelHealthState
EvaluationRecord
UsageRecord
Artifact
WorkspaceSnapshot
```

### 21.1 关键关系

```text
ProviderConnection
    └── ModelDeployment

ModelRoute
    └── ModelRouteCandidate
            └── ModelDeployment

ModelSlotBinding
    └── ModelRoute

AgentProfile
    └── ModelSlotBinding

ExecutionTask
    ├── ExecutionAttempt
    ├── ExecutionAttempt
    └── ExecutionAttempt
```

---

## 22. 建议的领域对象

```ts
interface ProviderConnection {
  id: string;
  type: ProviderType;
  name: string;
  authRef?: string;
  endpoint?: string;
  enabled: boolean;
}

interface ModelDeployment {
  id: string;
  providerConnectionId: string;
  modelName: string;
  capabilities: ModelCapabilities;
  limits: ModelLimits;
  enabled: boolean;
}

interface ModelRoute {
  id: string;
  strategy: RouteStrategy;
  candidates: ModelRouteCandidate[];
  fallbackPolicy?: FallbackPolicy;
  circuitBreakerPolicy?: CircuitBreakerPolicy;
  constraints?: RouteConstraints;
}

interface ModelSlotBinding {
  slot: string;
  routeId: string;
}

interface AgentProfile {
  id: string;
  modelSlot: string;
  promptRef: string;
  skills: string[];
  knowledge: string[];
  tools: string[];
  permissions: AgentPermissions;
}

interface ExecutionTask {
  id: string;
  agentId: string;
  status: TaskStatus;
  selectedAttemptId?: string;
  createdAt: string;
}

interface ExecutionAttempt {
  id: string;
  taskId: string;
  modelDeploymentId: string;
  routeId: string;
  status: AttemptStatus;
  inputSnapshotId: string;
  outputArtifactId?: string;
  evaluationId?: string;
}
```

---

## 23. 可观测性

系统需要记录模型和路由运行指标。

### 23.1 模型指标

- 请求总数
- 成功率
- 错误率
- 超时率
- 首 Token 延迟
- 总响应时长
- Tool Calling 成功率
- 输入 / 输出 Token
- 成本
- 用户接受率
- Review 通过率
- 测试通过率

### 23.2 路由指标

- 首选模型命中率
- 自动切换次数
- 平均 Attempt 数
- 熔断次数
- 回退成功率
- A/B 最终选择比例
- 不同任务类型的模型表现

### 23.3 调试信息

一次执行应可以查看：

```text
为什么选择这个模型
哪些模型被过滤
哪些模型正在熔断
实际使用了哪个 Provider
是否发生回退
每个 Attempt 的失败原因
最终结果为什么被采用
```

---

## 24. 安全与权限

供应商密钥不应直接写入项目配置文件。

应使用：

```yaml
auth:
  secretRef: anthropic-main-key
```

Secret 可以存储在：

- 系统 Keychain
- Windows Credential Manager
- macOS Keychain
- Linux Secret Service
- 企业 Secret Manager

项目配置只保存引用，不保存真实凭证。

Agent 权限应与模型能力分开管理。

即使模型支持工具调用，也必须经过 Agent Permission 和 Tool Policy 校验。

```text
模型提出工具调用
        ↓
Agent Tool Policy 校验
        ↓
项目权限校验
        ↓
用户审批策略校验
        ↓
实际执行
```

---

## 25. MVP 实施顺序

### 第一阶段：基础运行框架

优先实现：

- CLI / API Adapter 统一接口
- Provider Connection
- Model Deployment
- Model Slot
- Priority Route
- 技术故障自动回退
- 基础熔断
- 全局与项目配置覆盖
- ExecutionTask / ExecutionAttempt
- 基础运行日志

这一阶段不做复杂动态质量路由。

---

### 第二阶段：多模型协作

增加：

- 用户手动切换模型
- 同任务多个 Attempt
- A/B 并行运行
- 独立代码工作区
- Patch 对比
- Review Pipeline
- 测试结果作为 Quality Gate
- 用户选择最终 Attempt

---

### 第三阶段：智能路由

增加：

- 动态优先级
- 延迟与成本优化
- 自动熔断恢复
- 模型历史质量统计
- 自动 Reviewer 选择
- 多结果综合
- 项目级模型推荐
- 复杂多 Agent Workflow

---

## 26. MVP 非目标

第一阶段暂不建议实现：

- 完全依赖 LLM 的自动质量评分
- 无限制自动重试
- 两个模型同时修改同一工作区
- 自动合并两个模型的代码结果
- 过度复杂的工作流 DSL
- 基于少量样本的智能模型推荐
- 对供应商内部模型做强耦合逻辑

这些能力应在基础运行数据、质量指标和隔离执行环境稳定后再引入。

---

## 27. 最终核心抽象

```text
Provider
怎么调用

Model
调用什么

Route
本次选择哪个模型，以及如何回退

Slot
当前任务需要哪一类模型能力

Agent
如何完成任务

Pipeline
多个 Agent 和验证步骤如何协作

Task
用户希望完成的目标

Attempt
某个模型的一次真实执行
```

采用该分层后，无论未来接入：

- Codex CLI
- Claude Code CLI
- GLM
- Kimi
- Grok
- Gemini
- OpenAI-compatible
- 企业内部模型
- 本地模型

都只需要新增或调整 Provider Adapter 与 Model Deployment。

上层 Agent、Pipeline、项目配置和 UI 不需要因为供应商变化而重构。

---

## 28. 架构决策摘要

1. Agent 绑定 Model Slot，不直接绑定具体模型。
2. Model Slot 指向 Model Route。
3. Model Route 管理优先级、回退、熔断和并行。
4. Provider Connection 与 Model Deployment 分离。
5. Skill、Knowledge、Tool 和 Permission 属于 Agent。
6. 一次 Task 可以拥有多个 Attempt。
7. 技术故障回退、质量重试和用户重试分开处理。
8. 多模型修改代码时使用隔离工作区。
9. 实现与 Review 可以要求使用不同模型。
10. 配置按全局、项目、Session 和单次运行逐层覆盖。
11. UI 必须展示最终配置值及其来源。
12. 动态质量路由放在基础架构稳定后的阶段实现。
