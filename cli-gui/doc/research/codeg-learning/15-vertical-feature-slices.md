# 15｜垂直功能案例：从一个 Agent、MCP Tool、Channel 到完整交付

## 本篇目标

前面按模块学习容易产生一个错觉：看完 Registry、MCP、React、数据库，就已经知道
如何交付一个功能。真正的工程难点在于，一个功能会横跨配置、runtime、事件、持久化、
UI、权限、测试和发布。

这一篇提供四个可复用的纵切模板：新增 Agent、新增 MCP tool、新增 Chat Channel、
新增 Automation/Domain skill。每个案例都要走完同一条链：

```text
Identity
  -> Configuration
  -> Preflight
  -> Runtime owner
  -> State machine
  -> Event / persistence
  -> UI projection
  -> Permission / cancellation
  -> Recovery
  -> Tests
  -> Build / release
```

## 1. Feature contract 模板

在写实现前，先建立一份 feature contract：

```markdown
# Feature:

## Identity
- stable id:
- parent scope:

## Configuration
- source:
- precedence:
- effective time:
- secret fields:

## Runtime
- owner:
- process / task / connection:
- start condition:
- shutdown condition:

## State
- pending:
- success:
- failure:
- cancelled:
- timeout:
- stale / duplicate:

## Events and persistence
- normalized event:
- sequence:
- snapshot fields:
- transcript / DB projection:

## UI
- empty/loading/running/waiting/success/failure/reconnecting:
- user actions:

## Test and release
- unit:
- protocol contract:
- integration:
- browser:
- feature matrix:
- artifact / migration / rollback:
```

这份模板可以直接迁移到 SpecOS 的 Feature Spec、Test Spec 或 implementation handoff。

## 2. 案例 A：新增一个 Custom Agent

### 2.1 端到端链路

```text
Custom Agent form / distribution JSON
  -> custom_registry validation
  -> persisted custom agent
  -> preflight: node / uv / binary / platform / version
  -> binary cache or npx/uvx command
  -> ACP initialize
  -> ConnectionManager session/new
  -> SessionState + EventStream
  -> transcript + message projection
  -> permission/question/delegation injection
  -> settings/session UI
  -> Rust/Vitest/browser tests
  -> Desktop/Server/MCP build matrix
```

### 2.2 需要新增或核对的契约

| 层 | 必须回答 |
| --- | --- |
| identity | Agent id、显示名、版本和 capability 如何稳定 |
| distribution | npx/uvx/binary 如何启动，平台和 hash 如何验证 |
| preflight | 缺 Node/uv/binary/adapter 时如何修复 |
| protocol | initialize/session/prompt/cancel/permission 是否支持 |
| state | unknown event、duplicate、gap、exit 如何处理 |
| UI | 能力不支持时隐藏、禁用还是说明 |
| release | default Desktop 与 headless Server/MCP 是否都可构建 |

源码：

- [`custom_registry.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/custom_registry.rs)
- [`preflight.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/preflight.rs)
- [`manager.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/manager.rs)
- [`session_state.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/session_state.rs)

### 2.3 最小测试集

- valid/invalid distribution JSON；
- archive path traversal、bad version、missing platform；
- preflight missing runtime；
- initialize timeout、child immediate exit；
- repeated spawn dedup；
- unknown event、duplicate event、sequence gap；
- permission/question/cancel race；
- frontend capability projection；
- default/headless/MCP feature build。

## 3. 案例 B：新增一个 MCP Tool

### 3.1 端到端链路

```text
Tool schema / enable setting
  -> companion registration
  -> stdio JSON-RPC dispatch
  -> parent local IPC
  -> broker/application command
  -> task / store / file / Agent action
  -> result/error/cancel
  -> parent Agent tool result
  -> transcript / tool card / diagnostics
```

如果 tool 是 Codeg 自带 companion tool，重点是 parent token、socket、任务状态和
stdout 协议；如果是用户配置的 remote MCP，重点是 headers、TLS、配置 scope 和
Agent native config。

### 3.2 Tool contract

```text
name / description / input schema
required permission
workspace scope
side effects
timeout
result size limit
error codes
cancellation semantics
audit fields
```

不要只实现 `tools/call` 的成功 response。至少覆盖：

- malformed input；
- unknown tool；
- missing parent token；
- workspace/path denied；
- tool timeout；
- parent cancel；
- duplicate request id；
- result too large；
- companion shutdown；
- stdout 混入日志。

源码：

- [`bin/codeg_mcp.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/bin/codeg_mcp.rs)
- [`delegation/companion.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/companion.rs)
- [`commands/mcp.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/mcp.rs)

## 4. 案例 C：新增一个 Chat Channel

### 4.1 端到端链路

```text
channel settings / token
  -> keyring or secret store
  -> channel manager connection
  -> inbound update parse + dedupe
  -> sender/channel/workspace mapping
  -> prompt/task command
  -> Agent session / event subscription
  -> formatter: text/card/progress/approval
  -> outbound message
  -> reconnect / retry / rate limit
```

### 4.2 必须定义的平台差异

| 能力 | channel adapter 要定义 |
| --- | --- |
| 文本 | 最大长度、Markdown、代码块、截断 |
| tool | 是否展示过程、合并频率、失败摘要 |
| permission | buttons/commands、过期、sender verification |
| question | 多选/文本输入、超时、回填 request id |
| media | 图片、文件、URL、大小限制、临时存储 |
| delivery | outbound retry、幂等、rate limit、ordering |
| security | bot token、webhook signature、allowed users/chats |

官方 Chat Channels 页面是协议适配和网络边界的入口：[Chat Channels](https://docs.codeg.app/guide/chat-channels)

### 4.3 测试集

- 重复 inbound event；
- 乱序 update；
- reconnect 后未发送/已发送消息去重；
- permission 只允许原 sender 确认；
- channel API 限流；
- Agent 输出超长/非法 Markdown；
- token rotation；
- WebSocket/long-poll/webhook 三种传输失败。

## 5. 案例 D：新增 Automation 或 Domain Skill

### 5.1 Automation

```text
automation definition
  -> schedule parser
  -> trigger dedup / lock
  -> worktree allocation
  -> Agent config + prompt
  -> run_seq / task status
  -> progress / result / artifact
  -> cleanup / archive / retry
```

需要明确“无人值守”是否可以执行 permission-sensitive tool；如果不能自动批准，
automation 应进入 waiting 状态并通过 channel/UI 通知，而不是静默失败。

### 5.2 Domain Skill / Office / Research

```text
skill metadata
  -> setup prerequisites
  -> skill scope and enable matrix
  -> external binary/Python/API key
  -> Agent invocation
  -> generated file/artifact
  -> preview / validation
  -> cleanup / reproducibility
```

OfficeCLI、Scientific Research 等功能说明 Skill 是 workflow 的入口，外部 runtime
和 domain validation 仍需单独管理。[Office Documents](https://docs.codeg.app/guide/office)、[Scientific Research](https://docs.codeg.app/guide/research)

## 6. 用一张验收矩阵检查“功能是否完整”

| 维度 | 未完成的典型表现 | 完成证据 |
| --- | --- | --- |
| 配置 | UI 能保存但 runtime 不识别 | effective config + startup/preflight test |
| 运行时 | 能启动但无法 cancel/cleanup | lifecycle + process/task test |
| 协议 | happy path 能通 | framing、unknown、timeout、duplicate、cancel |
| 状态 | UI 只能显示 loading | explicit pending/terminal/stale state |
| 事件 | 断线后只能刷新页面 | snapshot/sequence/replay test |
| 持久化 | 重启丢历史或重复导入 | migration/transcript/reconcile test |
| 安全 | token 出现在日志/配置/备份 | secret redaction/auth/permission test |
| UI | 只做 success 状态 | empty/loading/waiting/failure/reconnect |
| 性能 | 只能说“感觉很快” | workload + p50/p95/RSS/render/long-task |
| 发布 | 本地可用，Server/MCP 不可用 | feature/platform/build smoke matrix |

## 7. 推荐学习顺序

按垂直切片学习时，不要一次实现完整产品。建议每个案例分五个 checkpoint：

### Checkpoint 1：纯状态

只写 command、state、event、error 和 terminal invariant。

### Checkpoint 2：Fake adapter

不接真实 Agent/channel/MCP，用 fixture 模拟成功、失败、延迟、重复和取消。

### Checkpoint 3：真实边界

接入一个真实 child process、MCP server 或 channel，但保持 fake 仍可运行。

### Checkpoint 4：UI projection

把 normalized state 投影成 message/tool/approval/task card，覆盖空、加载、错误和重连。

### Checkpoint 5：发布和恢复

加入 feature matrix、跨平台检查、日志、backup、restart、升级/回滚和操作手册。

## 8. 本篇验收

- 能用同一模板拆一个 Agent、MCP tool、Chat Channel、Automation。
- 能指出配置完成但产品闭环未完成的部分。
- 能为每个功能写出 owner、状态、事件、权限、恢复和测试矩阵。
- 能设计 fake adapter，让真实外部服务不是唯一测试路径。
- 能把功能交付从“代码完成”扩展到“可重连、可审计、可发布”。
