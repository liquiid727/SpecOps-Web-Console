# 12｜扩展体系：Custom Agent、Skills、MCP、Chat Channels 与 Automation

## 本篇目标

Codeg 的扩展不只有“增加一个 Agent”。它把扩展分成几类：

```text
Agent extension      接入新的 Agent runtime
Skill extension      给 Agent 增加工作方法和指令
MCP extension        给 Agent 增加工具/资源
Channel extension    从 Telegram/Lark/iLink 等入口接收任务
Automation extension 按 schedule/headless/worktree 重复执行
Domain pack          Office、Scientific Research、Project Boot 等复合流程
```

这些扩展的共同问题是：如何安装、配置、授权、注入、执行、观察和卸载。官方 Guide
把 Agents、Channels & Automation、MCP/Skills、Domain Workflows 分成不同章节，适合
按“能力类型”对照源码。[Codeg Guide](https://docs.codeg.app/guide/)

## 1. 扩展类型与 owner

| 类型 | 进入点 | 执行者 | Codeg 负责什么 |
| --- | --- | --- | --- |
| Custom Agent | Registry/Distribution | 外部 CLI/ACP adapter | identity、preflight、cache、connection、event normalization |
| Skill | `SKILL.md` / skill pack | Agent 自己读取并执行 | store、scope、链接、启用矩阵、编辑预览 |
| MCP server | stdio 或 remote URL | Agent MCP client | 配置写入、secret/headers、启用状态、扫描/注册 |
| Chat Channel | bot/webhook/outbound connection | channel adapter + Agent | token、消息转换、回复、审批通知、重连 |
| Automation | manual/cron | Scheduler + Agent task | schedule、worktree、run status、retry、history |
| Domain pack | skills + external runtime | Agent + OfficeCLI/Python 等 | 安装、依赖检测、预览、scope 和权限提示 |

同一个功能可能同时跨多类扩展。例如“通过 Telegram 启动一个 Office 文档任务”会经过
channel、automation、skill、OfficeCLI、workspace file preview 和 permission。

## 2. Custom Agent：配置不是集成完成

新增 Agent 的完整链路：

```text
Registry identity
  -> distribution JSON
  -> schema/semantic validation
  -> preflight
  -> binary/cache
  -> ACP initialize/session
  -> event/session state
  -> transcript/UI
  -> permission/question/delegation
  -> tests/build matrix/release
```

Custom Agent 支持 registry、手工 distribution JSON、npx、uvx、binary 等分发方式；
binary 可以附带 hash。路径、id、version、archive 内部启动路径等必须先验证，再构造
命令。

源码：

- [`acp/custom_registry.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/custom_registry.rs)
- [`acp/registry.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/registry.rs)
- [`acp/preflight.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/preflight.rs)
- [`commands/custom_agents.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/custom_agents.rs)
- [`add-custom-agent-dialog.tsx`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/components/settings/add-custom-agent-dialog.tsx)

## 3. Skills：共享 store，Agent-native 执行

官方 Skills 指南说明 Skill 是 Agent 读取的 `SKILL.md`；Codeg 可以把共享 skill store
中的内容按 Agent/项目 scope 接入各 Agent，也可以直接写入某个 Agent 自己的 skills
目录。[Skills](https://docs.codeg.app/guide/skills)

可以拆成三层：

```text
Skill source
  ├── built-in / read-only
  ├── shared pack store
  └── agent-native global/folder skill

Enable matrix
  -> which agent
  -> which project/folder
  -> which scope

Runtime
  -> symlink/junction or native copy
  -> Agent discovers SKILL.md
  -> Agent applies procedure
```

Codeg 的职责是存储、scope、链接和 UI 编辑；Skill 里的命令、脚本、Python/uv 环境
仍然由 Agent 进程执行。因此 Skill 管理系统不是沙箱。

### Skill 设计要点

- `name`、description、frontmatter 需要可解析；
- scope 明确是 global、folder/project 还是 agent-only；
- enable/disable 不应修改用户源文件；
- 删除链接不能误删 shared store；
- skill 依赖缺失时给出 setup hint，不把安装失败伪装成 skill 不存在；
- skill 内容和执行日志都可能包含敏感路径或命令。

## 4. MCP：两种配置，两种信任边界

```text
Local stdio MCP
  command + args + env
  -> Agent launches local process

Remote MCP
  url + headers/auth
  -> Agent opens network connection

Codeg companion
  stdio JSON-RPC
  -> local IPC -> parent Core
```

Codeg 的 MCP settings 会写入各 Agent 的原生配置；Codeg 不一定知道每个 custom Agent
的配置格式，因此 custom Agent 可能不能进入内置 MCP 配置矩阵，只能使用 companion
或用户自己的配置。

源码：

- [`commands/mcp.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/mcp.rs)
- [`web/handlers/mcp.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/web/handlers/mcp.rs)
- [`mcp-settings.tsx`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/components/settings/mcp-settings.tsx)
- [`bin/codeg_mcp.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/bin/codeg_mcp.rs)

MCP 的学习顺序建议是：

1. stdio framing 与 stdout 纯协议；
2. command/args/env 的结构化配置；
3. remote URL/headers 的认证和 secret 落盘；
4. tool call 的 request/response/cancel；
5. tool result 如何进入 transcript/message renderer；
6. MCP server 缺失、超时、崩溃、重复注入的恢复。

官方页面：[MCP Servers](https://docs.codeg.app/guide/mcp)

## 5. Chat Channels：远程入口也是 Agent transport

Channel 不是简单的“消息转发器”，它要把外部消息变成受控的 Codeg command，并把
Agent event 投影成适合聊天平台的回复、审批和错误提示：

```text
Telegram / Lark / iLink / webhook
  -> token / connection
  -> inbound message normalization
  -> conversation/session lookup
  -> prompt / task command
  -> event subscriber
  -> text/card/approval formatter
  -> outbound reply
```

Codeg 当前 chat channel 模块包含 manager、scheduler、session bridge、event subscriber、
command dispatcher、message formatter 和 webhook 等职责。

源码：

- [`chat_channel/manager.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/chat_channel/manager.rs)
- [`chat_channel/command_dispatcher.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/chat_channel/command_dispatcher.rs)
- [`chat_channel/session_bridge.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/chat_channel/session_bridge.rs)
- [`chat_channel/event_subscriber.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/chat_channel/event_subscriber.rs)
- [`chat_channel/message_formatter.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/chat_channel/message_formatter.rs)
- [`chat_channel/webhook.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/chat_channel/webhook.rs)

官方 Chat Channels 指南描述了 Telegram long-poll、Lark WebSocket、iLink service 等
出站连接方式；不少部署不需要暴露 inbound webhook，但 webhook 模式仍要处理反向
可达性和签名验证。[Chat Channels](https://docs.codeg.app/guide/chat-channels)

### Channel 必须单独定义的契约

- inbound message id 与去重；
- sender、channel、workspace、conversation 的绑定；
- 回复长度、Markdown/card 能力和截断策略；
- permission/question 的确认格式；
- channel 断线与重连；
- token rotation 和 webhook signature；
- Agent 输出包含秘密、路径或工具结果时的脱敏。

## 6. Automation：定时任务不是延时 prompt

Automation 应该被看作一个带 schedule 和 execution history 的 task：

```text
Automation definition
  -> scheduler trigger
  -> run lock / dedup
  -> optional worktree
  -> Agent session
  -> progress / result / failure
  -> next run or manual retry
```

Codeg 支持手动或 cron 触发；任务可以使用独立 worktree，避免定时执行修改用户正在
使用的工作树。源码入口：

- [`automation/engine.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/automation/engine.rs)
- [`automation/mod.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/automation/mod.rs)
- [`chat_channel/scheduler.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/chat_channel/scheduler.rs)
- [`models/automation.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/models/automation.rs)

要验证的不是“cron 是否触发”，而是：

- 同一时间重复触发是否去重；
- 上一次 run 卡住时下一次如何处理；
- 每次 run 是否有独立 worktree/branch；
- cancel、timeout、server restart 后状态是否可查询；
- automation 是否被允许执行危险工具；
- 结果是否生成普通 conversation、task 或 artifact。

官方页面：[Automations](https://docs.codeg.app/guide/automations)

## 7. Domain Packs：把外部工具接成 Agent workflow

Office Documents、Scientific Research、Project Boot 说明一个扩展可以由多个能力组成：

```text
skill pack
  + external binary / Python environment
  + setup/preflight
  + agent invocation
  + file/artifact output
  + live preview
  + domain-specific validation
```

OfficeCLI 的安装、skill sync、Agent enable、文件预览和 server host 运行环境分别属于
不同边界；Scientific Research skill pack 还可能需要 Python/uv 或 API key。官方文档：

- [Office Documents](https://docs.codeg.app/guide/office)
- [Scientific Research](https://docs.codeg.app/guide/research)
- [Project Boot](https://docs.codeg.app/guide/project-boot)

学习时要避免把“技能可选”理解成“没有运行时依赖”。一个 domain pack 的安装器、
skill store、外部 binary、Agent process、preview server 都需要独立失败提示。

## 8. 扩展系统的安全模型

| 扩展 | 供应链 | 执行权限 | 主要数据风险 |
| --- | --- | --- | --- |
| Agent | npm/uv/binary/vendor | child process | prompt、文件、模型请求 |
| Skill | shared store / repository | Agent 可执行命令 | 脚本、路径、外部 API |
| MCP | local command / remote URL | 工具调用 | headers、tool input/output |
| Channel | bot platform/webhook | 远程触发 prompt | token、消息、审批 |
| Automation | cron/config | 无人值守 Agent | 计划任务、worktree、长期权限 |
| Domain pack | external binary/Python | 文件生成和预览服务 | 文档内容、依赖、密钥 |

Codeg 的路径校验、binary hash、keyring 和 token boundary 有助于治理，但不能自动
把外部 Agent/MCP/Skill 变成沙箱。安全分析必须继续检查 child process 和外部供应商。

## 9. 实验与验收

### 实验 A：增加一个 custom Agent

只在临时 registry 中新增 fake Agent，完成 identity、distribution、preflight、
capability、session、event、failure 和 disable；不接真实账户。

### 实验 B：增加一个 MCP tool

让 fake companion 提供一个只读工具，覆盖：配置注入、stdio framing、request id、
unknown method、cancel、timeout、tool result 到 transcript/UI 的投影。

### 实验 C：增加一个 Skill

分别测试 shared/global/folder scope，验证 enable/disable、symlink/junction、删除
链接和 source store 的所有权。

### 实验 D：增加一个 Channel adapter

用本地 HTTP/long-poll fake channel，实现 inbound dedupe、command dispatch、streaming
摘要、permission confirmation、reconnect 和 token rotation。

### 实验 E：增加一个 Automation

用 fake clock 触发两次 schedule，验证 run lock、worktree 隔离、失败重试和 shutdown。

本篇验收：

- 能区分 Agent、Skill、MCP、Channel、Automation、Domain pack 的 owner 和信任边界；
- 能为每类扩展写出 install/preflight/runtime/event/UI/test/release 契约；
- 能解释 custom Agent 为什么不一定能进入原生 MCP 配置矩阵；
- 能指出 skill、MCP 和 automation 不是沙箱；
- 能设计一个小型扩展并覆盖安装失败、运行失败、取消、重连和卸载。
