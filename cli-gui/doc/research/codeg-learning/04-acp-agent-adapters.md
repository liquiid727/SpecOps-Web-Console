# 04｜ACP 与 Agent 适配：把外部 Agent 变成可管理的会话

## 本篇目标

ACP（Agent Client Protocol）最值得学习的地方，不是记住几个 JSON-RPC 方法，而是
理解一个 Agent Runtime 如何把「不同供应商、不同安装方式、不同进程生命周期」收敛
成同一套产品语义。读完后应该能够回答：

1. Agent 元数据、安装分发、可执行文件和 ACP 连接分别由谁负责？
2. 一个 session 从 preflight 到 prompt、cancel、cleanup 经过哪些状态？
3. 为什么 UI 不能直接消费供应商的原始事件？
4. 断线、权限请求、用户问题和 delegation 为什么需要独立的状态通道？

这篇按 Codeg `v0.23.1` 的固定源码阅读。实验目录里的 fixture 是教育用途的
JSONL/JSON-RPC 假 Agent，不是完整 ACP 合规实现。

## 1. 先画出适配链

```text
AgentRegistry / CustomRegistry
        │  identity + distribution + capabilities
        ▼
Preflight / BinaryCache
        │  node/npm、uv、平台 binary、版本和路径检查
        ▼
ACP adapter 或 bundled executable
        │  child process + stdin/stdout JSON-RPC/NDJSON
        ▼
ConnectionManager
        │  dedup、handshake、session、prompt、cancel、shutdown
        ▼
SessionState + EventStream
        │  normalized event、snapshot、sequence、replay
        ▼
Workspace API / Tauri IPC / WebSocket
        │
        ▼
React message renderer、permission UI、question UI
```

**事实**：Codeg 的 registry 将 Agent 描述为元数据和 distribution；`preflight` 按
`npx`、`uvx`、平台 binary 等方式检查运行前条件；`manager` 再负责连接复用、session
生命周期和取消。相关入口是：

- [`acp/registry.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/registry.rs)
- [`acp/custom_registry.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/custom_registry.rs)
- [`acp/preflight.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/preflight.rs)
- [`acp/binary_cache.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/binary_cache.rs)
- [`acp/manager.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/manager.rs)

ACP 官方架构把编辑器/客户端与 Agent 之间的通信定义为协议边界；协议的价值是让
客户端可以替换 Agent，而不必为每个供应商重写整个 UI 和会话层。[ACP architecture](https://agentclientprotocol.com/get-started/architecture)

## 2. 三个容易混淆的对象

### 2.1 Registry identity：这个 Agent 是谁

`AcpAgentMeta` 一类的元数据回答的是产品层问题：显示名称、标识、图标、能力、配置
入口、是否支持 delegation 等。它不应该直接等同于一个 shell 命令。

### 2.2 Distribution：怎样得到可运行程序

Codeg v0.23.1 的 custom registry 支持几类分发描述：

| 分发类型 | 典型执行方式 | 运行前检查 | 主要风险 |
| --- | --- | --- | --- |
| npm | `npx` / Node adapter | Node、npm、包名、版本或 channel | registry 变化、下载耗时、脚本供应链 |
| Python | `uvx` / Python adapter | uv、包名、版本或 channel | 环境创建、解释器和缓存差异 |
| binary | bundled 或缓存 binary | 平台、架构、路径、可执行权限 | 下载、校验、平台兼容 |

**事实**：这些分发定义在 `registry.rs` / `custom_registry.rs`，并由 `preflight.rs`
分别验证；binary cache 负责缓存和可用性检查。这里的分层让「支持一个 Agent」不必
把安装逻辑散落到 UI 页面。

### 2.3 Connection：怎样与它通信

Connection 是一次运行中的进程和协议会话。即使两个 Agent 使用相同的 vendor CLI，
也可能因为 adapter 版本、启动参数、环境变量和 ACP 能力不同而是不同的 connection。

不要把下面两件事混为一谈：

```text
用户机器上存在 vendor-native CLI
        ≠
Codeg 能够启动所需的 ACP adapter
```

**推断**：Codeg 把「原生 CLI 是否存在」与「ACP adapter 是否可执行」分开检查，是
为了避免把产品协议能力误判成 PATH 上某个命令的存在。这个结论来自 `preflight.rs`
中 adapter/native 两条检查路径以及 registry 的 distribution 描述。

## 3. Registry → Preflight → Spawn

### 3.1 Registry 是策略数据，不是连接实现

读取 `registry.rs` 时，重点看四个维度是否独立：

1. 稳定 identity：UI、历史记录和设置引用的 key；
2. distribution：npx、uvx、binary 及其版本/平台信息；
3. capabilities：是否支持 load、fork、question、permission、delegation 等；
4. adapter command：最终如何构造 child process。

如果这四个维度混在一个「Agent 类」中，新增供应商就会同时修改 UI、安装器、连接器
和测试。Codeg 的 registry + preflight 组合提供了一个窄的扩展缝。

### 3.2 Custom registry 必须先验证再 hydrate

自定义 Agent 的风险比内置常量多：用户输入可能为空、版本 channel 不合法、路径越界、
平台 binary 缺失或命令参数不完整。因此 `custom_registry.rs` 的阅读顺序建议是：

```text
raw JSON
  -> schema / semantic validation
  -> platform selection
  -> command construction
  -> fingerprint / hydrate
  -> unified AcpAgentMeta
```

**事实**：v0.23.1 的测试覆盖了坏 channel、空 package、路径 traversal、缺 platform
binary 等失败情况。学习时应把「失败输入」和「正常输入」一起当作 registry 的契约，
而不是只看如何生成一条成功命令。

### 3.3 Preflight 的职责边界

Preflight 不应该启动完整 session。它适合回答：

- 依赖是否安装、版本是否可接受；
- adapter 或 binary 路径是否存在且可执行；
- 缓存是否命中、下载是否需要进行；
- 当前平台/架构是否支持；
- 用户需要采取什么可操作的修复动作。

它不应该吞掉连接层的 handshake、session 初始化或 prompt 错误。这样 UI 才能把
「环境没准备好」和「Agent 已启动但协议失败」显示成两个不同的错误状态。

## 4. Connection 生命周期

可以把一次逻辑 session 画成下面的状态机：

```text
Declared
   │ select distribution
   ▼
Preflighted ── failure ──> ActionableError
   │ spawn
   ▼
ProcessStarted ── timeout/exit ──> Failed
   │ initialize
   ▼
Initialized
   │ session/new or resume
   ▼
Ready ── prompt ──> Running
  ▲                  │
  │                  ├── permission/question wait
  │                  ├── cancel
  │                  └── turn complete
  └── cleanup <──────┘
```

**事实**：`manager.rs` 对连接创建做 dedup/handshake/pending 管理，并包含 idle、stale、
prompt、cancel、fork 和 question 等生命周期逻辑；`connection.rs` 负责更靠近协议的
请求/通知处理。

需要特别观察的几个并发问题：

- 同一 logical session 的并发打开请求是否只 spawn 一个进程？
- initialize 尚未完成时，后续 prompt 是排队、失败还是复用 pending future？
- cancel 与 process exit 同时发生时，谁写入最终状态？
- idle 清理是否会杀掉仍有等待中的 permission/question？
- MCP request 被取消后，连接和子任务是否都能收到取消信号？

这些问题比「调用某个 API」更能体现 Agent Runtime 的后端工程属性。

## 5. Wire event 为什么要归一化

供应商或协议层事件适合传输，不一定适合直接渲染。Codeg 在 ACP 层维护事件 envelope、
session state 和 event stream，把 wire event 变成产品可观察状态：

```text
wire notification
  -> AcpEvent / EventEnvelope
  -> SessionState::apply_event
  -> sequence + snapshot
  -> UI-specific projection
```

这条链有三个重要约束：

1. **可重放**：事件带有序列或能被 snapshot 替代，断线后不会只能等待下一条 delta；
2. **可去重**：重复通知不会把同一 tool call、message chunk 或终态追加两次；
3. **可诊断**：未知事件不应静默丢弃，至少要留下结构化日志或诊断事件。

相关源码：

- [`acp/types.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/types.rs)
- [`acp/session_state.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/session_state.rs)
- [`acp/event_stream.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/event_stream.rs)

### Snapshot + replay 的恢复协议

推荐把前端订阅理解成一个小协议，而不是「WebSocket 连上就全量推送」：

```text
1. client 获取 snapshot(seq = S)
2. client subscribe(last_seq = S)
3. server replay S+1 ... current
4. server 继续发送 live event
5. 如果 seq gap / buffer overflow -> snapshot(seq = T)，再继续订阅
```

**事实**：Codeg 的 `event_stream.rs` 维护 snapshot、sequence、buffer 和 gap/oversize
fallback；`session_state.rs` 也有快照、顺序和重复事件测试。

**学习判断**：对于带流式文本、工具进度和权限状态的 Agent UI，snapshot 是恢复的
安全底线，replay 是降低恢复成本的优化。不要把 replay 当成唯一真相。

## 6. Permission、Question 和 Cancel 是三种不同交互

| 交互 | 谁发起 | UI 要做什么 | 终止语义 |
| --- | --- | --- | --- |
| permission | Agent 请求执行受保护动作 | 展示范围、风险和 allow/deny | 明确回复；超时/取消也要收敛 |
| question | Agent 需要用户补充信息 | 展示问题、选项或自由输入 | reply、取消或 session 终止 |
| cancel | 用户或上层编排发起 | 立即反馈正在取消，停止继续追加 | 最终状态幂等，不能重复结算 |

它们都可能与 streaming、process exit、WebSocket reconnect 交叉发生，所以不应只用
一个 `isLoading` 布尔值表示全部状态。建议在学习时为每种交互分别画出：

```text
request id -> pending -> accepted/rejected/cancelled/expired -> terminal
```

并回答「请求已经离开 UI 但 reply 尚未写回」时，谁是 authoritative owner。

## 7. codeg-mcp 与 delegation：工具适配的另一条边界

Codeg 不只把 Agent 当作聊天对象，还通过 `codeg-mcp` 给 Agent 提供当前工作台的
MCP companion 能力。其关键不是再开一个 HTTP 服务，而是把 companion 作为受控子进程：

```text
ACP Agent process
       │ MCP stdio
       ▼
codeg-mcp companion
       │ local IPC (UDS / named pipe)
       ▼
Codeg parent / delegation broker
       │
       ├── session / task state
       ├── permission boundary
       └── event / status reporting
```

**事实**：`codeg_mcp.rs` 使用 stdin/stdout 承载 MCP JSON-RPC，并通过本地 socket 与
父进程通信；delegation broker 以 task id 和状态查询为主，不把一个长时间 Agent 调用
阻塞成单个同步 RPC。

源码入口：

- [`codeg_mcp.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/bin/codeg_mcp.rs)
- [`acp/delegation/companion.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/companion.rs)
- [`acp/delegation/broker.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/broker.rs)
- [Codeg custom agents](https://docs.codeg.app/guide/custom-agents)

适合迁移到自己项目的原则：

- 子进程协议的 stdout 只能输出协议帧，日志必须走 stderr；
- 每次 companion 启动都使用短生命周期 token 或等价认证；
- task 创建、状态查询、取消和结果读取要有稳定 id；
- companion 缺失时应有明确的软失败/降级路径；
- 不要让 Agent 自己决定任意 socket、路径或工具权限。

## 8. 异常场景清单

| 阶段 | 场景 | 应验证的结果 |
| --- | --- | --- |
| registry | package 为空、坏 channel、路径越界 | validation error 可操作，不能生成危险命令 |
| preflight | Node/uv/adapter 缺失 | 区分环境错误与协议错误，并给出修复提示 |
| spawn | binary 不可执行、子进程立即退出 | pending 请求收敛，不留下假连接 |
| handshake | initialize 超时或能力不兼容 | timeout 有上限，资源清理可重复 |
| dedup | 同一 session 并发打开 | 只产生一个 owner，其他调用复用或明确失败 |
| event | 重复、乱序、未知 notification | 去重/诊断；不会破坏 snapshot |
| stream | seq gap、buffer overflow、超大事件 | 回退 snapshot，不无限等待 replay |
| interaction | permission/question 与 cancel 竞争 | reply 幂等，终态唯一 |
| MCP | stdout 混入日志、socket 失效、重复 request | 协议帧可解析，错误可追踪，任务不泄漏 |
| delegation | companion 不存在或远端 task 卡住 | 查询仍可返回，支持取消和超时 |

这份表是学习和测试边界，不声称每个场景都已经在 Codeg 中以相同方式解决；具体
结论要回到固定源码和测试。

## 9. 动手实验

### 实验 A：运行教育版 JSONL fixture

```bash
node cli-gui/doc/research/codeg-learning/labs/acp-jsonl-fixture/client.mjs
```

观察：

- 输入按行发送，输出按 JSONL 解析；
- response 和 notification 共享同一条 stdout stream；
- fixture 故意插入未知 update，client 不能因为未知类型崩溃；
- prompt 的多段输出必须保持顺序；
- cancel 的结果只能收敛一次。

然后改动 fixture 的输出顺序或插入坏 JSON，记录 client 应该报哪一类错误。这个实验
只练习进程、帧边界、相关 id 和事件顺序，不替代 ACP 官方 SDK 或协议测试。

### 实验 B：对照 Codeg 的真实连接层

按下面顺序阅读源码，并为每个函数写一句「输入、owner、输出、失败终态」：

1. registry → custom registry；
2. preflight → binary cache；
3. manager 的 spawn/dedup；
4. connection 的 initialize/session/prompt；
5. session state 的 apply event；
6. event stream 的 snapshot/replay；
7. permission/question/cancel；
8. companion/broker 的 delegation。

### 实验 C：为自己的 Agent 写 distribution contract

只写设计，不接入生产：

```text
AgentId
Distribution
  command / args / env / version / platform
Capabilities
Preflight checks
Normalized events
Permission and question contract
Cancel and cleanup contract
```

验收标准是：新增一个 Agent 时，UI 不需要知道它的安装方式；连接层不需要复制一套
供应商状态机；失败能定位到 registry、preflight、spawn、protocol 或 renderer 其中
一个边界。

## 10. 本篇验收

- 能画出 Agent 从 registry 到 UI 的完整适配链。
- 能解释 native CLI、ACP adapter、distribution 和 connection 的差异。
- 能说明 snapshot/replay 为什么比单纯推送 delta 更可靠。
- 能分别描述 permission、question、cancel 的请求和终态。
- 能用 fake fixture 复现 JSONL 帧边界、未知事件和取消幂等问题。
- 能为一个新 Agent 写出不依赖供应商 UI 的 distribution/事件/取消契约。
