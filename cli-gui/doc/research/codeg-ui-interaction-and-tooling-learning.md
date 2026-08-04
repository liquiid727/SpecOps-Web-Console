# Codeg UI 交互与开发测试方法学习总结

> 类型：外部项目学习总结
>
> 状态：Research，非 CLI GUI 规范设计
>
> 分析基线：Codeg `v0.23.1`，commit `f1a727d3561a0c6b26359e6ab02cfbe80f618782`
>
> 分析时间：2026-08-04（Asia/Singapore）

本文总结本轮对 Codeg 的架构、前端交互、消息渲染和开发测试约定的讨论。
重点不是复制 Codeg 的页面，而是理解它为什么能把 Agent 会话做得流畅，并
提炼出适用于 SpecOS CLI GUI 的设计和交付方法。

本文与 [Codeg ACP 项目分析与 CLI GUI 适配学习](./codeg-acp-project-analysis.md)
互相补充：前者偏 ACP Runtime 和 Agent 适配，本文偏 UI 交互、状态一致性、
性能和工程验证。

## 1. 核心结论

Codeg 值得借鉴的不是某一个组件或某一种布局，而是一套完整的交互闭环：

```text
Workspace
  -> Conversation
  -> Streaming message
  -> Tool call
  -> Permission / Question / Plan approval
  -> File change / Diff / Git
  -> Continue conversation
```

这套体验由四层共同构成：

1. **产品信息架构**：对话、文件、Diff、Git、终端在同一个工作区内完成。
2. **运行时状态合同**：实时事件、Session snapshot、持久化 Transcript 和
   待处理交互都有清晰边界。
3. **前端渲染管线**：消息被拆成稳定的内容块、工具卡片和状态卡片，而不是
   将 Agent 输出当作一段普通 Markdown。
4. **开发与测试门禁**：每种实际交付模式单独检查，协议解析和状态转换使用
   fixture、snapshot、单测和集成测试固定行为。

对当前 CLI GUI 的判断是：Spec、Issue 和后端功能合同已经是主要基础；下一步
不应只继续增加后台能力，而应补充一层“交互实现合同”，把已有功能变成稳定、
可恢复、可验证的用户体验。

## 2. Codeg 的设计文档现状

### 2.1 已公开的文档

Codeg 有正式的架构和开发文档，但它们更像“架构说明 + 用户行为指南”，不是
一套完整的内部 UI 设计交付包：

| 文档 | 内容 | 对我们的价值 |
| --- | --- | --- |
| [Architecture](https://docs.codeg.app/reference/architecture) | One Rust core、One web frontend、Three binaries、Transport 和 ACP | 理解桌面、Web、移动端为什么能共享同一套会话语义 |
| [Workspace](https://docs.codeg.app/guide/workspace) | 四列工作区、Composer、Transcript、文件、Diff、Git、终端和响应式行为 | 作为交互行为参考，比单纯截图更有价值 |
| [Development](https://docs.codeg.app/reference/development) | Node/Rust 环境、构建模式、检查命令和测试命令 | 形成 CLI GUI 开发与测试约定的参考 |
| [Conversation Aggregation](https://docs.codeg.app/guide/aggregation) | 会话导入、跨 Agent 历史和恢复 | 参考 Session 作为产品事实的组织方式 |
| [Multi-Agent Collaboration](https://docs.codeg.app/guide/multi-agent) | `@` 委托、子会话和结果回流 | 参考未来 delegation 的交互闭环 |

### 2.2 没有找到的内容

在固定版本的公开仓库中，没有找到以下形式的完整文档：

- 独立的 UI Design System 或组件设计手册；
- 完整的交互状态矩阵或页面状态机文档；
- 专门的 Message Renderer 设计说明；
- Figma 设计交付、交互标注或组件级视觉规范；
- 覆盖所有前端组件的 ADR/RFC 文档。

因此，Codeg 的前端设计主要采用“代码即实现合同”的方式：

```text
用户行为文档
  + AGENTS.md 架构和开发约定
  + React 组件与状态 store
  + Rust ACP SessionState
  + 单元 / 集成 / snapshot 测试
  = 实际的交互设计
```

这也是为什么只看 README 很难理解它的流畅性。真正的设计细节分散在消息
组件、状态转换、事件序列和边界测试中。

## 3. 总体架构：一个核心，多种前门

Codeg 的 Architecture 文档把系统压缩成三个概念：

```text
Desktop codeg
  Tauri shell -> shared web frontend -> Rust core

Browser / Web
  HTTP + WebSocket -> same Rust core -> same web frontend

Mobile iOS / Android
  authenticated HTTP + WebSocket -> desktop or codeg-server

Agent CLI
  ACP stdio JSON-RPC -> Rust core

Per-launch codeg-mcp
  stdio MCP -> local IPC -> Rust core
```

### 3.1 One Rust core

桌面端、Server 和 MCP companion 复用同一个 `codeg_lib` 核心。核心拥有：

- Agent 和 Session 编排；
- ACP 连接与能力协商；
- 数据库和 Transcript；
- 文件、终端、Git 和凭据；
- Web API、WebSocket 和事件广播；
- 日志、恢复和 delegation 生命周期。

桌面端和 Server 的差异主要是 Transport：桌面使用 Tauri IPC，浏览器使用
HTTP/WebSocket。这样不是维护两套产品，而是同一个产品的两种前门。

### 3.2 Mobile 是客户端，不是第二个运行时

移动端不运行 Agent CLI、项目文件或 Git 操作。它连接宿主机上的桌面 Web
Service 或 `codeg-server`，负责：

- 启动和查看会话；
- 渲染流式消息和工具状态；
- 处理 permission/question；
- 浏览项目和分支；
- 发送取消、回复和控制命令。

这为 CLI GUI 的 Web、桌面和移动端提供了清晰边界：运行时在宿主端，客户端
只消费统一的 API 和事件合同。

## 4. 交互设计学习

### 4.1 Workspace 信息架构

Codeg 的桌面 Workspace 将主要工作区域组织为四列：

| 区域 | 责任 | 交互特点 |
| --- | --- | --- |
| Conversations | 文件夹、历史会话、状态和入口 | 搜索、过滤、状态标识、会话定位 |
| Conversation | 消息流、Composer、Session header | 流式输出、审批、继续对话 |
| Files | 编辑器、Diff 和实时预览 | Agent 修改与结果检查并列显示 |
| Aux panel | Session Details、Files、Changes、Commits | 辅助信息按 Tab 收纳 |

终端位于中间区域下方，状态栏承担全局提醒、后台任务和命令入口。宽屏采用
并列布局，窄屏将侧栏和辅助区域变成抽屉或 Sheet，而不是把功能删除。

设计原则是：

- Agent 对话和工程结果必须同时可见；
- 辅助能力靠面板收纳，不抢占主会话；
- 面板可以折叠，但状态和草稿不能丢；
- 用户可以在对话、文件和 Diff 之间快速往返，不依赖多个浏览器标签页。

### 4.2 Composer 不是普通输入框

Composer 同时承担会话配置和输入编排：

- Agent、Model、Mode；
- Workspace folder 和 branch；
- `@` 文件、Agent、旧 Session、Commit 引用；
- `/` slash command；
- 文件附件、Skill、Quick Message 和反馈；
- Send、Fork、Cancel 和消息队列；
- Context usage 和连接状态。

发送中的状态必须连续：

```text
Draft
  -> Sending
  -> Prompting
  -> Waiting for approval / question
  -> Streaming
  -> Completed / Failed / Cancelled
```

Agent 忙碌时，Send 变为 Cancel，提前输入的消息进入 Queue，而不是让用户
丢失输入或重复点击发送。

### 4.3 Transcript 是内容块和状态卡片的集合

Codeg 的消息渲染不是“用户气泡 + Agent Markdown”两种类型，而是按内容块
拆分：

- user text、image、resource link；
- assistant text 和 thinking；
- plan；
- tool call、tool update 和 command output；
- file change、Diff 和 reply artifacts；
- background task 和 sub-agent delegation；
- usage、duration、model 和 completion metadata。

工具卡片有明确状态：

```text
Awaiting Approval -> Running -> Completed
                         \-> Failed
                         \-> Denied
```

长内容采用折叠和摘要：Plan 可以展开/收起，重复命令可以合并为摘要，原始
JSON 默认折叠为可读树结构，文件修改在回复末尾聚合展示。

### 4.4 阻塞式交互靠近 Composer

permission、question 和 plan approval 不是全局 Toast，而是固定在 Composer
上方的可操作卡片。这样用户能明确知道：

- 当前哪个 Agent 在等待；
- 它请求了什么；
- 允许选项具体授予什么范围；
- 权限有效期是本次运行、当前 Session、项目设置还是永久；
- 选择后如何继续或取消。

后端保存 pending request，前端使用稳定 request id。刷新、重连和多客户端
观察不会让审批状态消失。

### 4.5 空、加载、失败和恢复都是主流程

Codeg 对这些情况都有专门行为，而不是只显示通用错误：

- 初次打开显示 loading，不让空白页面和真实空会话混淆；
- 没有会话时提供 Open Folder、Import Session 或 Project Boot；
- Session 无法恢复时明确提供 Reload 或 New Conversation；
- Agent 没有回复时区分无输出、解析失败和只有状态事件；
- 断线后用 snapshot/replay 恢复，而不是把界面重置为空；
- 关闭面板不会终止后台任务，除非用户明确取消。

## 5. 流畅性的实现机制

Codeg 的交互链路可以抽象为：

```text
ACP wire event
  -> Rust vendor-aware normalization
  -> SessionState.apply_event
  -> EventEnvelope(seq)
  -> Tauri event or WebSocket
  -> connection store
  -> conversation runtime store
  -> message adapter
  -> virtualized message thread
  -> content blocks / tool cards / dialogs
```

### 5.1 实时状态和持久化历史分离

一个会话同时拥有三类数据：

| 数据 | 责任 |
| --- | --- |
| Persisted turns | 已经写入数据库或 Agent Transcript 的事实 |
| Optimistic/local turns | 用户刚发送、后端尚未完全落盘的临时事实 |
| Live message | 当前正在流式生成的内容和工具状态 |

Turn 完成后，Runtime Store 不会立刻粗暴地重新读取整个历史，而是先提升
live turn，再等待 Transcript 写入，通过 ID、内容签名、watermark 和 metadata
对账，避免消息重复、闪烁或统计信息落到错误的 turn 上。

### 5.2 事件序列、snapshot 和 reconnect

后端 `SessionState` 保存实时消息、active tool call、pending permission、
question、plan、usage、capabilities 和最后错误。每个事件有递增 `seq`，并
通过 bounded recent-event buffer 支持短断线重放。

客户端 attach 时遵循：

```text
读取 snapshot + event_seq
  -> 注册事件订阅
  -> replay 最近连续事件
  -> 若序列有缺口，重新使用完整 snapshot
  -> 后续事件按 seq 去重
```

事件广播和 snapshot 读取使用同一状态锁协调，避免“读取完 snapshot 但还没
订阅时丢掉一个事件”的竞态。

### 5.3 流式批处理和局部渲染

Codeg 对高频事件做了专门的性能处理：

- 文本和 thinking delta 按约 16ms 合并后再 dispatch；
- tool call update 使用 animation frame 批处理；
- 只订阅当前会话的 store slice；
- keep-alive 面板不因每个 token 重新渲染；
- 历史消息保持稳定引用，只有 streaming 尾部持续变化；
- 消息列表使用虚拟化和 overscan；
- 使用稳定 key、memo、缓存的 merged assistant run；
- 连续 assistant turns、工具组和重复后台任务合并为一个可读单元。

这说明“流畅”不是某一个 CSS 动画，而是事件频率、状态引用、列表渲染和
滚动行为共同控制的结果。

### 5.4 Message Adapter 隔离协议差异

ACP/vendor event 不直接进入 JSX。中间有一层 adapter，把不同 Agent 的：

- tool name；
- input/output；
- delegation metadata；
- plan；
- file change；
- error 和 usage

转换成前端统一的 `AdaptedContentPart`。这样消息组件只处理稳定的渲染合同，
vendor 特殊逻辑不会散落在每个卡片里。

## 6. 开发和测试约定学习

### 6.1 按交付模式验证

Codeg 的开发文档没有只给一个“全部通过”命令，而是按实际二进制模式拆分：

```bash
# src-tauri/
cargo check                                            # desktop (default features)
cargo check --no-default-features --bin codeg-server   # server mode
cargo check --no-default-features --bin codeg-mcp      # MCP companion
cargo clippy --all-targets --features test-utils -- -D warnings

cargo test --features test-utils                       # desktop + integration
cargo test --no-default-features --bin codeg-server --lib
cargo insta review                                     # review parser snapshot changes
```

这套约定的价值是：每个命令都对应真实交付物，编译通过不代表 Server 或
MCP companion 一定可交付；快照变化也不能自动被当作正确结果。

### 6.2 分层质量门禁

Codeg 的验证可以归纳为：

| 层级 | 证明内容 |
| --- | --- |
| Build/check | 当前模式能编译，feature flag 没有隐藏错误 |
| Clippy/lint | 警告不被默默带入交付物 |
| Unit tests | reducer、parser、validator 和纯函数行为稳定 |
| Component tests | 消息卡片、Composer、Dialog 和状态展示可回归 |
| Integration tests | API、WebSocket、DB 和 ACP 生命周期连贯 |
| Snapshot tests | Agent JSONL/ACP 输入到产品结构的输出可审查 |
| E2E tests | 跨进程、IPC、UDS/named pipe 和真实交互链路成立 |

### 6.3 Snapshot 不是自动更新按钮

Parser snapshot 适合固定以下合同：

- 每个 Agent 的历史列表和详情解析；
- vendor wire shape 到统一消息块的转换；
- 稀疏 tool update 和 metadata；
- permission、plan、delegation 和错误结构。

当实现改变 snapshot 时，开发者需要显式 review 新旧结果。这种规则可以防止
“测试全绿但 UI 数据已经悄悄变形”。

## 7. 对 SpecOS CLI GUI 的适配建议

### 7.1 保留我们的产品真相

Codeg 可以作为体验和 Runtime 参考，但以下内容仍由 SpecOS 自己拥有：

- Spec、Rule、Feature、Issue 和交付追踪；
- LiteSpec、GoalSpec、EnterpriseSpec 模式；
- ExecutionAttempt、模型路由和审计；
- workspace scope、权限和安全策略；
- CLI GUI 自己的产品定位和未来特性。

Codeg 的用户行为文档不能替代我们现有的 PRD、Feature Spec 和平台设计。

### 7.2 应补充的交互实现合同

当前后端 spec/issues 之外，建议增加一层 CLI GUI 交互设计内容：

1. **Workspace layout contract**：区域、面板、抽屉、Tab、窄屏和移动端行为。
2. **Conversation state contract**：draft、sending、prompting、waiting、
   streaming、completed、failed、cancelled。
3. **Message rendering contract**：文本、thinking、tool、command、file、
   diff、approval、question、plan、usage 和 delegation。
4. **Reconciliation contract**：persisted、optimistic、live、snapshot、seq、
   reconnect 和 dedup。
5. **Performance contract**：批处理频率、局部订阅、虚拟化、滚动锚点和
   不应被流式 token 触发的组件。
6. **Failure recovery contract**：每个错误的用户动作、重试范围和不可恢复
   状态。
7. **Web/mobile contract**：移动端只作为宿主 Runtime 的客户端，统一 API/WS
   事件和认证边界。

### 7.3 交互验收矩阵

后续每个 CLI GUI 相关 Issue 至少应该能回答以下问题：

| 场景 | 交付必须证明 |
| --- | --- |
| 首次打开 | loading、empty、success、failure 四种状态都可识别 |
| 流式输出 | 文本连续、滚动稳定、只刷新必要区域 |
| Tool call | pending/running/completed/failed/denied 状态一致 |
| Approval | request id 稳定，刷新后仍能继续处理 |
| 发送失败 | 草稿不丢，队列不乱，错误可恢复 |
| Turn 完成 | live 内容与持久化历史只显示一次 |
| Reconnect | snapshot 和 seq replay 不重复、不丢消息 |
| Agent 适配 | vendor 差异不扩散到通用 UI 组件 |
| Web 端 | 与本地客户端使用同一套 Session 语义 |
| 移动端 | 不运行本地 CLI，只控制宿主端 Runtime |
| 长会话 | 消息列表可持续滚动，历史渲染不会随长度线性恶化 |

## 8. 推荐落地顺序

这份总结不直接批准代码实现，建议后续按以下顺序形成正式设计和 Issue：

### Phase A：体验基线

锁定 Codeg `v0.23.1` 作为参考版本，记录目标页面、消息状态和关键交互，
区分“直接采用”“适配后采用”和“暂不采用”。

### Phase B：交互设计合同

将 Workspace、Conversation、Message、Approval、Error、Reconnect 和 Mobile
行为写成 CLI GUI 的正式设计文档，并回链现有 PRD、SPEC 和 Issue。

### Phase C：状态与事件质量

先解决 AgentEvent、live/persisted reconciliation、event sequence、snapshot、
审批状态和取消清理，再继续增加复杂 UI 功能。

### Phase D：渲染与交互打磨

统一 MessageBlock、ToolCard、Dialog、Composer 和 Workspace panel 的组件边界，
补齐批处理、虚拟化、稳定 key、空/加载/失败/恢复状态。

### Phase E：开发测试门禁

形成类似 Codeg 的 `cli-gui` 检查矩阵：类型检查、lint、单测、fixture/snapshot、
API/WS 集成、浏览器交互和各运行模式构建使用同一套可复制命令。

### Phase F：Web、移动端和新特性

在单 Agent 会话和交互状态稳定后，再扩展 Web、移动端、delegation、自定义 Agent
和新的 SpecOS 产品特性。

## 9. 边界与限制

- 本文是外部项目学习材料，不是 Codeg 的持续同步镜像。
- Codeg 的公开文档没有覆盖所有内部前端实现；源码和测试结论基于固定 commit。
- 不应直接复制 Codeg 的数据库、UI 产品模型或 vendor 分支；必要的源码复用需
  遵守 Apache-2.0、保留许可证和第三方依赖声明。
- 不应把 Codeg 的用户行为直接升级为 SpecOS 规范；适配结果必须回到 PRD、
  Feature Spec、平台设计和测试合同。
- 当前 CLI GUI 尚未因为本文获得真实 ACP 支持；本文不改变现有运行时合同。

## 10. 参考路径

### Codeg 官方文档

- [Architecture](https://docs.codeg.app/reference/architecture)
- [Workspace](https://docs.codeg.app/guide/workspace)
- [Development](https://docs.codeg.app/reference/development)
- [Conversation Aggregation](https://docs.codeg.app/guide/aggregation)
- [Multi-Agent Collaboration](https://docs.codeg.app/guide/multi-agent)

### Codeg 实现路径

- `src/components/message/virtualized-message-thread.tsx`：消息虚拟化、overscan、
  稳定 key 和滚动控制；
- `src/components/message/message-list-view.tsx`：消息分组、assistant run 合并、
  tool group 合并、统计和 artifact 展示；
- `src/contexts/acp-connections-context.tsx`：事件 reducer、16ms streaming batch、
  snapshot hydration、连接状态和 pending interaction；
- `src/stores/conversation-runtime-store.ts`：persisted/optimistic/live timeline、
  去重、watermark 和 Transcript reconciliation；
- `src-tauri/src/acp/session_state.rs`：后端权威的 SessionState 和 snapshot；
- `src-tauri/src/acp/event_stream.rs`：事件序列、广播、recent event buffer 和 attach；
- `src-tauri/tests/`、`src/components/**/*.test.tsx` 和 `src/stores/**/*.test.ts`：
  协议、状态、组件和跨模式行为证据。

### SpecOS CLI GUI 对照路径

- `cli-gui/shared/agent-runtime.ts`：Agent Backend、Session、Turn 和 Event 合同；
- `cli-gui/server/agent-backends.ts`：Backend registry、legacy adapter bridge 和
  当前 ACP 占位；
- `cli-gui/doc/mvp02/spec/agent-runtime-spec.md`：Agent Engine、Transport、Provider
  分离和失败语义；
- `design/cli-gui-platform-design.md`：跨版本平台架构源文档；
- `cli-gui/doc/mvp02-check-qa/experience-checklist.md`：当前 GUI 体验检查入口。

