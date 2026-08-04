# Codeg ACP 项目分析与 CLI GUI 适配学习

> 类型：外部项目分析与学习记录
>
> 状态：Research，非 CLI GUI 规范设计
>
> 分析基线：Codeg `v0.23.1`，commit `f1a727d3561a0c6b26359e6ab02cfbe80f618782`
>
> 分析时间：2026-08-04（Asia/Singapore）

## 1. 文档目的

本文档分析 [Codeg](https://github.com/xintaofei/codeg) 的项目结构、ACP
（Agent Client Protocol）运行时和 Agent 适配方式，并将可迁移的设计映射到
本仓库的 `cli-gui`。

本文档不是 Codeg 源码的镜像，也不是新的平台规范。它只记录：

- Codeg 当前代码实际做了什么；
- 哪些 ACP 设计值得 SpecOS 借鉴；
- 哪些设计需要改造成 TypeScript/Node.js 运行时边界；
- 哪些能力暂时不应引入 CLI GUI。

Codeg 仓库声明使用 Apache-2.0。本文档只做结构化总结和路径级引用，不复制
大段源代码、依赖或第三方资源。

## 2. 结论摘要

Codeg 最值得学习的不是“支持了很多 Agent”，而是把 Agent 接入拆成了几层
可验证的合同：

1. **Agent 身份、分发方式和协议适配关系分离。** `AgentType`、registry id、
   `npx`/binary/`uvx` 分发信息，以及 vendor CLI 与 ACP adapter 的关系，不被
   混成一个命令字符串。
2. **ACP 是有状态的 Session Runtime，不是一次性 stdout parser。** 一个连接
   持有初始化结果、原生 session id、能力、pending permission 和 turn 状态，
   由 `ConnectionManager` 统一管理。
3. **原始协议、规范事件和可恢复 snapshot 同时存在。** ACP wire event 被映射
   为稳定的 `AcpEvent`，连接状态保留可冷启动恢复的 snapshot，custom Agent 的
   原始 ACP transcript 另行保留。
4. **厂商差异集中在适配层和测试中。** ACP 的公共生命周期保持一致，Claude、
   Codex、Grok、Cursor 等特殊 metadata、extension request 和缺失字段由窄门
   分支处理，不扩散到前端。
5. **自定义 Agent 的扩展点是分发描述，而不是复制一份客户端。** ACP Registry
   的 distribution 对象可以转为运行时 launch metadata，用户注册的 Agent
   仍然复用同一套连接、事件和 UI 管道。

对当前 CLI GUI 的直接启示是：现有 `AgentBackend` / `BackendSessionHandle`
边界是正确起点，但 `GenericAcpBackend` 目前仍只是冻结的扩展合同和 PTY
占位，尚未形成真实 ACP transport、session lifecycle、typed snapshot 和
adapter preflight。

## 3. 分析范围与来源

### 3.1 外部项目范围

本次采用“全项目概览 + ACP 深度分析”：

- 根目录 `README.md`、`AGENTS.md`、`LICENSE`、`package.json`；
- `src-tauri/Cargo.toml` 和三种运行入口：桌面 `codeg`、服务器
  `codeg-server`、MCP 伴生进程 `codeg-mcp`；
- `src-tauri/src/acp/` 下的注册表、连接、状态、事件、preflight、缓存和
  delegation 模块；
- `src-tauri/src/commands/acp.rs`、`src-tauri/src/web/handlers/acp.rs`、
  `src-tauri/src/db/entities/custom_agent.rs`；
- `src-tauri/tests/` 下的 API、WebSocket、snapshot 和 delegation 测试。

### 3.2 本仓库对照范围

对照以下现有合同，不改变其规范性：

- `cli-gui/shared/agent-runtime.ts`
- `cli-gui/server/agent-backends.ts`
- `cli-gui/server/profile-adapters.ts`
- `cli-gui/doc/mvp02/spec/agent-runtime-spec.md`
- `design/cli-gui-platform-design.md`

### 3.3 事实与建议的区分

本文档中的“Codeg 现状”来自上述固定 commit 的代码；“对 CLI GUI 的建议”
是适配意见，不能替代 `.prd/`、`.features/` 或 `design/` 中的批准内容。

## 4. Codeg 项目概览

### 4.1 产品定位

Codeg 是一个 local-first 的多 Agent 编码工作台。它将 Claude Code、Codex、
Gemini、OpenCode、Cline、Hermes、Cursor 等 Agent 的会话聚合到一个工作区，
并通过 ACP 让主 Agent 可以委托不同类型的子 Agent。

用户侧能力包括：

- 聚合、搜索和恢复不同 Agent 的历史会话；
- 在同一工作区中查看文件、diff、Git 和 Agent 输出；
- 通过 `@` 委托其他 Agent，实时显示子任务结果；
- 处理 permission、question、plan approval 等阻塞式交互；
- 以桌面应用、独立服务器或 Docker 方式运行；
- 从 ACP Registry 或 distribution JSON 注册自定义 Agent。

### 4.2 技术栈

| 层 | 技术 | 作用 |
| --- | --- | --- |
| 桌面运行时 | Tauri 2 + Rust | 本地文件、进程、凭据和桌面能力 |
| Web 前端 | Next.js 16、React 19、TypeScript strict | 工作区、会话和设置 UI |
| 服务器 | Rust、Axum、WebSocket | 无桌面模式和远程访问 |
| 持久化 | SeaORM + SQLite | 会话、Agent、delegation 和设置元数据 |
| ACP | `sacp` 11、`sacp-tokio` 11 | ACP schema、JSON-RPC 和子进程连接 |
| 分发 | npm、uvx、平台二进制 | 安装和启动 Agent adapter |
| 测试 | Rust unit/integration、Vitest、snapshot | 协议、解析、API 和跨平台行为 |

### 4.3 运行形态

```text
Desktop codeg
  Tauri WebView -> Rust AppState -> ACP ConnectionManager

Standalone codeg-server
  Browser/mobile -> Axum HTTP/WS -> same ACP core

Agent process
  codeg-mcp (per launch) -> UDS/named pipe -> DelegationBroker
  ACP adapter/CLI -> stdio JSON-RPC -> ConnectionManager
```

桌面和服务器共用 ACP 核心；事件发射器区分 Tauri 和 Web-only，但不复制
Agent 会话语义。

## 5. ACP 子系统结构

### 5.1 模块职责

| Codeg 模块 | 主要职责 | 设计价值 |
| --- | --- | --- |
| `acp/registry.rs` | 内置 Agent、registry id、分发描述、能力开关 | 统一身份与启动元数据 |
| `acp/custom_registry.rs` | 将 DB 中的自定义定义 hydrate 为运行时 metadata | 不复制连接实现即可扩展 Agent |
| `acp/remote_registry.rs` | 获取 ACP Registry、选择分发渠道、生成定义 | 将公开 Registry 接到设置流程 |
| `acp/connection.rs` | 构造 Agent、initialize、session 请求、事件映射 | ACP wire 与产品事件的边界 |
| `acp/manager.rs` | 连接表、prompt 串行化、取消、fork、snapshot 查询 | Session 生命周期的唯一所有者 |
| `acp/types.rs` | `AcpEvent`、连接信息、能力和 UI 所需结构 | 稳定的跨端事件合同 |
| `acp/session_state.rs` | live messages、权限、问题、模式和 usage snapshot | 断线后冷启动恢复 |
| `acp/event_stream.rs` | 事件订阅、seq、限流和广播 | 连接内事件顺序和观察者隔离 |
| `acp/lifecycle.rs` | Session 状态、Transcript 关联、delegation 完成 | 将实时事件落到产品事实 |
| `acp/preflight.rs` | Node/uv/版本/二进制和 adapter 检查 | 将启动失败提前变成可修复状态 |
| `acp/binary_cache.rs` | 下载、SHA-256、解压、版本缓存和清理 | 安全且可重复的 Agent 安装 |
| `acp/delegation/*` | broker、子连接、父子关系和本地 IPC | 主 Agent 到子 Agent 的异步委托 |

### 5.2 身份、分发和协议适配

Codeg 的 `AgentDistribution` 有三个主要通道：

- `Npx`：固定 npm package、console command、参数、环境变量和 Node 版本下限；
- `Binary`：按平台声明 archive、启动路径和 SHA-256；
- `Uvx`：固定 Python package、console script、uv/Python 版本和可选 PATH fallback。

内置 Agent 使用编译期注册表；自定义 Agent 存储 ACP Registry 的 distribution
对象，并在启动时转成同样的 `AcpAgentMeta`。这样 `connection.rs`、
`preflight.rs` 和 `binary_cache.rs` 不需要为每个自定义 Agent 增加新分支。

### 5.3 ACP adapter 与 vendor CLI 的关系

Codeg 对 Claude Code 和 Codex 做了一个非常重要的区分：

```text
用户安装的 vendor CLI       ACP adapter package
claude / codex          ->  claude-agent-acp / codex-acp
共享登录和配置目录       ->  通过 ACP stdio 提供统一协议
```

`AcpAdapterRelation` 保存：

- 用户真正安装的 native command 和显示名称；
- adapter 与 vendor CLI 共用的配置/凭据目录；
- GUI 启动时常见的额外 PATH 目录；
- 解释 adapter/vendor CLI 差异的帮助链接。

这使得“Claude CLI 已安装但 ACP adapter 缺失”可以被报告为准确的可修复
状态，而不是误报为 Agent 未安装。Codeg 当前只对确实由第三方 adapter 包装
的 Agent 建立该关系，其他 Agent 的 ACP entry 直接就是 vendor CLI。

### 5.4 自定义 Agent 注册和 hydrate

自定义 Agent 的持久化实体包含：

- ACP `registry_id`、名称、描述和版本；
- 用户选择的 `distribution_kind`；
- 原始 `spec_json`；
- icon、skills 声明、来源和 version probe；
- 创建/更新时间。

运行时流程为：

```text
DB custom_agent rows
    -> validate
    -> fingerprint unchanged definitions
    -> hydrate into process registry
    -> get_agent_meta(AgentType::Custom(id))
    -> same ConnectionManager / event / UI path
```

Codeg 采用 fingerprint 复用不变 metadata，以减少重复分配；非法定义只被跳过
并返回错误，不拖垮其他 Agent 或整个应用启动。

自定义定义的安全约束包括：

- registry id 只能使用限定字符和长度；
- 版本必须能作为单一路径段；
- binary archive 的启动路径不能是绝对路径或包含 `..`；
- 当前平台必须有可用 binary release；
- binary 下载在有 SHA-256 时必须校验后才能解压；
- console command 可以从 registry metadata 推导，但允许用户明确覆盖。

### 5.5 Registry 导入流程

远端 ACP Registry 的完整 entry 会被投影为设置页可用的 catalog item，附带：

- 是否为 Codeg 内置 Agent；
- 是否已安装；
- 当前平台是否支持；
- 可用分发通道；
- 原始 distribution 对象。

默认分发选择优先级是“当前平台可运行的 binary，其次 npx，再次 uvx”。如果
用户明确选择一个 entry 不提供的通道，流程会返回配置错误，而不是静默换用
其他通道。

## 6. 连接和会话生命周期

### 6.1 创建连接

连接由 `ConnectionManager` 按 Agent 类型创建，`connection.rs` 根据 registry
metadata 构造 `sacp_tokio::AcpAgent`。连接对象至少持有：

- Codeg 内部 connection id；
- Agent type；
- `Arc<RwLock<SessionState>>`；
- command channel；
- event emitter；
- prompt lock；
- spawn-time config fingerprint；
- child process pid backstop。

prompt lock 覆盖会话链接检查、数据库写入、事件发射和命令入队，避免多个浏览器
窗口同时发送时重复创建 conversation 或让同一 Agent 同时接收两个 prompt。

### 6.2 初始化和 session 请求

典型流程如下：

```text
spawn Agent process
  -> ACP initialize
  -> 读取 protocol version / agent_info / capabilities
  -> session/new
       或 session/resume
       或 session/load
  -> 广播 SessionStarted + capability snapshot
  -> session/prompt
  -> session/update stream + prompt response
  -> TurnComplete / Error
```

`initialize` 返回的能力决定 Codeg 是否发送 filesystem、terminal、MCP、
elicitation、plan、steering 等能力声明。`session/new`、`session/load` 和
`session/resume` 共享 MCP 与 client capability 构造逻辑，但会按 Agent metadata
处理差异，例如 OpenClaw 不接受非空 `mcpServers`。

### 6.3 恢复与 transcript

ACP 没有一个可以替代产品持久化的统一会话数据库，因此 Codeg 同时保存：

- Agent 原生 session id；
- Codeg 自己的 conversation/session identity；
- `SessionState` 的实时 snapshot；
- custom Agent 的 prompt、raw `session/update` 和 turn end transcript。

当 `session/load` 失败时，Codeg 会分类错误：没有 resume 能力或 session 不存在
时可以降级到 `session/new`，并通过 `continues_from` 将新 transcript 连接到旧
session；不可恢复的协议/认证错误则向 UI 暴露稳定错误，不假装恢复成功。

这条设计保护了两个事实：Agent 原生历史可能消失，但用户已经看到的产品历史
不能消失；连接恢复也不能把一轮事件重复写入 transcript。

## 7. 事件归一化和交互合同

### 7.1 双层事件模型

Codeg 的事件链可以概括为：

```text
ACP JSON-RPC / SessionUpdate
        -> connection.rs vendor-aware normalization
        -> AcpEvent
        -> EventEnvelope(seq, connection/session ids)
        -> SessionState + event bus + Web/Tauri clients
        -> lifecycle subscriber / transcript / DB
```

`AcpEvent` 覆盖用户消息、内容增量、thinking、tool call/update、文件变化、
权限、question、plan、mode、config、usage、turn complete、错误、delegation
和 config stale 等产品需要的类别。

规范化原则包括：

- 高频内容增量可以实时广播，但 snapshot 必须能让新客户端冷启动；
- tool output 对重复 cumulative snapshot 做 suffix diff，避免 O(N²) 传输；
- 不识别的 vendor update 变成 diagnostic，不应直接崩溃 turn stream；
- permission/question/plan 的响应只携带稳定 id，所有观察者都能幂等清除卡片；
- 原始 `_meta` 在确有 UI/诊断价值时透明转发，不把每个 vendor 字段提升为
  全局规范字段。

### 7.2 标准能力和 vendor extension

Codeg 将 ACP 标准能力与厂商特化能力分开：

| 能力 | 公共合同 | 厂商差异处理 |
| --- | --- | --- |
| 文本/思考增量 | `session/update` | Claude/Codex 的 sub-agent metadata 单独识别 |
| tool call/update | ACP tool schema | CodeBuddy、Cursor、Grok 对 wrapper/identity 缺失做重写 |
| permission | `session/request_permission` | `_meta.permission` 用于显示 grant/lifetime |
| question | elicitation/extension request | Grok 的 question payload 通过独立解析器处理 |
| plan | ACP plan 或扩展请求 | Codex/Grok 的 plan review / goal metadata 映射到统一卡片 |
| mode/config | session mode/config option | 过滤不应暴露给用户的内部 slash/config 状态 |
| steering | `_session/steering` extension | 只有 adapter 广告、版本和安全策略都满足时才启用 |

Codeg 对 steering 尤其谨慎：即使 adapter 宣称支持，也要检查版本和真实 wire
行为；如果注入可能导致脱离宿主请求的 detached turn，就关闭 native steering，
改走宿主拥有的 feedback/prompt 路径。

### 7.3 用户阻塞和取消

permission、question、plan approval 都使用“后端挂起 responder + 前端稳定 id”
的模式。取消或断开连接时，Codeg 会集中清理 pending permission、question、
plan approval、terminal poll 和 delegation，避免 Agent 已退出而 UI 永远显示
等待状态。

## 8. Multi-Agent delegation

Codeg 的 delegation 不是前端直接创建另一个进程，而是：

```text
Parent Agent
  -> codeg-mcp: delegate_to_agent
  -> token-authenticated UDS / named pipe
  -> DelegationBroker
  -> ConnectionSpawner
  -> child ACP connection + child conversation row
  -> child TurnComplete
  -> broker returns MCP tool_result to parent
```

关键设计：

- `codeg-mcp` 是每次 Agent launch 的 companion，而不是共享全局 MCP 服务；
- broker 依赖 `ConnectionSpawner` trait，生产实现和 mock 测试解耦；
- child conversation 记录 parent conversation、parent tool use 和 delegation
  call id；
- v1 是 one-shot：首轮完成后返回结果并断开 child；
- 深度、取消、父连接断开和超时都是 broker 的生命周期问题；
- 子 Agent 仍然通过同一 ACP ConnectionManager，不复制一套执行协议。

这为 SpecOS 的“主 Agent 调度 specialist”提供了很好的运行时参考，但不代表
当前 CLI GUI 应立即引入 delegation。当前仓库的 Agent registry 和执行路由仍然
是更高优先级的基础合同。

## 9. Codeg 的主要优点与代价

### 9.1 值得借鉴

- **适配关系可解释**：UI 能区分“vendor CLI 已安装”和“ACP wrapper 缺失”。
- **注册表可扩展**：新增 custom Agent 主要增加 distribution metadata，而不是
  复制连接和事件逻辑。
- **运行时有状态**：能力、原生 session、pending interaction 和 config stale
  都属于连接，不被一次性命令调用打散。
- **恢复是产品能力**：snapshot、seq、raw transcript 和 native resume 各自
  负责不同一致性问题。
- **兼容性有测试**：vendor-specific `_meta`、稀疏 update、identity-less tool
  call 和权限竞态都有定向测试。
- **安装安全边界清楚**：固定版本、平台校验、路径校验、hash 校验和显式设置
  操作组合成完整的 Agent readiness 流程。

### 9.2 需要警惕

- `connection.rs` 集中了大量 Agent-specific 分支，长期可能形成单体适配器；
  后续需要把稳定的 vendor codec 继续拆成模块。
- 自定义 metadata 使用 process-global runtime registry，虽然 fingerprint
  复用控制了增长，但仍需要明确生命周期和错误可见性。
- ACP、vendor CLI、adapter package 三者都可能独立升级，版本矩阵和 protocol
  fixture 是持续维护成本。
- 自定义 binary/npm/uvx 会引入供应链和本地执行风险，不能只看协议兼容。
- delegation、question、plan、terminal 和 file system capability 使 ACP 连接
  远不止“读 stdout”，必须把权限和取消作为一等合同。

## 10. 与当前 CLI GUI 的映射

| Codeg 设计 | 当前 CLI GUI | 判断与建议 |
| --- | --- | --- |
| Engine / Transport / Provider 分离 | `agent-runtime.ts`、`model-provider.ts` 和平台设计已分离 | 直接保留，这是现有设计的正确基础 |
| 状态化 Agent session | `AgentBackend.openSession()` + `BackendSessionHandle` | 合同已存在；ACP 实现应在 session handle 内保持连接状态 |
| 统一事件模型 | `AgentEvent` 已覆盖文本、tool、approval、usage、error | 需要增加 ACP metadata、tool update、question/plan/mode 等可扩展承载方式 |
| Vendor parser/adapter | `ProfileAdapterRegistry.buildTurn/parseEvents` | ACP 不应继续塞入一次性 JSON-lines parser，应新增明确的 ACP transport boundary |
| ConnectionManager | 当前 `RuntimeOrchestrator` 管理 turn 生命周期 | Orchestrator 继续负责队列、取消、超时和落盘；ACP backend 负责协议连接 |
| Native session id | `BackendSessionRef.nativeSessionId` | 可以承接 ACP session id，但还需保存 transport capability 和 resume metadata |
| Snapshot + event seq | `TranscriptRepository` 有 append/list，实时层有 turn status/delta | 需要设计 ACP session snapshot 和事件序列，不能只依赖 transcript 重放 |
| Adapter preflight | `engine-readiness.ts` 有命令、版本和能力探测 | 可吸收“native CLI vs ACP adapter”关系和 remediation 语义 |
| 内置/自定义 registry | `CliProfile`、`ProfileAdapterRegistry`、model routing registry | 先保持 Profile 与 Agent distribution 分离；custom ACP registry 后置 |
| MCP delegation | 当前无等价产品合同 | 暂缓，先完成单 Agent ACP lifecycle 和安全边界 |

### 10.1 当前明确缺口

当前 `GenericAcpBackend` 在 `cli-gui/server/agent-backends.ts` 中只声明了 ACP
身份，但 transport 仍为 `pty`，并且注释明确说明真实 ACP fixture/executor
尚未存在。因而当前缺少：

- ACP `initialize` 和 session request/response 循环；
- 一条连接内的 pending permission/question/plan 状态；
- ACP `SessionUpdate` 到 `AgentEvent` 的 typed normalization；
- `session/load` 失败后的 continuation/recovery 语义；
- ACP adapter 与 vendor CLI 的安装、路径和版本关系；
- raw protocol transcript 与冷启动 snapshot；
- protocol fixture、真实 adapter 版本矩阵和竞态测试。

这些缺口不应通过在 `profile-adapters.ts` 中继续增加一次性文本解析分支来填补。

## 11. CLI GUI 适配路线

以下是研究建议，不是已经批准的实现任务。

### Phase A：协议 fixture 与最小连接合同

先为一个锁定版本的 ACP adapter 建立 deterministic fixture，覆盖：

- initialize 成功/超时/协议版本不匹配；
- session/new、session/prompt、session/update、turn completion；
- 未知 update 转为 diagnostic；
- process exit、cancel race 和 malformed JSON-RPC。

建议先以 Codex ACP 为第一条 fixture 路径，再接 Claude ACP，因为当前 CLI GUI
已经有 Codex persistent runtime、model routing 和 execution attempt 相关合同。

### Phase B：状态化 ACP backend

在现有 `AgentBackend` 之下增加 ACP 专用连接实现，职责边界固定为：

- `probe`：adapter 可执行、版本、协议和能力检查；
- `openSession`：创建一个可复用的 ACP session connection；
- `runTurn`：提交 prompt 并返回事件流和结果；
- `cancel`/`approve`：只操作当前连接拥有的 request；
- `close`：幂等关闭连接和子进程。

Orchestrator 仍然拥有并发、超时、状态转换、transcript append 和 fallback
策略；ACP backend 不直接修改产品状态，也不绕过现有 execution attempt。

### Phase C：事件、snapshot 和恢复

将 ACP event 拆成三层：

1. transport 层的 wire message；
2. backend 层的 typed normalized event；
3. runtime 层的 `AgentEvent`、transcript event 和 session snapshot。

必须验证 reconnect、native resume、session/load 失败、重复 event、工具输出
累计 snapshot 和旧客户端读取新字段时的兼容行为。

### Phase D：交互能力

在基本 turn 链路稳定后，按风险顺序加入：

1. permission request/response；
2. mode/config options；
3. question 和 plan approval；
4. terminal/filesystem capability；
5. vendor extension 和 steering。

每项能力都要有 capability gate、稳定 id、取消清理和无能力时的 UI recovery，
不能因为某一个 Agent 支持就把字段变成所有 Agent 的必选合同。

### Phase E：自定义 ACP Agent

只有内置 adapter 的 lifecycle 已稳定后，才考虑实现：

- ACP Registry catalog；
- npx/uvx/binary distribution schema；
- platform/sha/path validation；
- explicit install、cache 和 uninstall；
- custom Agent 的 `AgentType` / profile / session compatibility。

这阶段必须把 secrets、安装权限、下载来源和删除行为写入单独 Feature Spec。

### Phase F：delegation

delegation 放在单 Agent ACP 和自定义 Agent 之后。需要单独决定：

- 子 Agent 是否是独立 Session/ExecutionAttempt；
- 父子 transcript 和 UI 展示关系；
- depth、并发、取消、超时和成本限制；
- MCP companion 的本地 IPC 和认证方式。

在这些合同批准前，不应复制 Codeg 的 `codeg-mcp` 或 broker 实现。

## 12. 适配边界与安全原则

CLI GUI 吸收 Codeg 设计时保持以下边界：

- Agent Engine、ACP Transport、Model Provider 仍是三个不同概念；
- 不直接执行 Provider HTTP/SDK 来替代官方 CLI/Agent；
- adapter 的 credential 只进入服务端受控 launch 环境，不进入 AppState、API
  summary、transcript、execution history、日志或测试快照；
- workspace、filesystem、terminal 和 Git 权限继续受现有 workspace scope 约束；
- vendor-specific `_meta` 默认是不透明扩展，只有稳定且必要的字段才提升；
- 自动 fallback 只允许在已经证明无副作用的技术失败上执行；
- 安装和下载是显式设置动作，不因打开 Session 隐式触发；
- 新能力先进入 PRD/Feature Spec，再修改 `design/cli-gui-platform-design.md`。

## 13. 测试与验证学习

### 13.1 Codeg 的测试方式

Codeg 的 ACP 测试组合值得参考：

- `registry`、`custom_registry`、`binary_cache` 和 event mapping 的 unit tests；
- parser/session snapshot tests，固定 vendor wire shape；
- API integration 和 WebSocket attach 测试；
- UDS/named pipe delegation E2E；
- Windows 和 Unix 分开的 IPC/路径验证；
- 对协议漂移、稀疏 update、身份缺失、取消竞态和失败恢复的定向测试。

### 13.2 CLI GUI 未来 ACP 的最小验收矩阵

| 场景 | 必须证明 |
| --- | --- |
| adapter 缺失 | readiness 显示 adapter 缺失，而不是 vendor CLI 缺失 |
| initialize 超时 | 返回稳定错误，不遗留连接或进程 |
| 重复 prompt | 第二次发送被明确拒绝或排队，不产生重复 turn |
| permission | request id 只绑定当前 session，响应幂等 |
| session/load 失败 | 保留已有 transcript，并按错误类型决定恢复或停止 |
| unknown update | 变成 diagnostic，不终止正常 turn |
| reconnect | snapshot + sequence 不重复消息、不丢 pending 状态 |
| cumulative tool output | 传输增量受控，不出现 O(N²) 膨胀 |
| secret canary | state/API/transcript/log/DOM/test snapshot 均为 0 命中 |
| cancellation race | 只有第一次 terminal transition 生效，后续事件被忽略 |

## 14. 已知限制与假设

- 分析基于 Codeg `f1a727d`，后续远端提交可能改变其实现；引用必须保留 commit
  固定点，不能把当前文档当作 Codeg 的持续同步镜像。
- ACP schema 和各 adapter 的版本独立演进；本文没有把 Codeg 的 vendor extension
  当作 ACP 标准能力。
- 本次没有在本仓库接入真实 ACP adapter，也没有声称当前 CLI GUI 已支持 ACP。
- Codeg 的自定义安装、delegation、移动端和 Office 能力超出当前 CLI GUI 适配
  的第一阶段范围。
- 研究文档不改变现有 `AgentEvent`、Session、Provider、Route 或 ExecutionAttempt
  的公共类型；未来改造必须通过新的 Feature Spec 处理迁移和兼容性。

## 15. 参考路径

### Codeg

源码基线：[Codeg commit f1a727d](https://github.com/xintaofei/codeg/commit/f1a727d3561a0c6b26359e6ab02cfbe80f618782)

重点路径：

- `src-tauri/src/acp/registry.rs`：内置注册表、分发模型、adapter relation；
- `src-tauri/src/acp/custom_registry.rs`：自定义 Agent schema、校验和 hydrate；
- `src-tauri/src/acp/remote_registry.rs`：ACP Registry catalog 与分发选择；
- `src-tauri/src/acp/connection.rs`：连接、session 请求、事件归一化和 vendor 分支；
- `src-tauri/src/acp/manager.rs`：连接生命周期和 prompt 串行化；
- `src-tauri/src/acp/types.rs`：`AcpEvent`、能力和前端合同；
- `src-tauri/src/acp/session_state.rs`、`event_stream.rs`、`lifecycle.rs`：snapshot、
  seq、持久化和恢复；
- `src-tauri/src/acp/preflight.rs`、`binary_cache.rs`：环境检查和安装缓存；
- `src-tauri/src/acp/delegation/`、`src-tauri/src/bin/codeg_mcp.rs`：多 Agent 委托；
- `src-tauri/tests/`：API、WS、snapshot 和 delegation 证据。

### SpecOS CLI GUI

- `cli-gui/shared/agent-runtime.ts`：Backend/Session/Turn/Event 合同；
- `cli-gui/server/agent-backends.ts`：Backend registry、legacy adapter bridge 和
  当前 ACP 占位；
- `cli-gui/server/profile-adapters.ts`：Codex/Claude 等一次性结构化 CLI translator；
- `cli-gui/doc/mvp02/spec/agent-runtime-spec.md`：Agent Engine、Transport、Provider
  分离与失败语义；
- `design/cli-gui-platform-design.md`：CLI GUI 跨版本平台架构源文档。

