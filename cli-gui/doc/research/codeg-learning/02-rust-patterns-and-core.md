# 02｜Rust 核心与设计模式：从后端思维进入 Agent Runtime

## 本篇目标

Codeg 的 Rust 价值不在于「换一种语言写后端」，而在于它把进程、会话、事件、
文件和权限放在一个需要长期运行的本地 Runtime 中。读完后应能把下面几类概念
和真实模块对应起来：

```text
ownership / Send + Sync
  -> async task / channel
  -> manager / state machine
  -> event bus / snapshot
  -> process supervision / recovery
```

## 1. 建议的 Rust 学习顺序

### 1.1 先掌握表达状态的类型

后端开发常把状态写进字符串、整数和 nullable 字段；Codeg 大量使用 Rust 的
`enum`、`Option`、`Result` 和结构体，把「状态集合」直接写进类型。

学习顺序：

1. ownership、move、borrow、slice；
2. `Option<T>` 和 `Result<T, E>`；
3. `enum` 搭配 `match` 和穷尽性检查；
4. trait、泛型和 `dyn Trait`；
5. `Send`/`Sync`、`Arc`、锁和 channel；
6. Tokio async、取消和任务生命周期；
7. feature、平台条件编译和进程边界。

不要一开始背所有 lifetime 语法。先看清楚一个值由谁拥有、谁借用、谁负责结束
它的生命周期，再处理编译器指出的具体 lifetime 问题。

## 2. 设计模式总表

| 模式 | Codeg 位置 | 解决的问题 | 学习时观察什么 |
| --- | --- | --- | --- |
| Composition Root | `app_state.rs`、`lib.rs` | 在入口组装 DB、Manager、EventBus、Web | 依赖在哪里创建，谁拥有关闭顺序 |
| Registry | `acp/registry.rs`、`custom_registry.rs` | 用元数据描述 Agent，不复制连接实现 | identity、distribution、capability 如何分离 |
| Adapter | `acp/connection.rs`、parsers | 把 Vendor/ACP wire 转成产品事件 | 差异是否被限制在窄门 |
| Manager | `acp/manager.rs`、terminal manager | 管理连接去重、取消、复用、清理 | manager 是否拥有生命周期，而非业务 handler |
| Actor-like command loop | connection/delegation companion | 用消息串行化对共享状态的操作 | 哪些操作可并发，哪些必须排队 |
| Event bus | `acp/event_stream.rs`、internal bus | 一个事件供多个观察者消费 | sequence、snapshot、buffer gap |
| Snapshot / Replay | `session_state.rs`、`event_stream.rs` | 断线后恢复可见状态 | replay 失败时如何退回 snapshot |
| Strategy by feature | Cargo features | Desktop 与 headless 共享 Core | 依赖是否在编译期隔离 |
| Typed error boundary | `app_error.rs`、`acp/error.rs` | 把错误转换为稳定的 UI/API 错误 | 原始错误是否泄露到产品层 |

源码入口：

- [`app_state.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/app_state.rs)
- [`acp/manager.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/manager.rs)
- [`acp/session_state.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/session_state.rs)
- [`acp/event_stream.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/event_stream.rs)
- [`app_error.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/app_error.rs)

## 3. Ownership：谁拥有 Agent 进程和 Session

一个 Agent session 不是一次函数调用。它可能持续几分钟，期间产生消息、工具调用、
权限请求、子 Agent 和取消事件。因此最先要问的不是「哪个函数返回结果」，而是：

- child process 由谁持有？
- session state 由谁更新？
- disconnect 后谁负责清理？
- UI 断线时哪些数据仍然必须保留？

Codeg 通过 `ConnectionManager`、connection task 和 `SessionState` 分开处理这些问题：

```text
ConnectionManager
  owns lookup / dedup / reuse / cancel / shutdown

Connection task
  owns ACP wire I/O and protocol lifecycle

SessionState
  owns product-visible live state and snapshot

Event stream
  owns sequence, subscribers, replay and fallback
```

这不是把所有状态塞进一个 struct。它把「生命周期所有权」和「可观察状态」拆开，
这样 UI 可以读取 snapshot，却不能直接控制 child process 的内部资源。

## 4. `Arc`、锁和 `Send + Sync`

本地 Agent Runtime 同时有：

- Tokio task；
- Web 请求；
- Tauri command；
- event subscriber；
- MCP companion；
- 数据库操作。

因此值是否能跨 task 移动、是否允许多个读者、是否只有一个写者，必须显式表达。

典型选择：

| 场景 | 常见工具 | 需要回答的问题 |
| --- | --- | --- |
| 多个异步任务共享长期服务 | `Arc<T>` | 谁负责最终 shutdown？ |
| 多读少写的 session snapshot | `Arc<RwLock<T>>` | 写锁覆盖的代码是否足够短？ |
| 需要串行化一次更新 | `tokio::sync::Mutex` | 是否允许 await 发生在锁内？ |
| 跨任务传递命令 | `mpsc` / `oneshot` | 背压、关闭和响应如何表达？ |
| 只读共享配置 | `Arc<T>` 或 clone | 是否需要动态更新？ |

**学习方法**：每看到一个 `Arc<Mutex<_>>`，不要只记作「Rust 并发模板」，要沿着
调用链确认：

1. 锁保护的 invariant 是什么；
2. 锁内有没有进程 I/O、数据库 I/O 或另一个 await；
3. 任务取消时锁是否能释放；
4. 读者看到的是 live state、snapshot 还是缓存副本。

## 5. Manager 和 actor-like command loop

Codeg 的 connection 和 delegation companion 都存在「多个来源向同一会话发命令」的
问题。来源可能是主窗口、移动端、MCP tool call 或 parent teardown。

一种可学习的抽象是：

```rust
enum Command {
    Prompt(PromptInput, oneshot::Sender<Result<PromptResult, Error>>),
    Cancel(oneshot::Sender<Result<(), Error>>),
    Shutdown,
}
```

任务只在一个循环中修改 connection-specific 状态，外部调用者通过 channel 提交命令。
这样可以把「共享可变状态」改造成「一个拥有者 + 多个消息发送者」。

Codeg 的实现不一定每处都使用同一个纯 actor 模板，但 `manager.rs`、
`delegation/companion.rs` 和 `delegation/broker.rs` 展示了相同的设计压力：

- command 可能乱序到达；
- cancel 可能早于 spawn、发生在 spawn 中或晚于完成；
- parent disconnect 不能遗留 child；
- 重复请求不能产生两个 connection 或两个终态。

**Agent 工程启发**：把取消、超时、重复提交和断连当成正常输入，而不是异常分支。

## 6. Event bus、Snapshot 与 Event Sourcing 的区别

Codeg 同时维护实时事件和可恢复状态，不能只依赖其中一个：

```text
ACP update
  -> normalize to AcpEvent
  -> apply to SessionState
  -> assign envelope sequence
  -> broadcast / replay buffer
  -> lifecycle / transcript / UI subscribers
```

### Event stream 负责什么

[`event_stream.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/event_stream.rs)
负责订阅、序列、缓冲、replay 和 snapshot fallback。事件缓存同时受条数和字节上限
约束，超大 tool output 或图片可能直接触发 snapshot。

### SessionState 负责什么

[`session_state.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/session_state.rs)
负责把事件应用到 live state，例如：

- 当前 turn；
- tool call 最新结果；
- pending permission/question；
- delegation；
- usage 和 mode。

### Transcript 负责什么

Transcript 保存产品需要的历史事实；它不应该被当作所有实时状态的唯一来源。用户
刷新时需要一个可恢复的 snapshot，实时连接则需要 sequence 和 replay。

这和传统 Event Sourcing 有相似处，但学习时不要直接把 Codeg 说成完整 Event Sourcing
系统。需要先确认哪些事件可重放、哪些状态只保留最新值、哪些 transcript 是另外的
产品存储。

## 7. Typed error boundary

Rust 内部错误通常需要保留详细上下文，但 UI 需要稳定的 code、message、remediation
和 retry 语义。Codeg 的 `app_error.rs` 和 `acp/error.rs` 是观察错误分层的入口。

建议用下面的三层来读：

```text
OS / process / protocol error
  -> domain error (typed enum)
  -> command / HTTP / UI error (stable code + remediation)
```

学习检查：

- Node/npm/uv 缺失是否能给出修复动作？
- ACP initialize 超时是否和 Agent 未安装区分？
- session resume 不支持是「新建 session」还是「失败」？
- cancel 是否被错误地展示成普通 error？
- secret、command line、环境变量是否被日志和 snapshot 脱敏？

## 8. 为什么需要 `recursion_limit` 和 feature gate

`lib.rs` 顶部设置了更高的 `recursion_limit`，原因是大型 ACP connection future 的
类型布局很深。这是编译期类型递归限制，不是运行时 timeout。

这件事适合用来区分两类问题：

- **编译器类型复杂度**：future、泛型、trait 组合导致编译期负担增加；
- **运行时复杂度**：连接数、事件量、锁竞争、网络延迟导致吞吐或内存变化。

不能因为一个参数名字像性能开关，就把它当作运行时性能调优。

## 9. 代码阅读练习

### 练习 A：从入口追踪关闭顺序

沿着 `lib.rs` 的 Tauri setup 和 exit callback，列出：

1. 哪些 manager 被注册；
2. 哪些 manager 有 `shutdown`；
3. 哪些 child process 可能在窗口退出时仍在运行；
4. 为什么 shutdown 顺序会影响 transcript flush 和 delegation。

### 练习 B：给一个状态写 invariant

以 pending permission 为例，写出至少三个 invariant：

- request id 在 UI、manager 和 response 之间保持稳定；
- resolved 后不能再次产生第二个终态；
- turn 完成或 connection 关闭后不能留下永久 pending 状态。

然后阅读 `session_state.rs` 和 `manager.rs` 的测试，标注每个 invariant 的证据。

### 练习 C：比较锁与 channel

在 [Rust Session State 实验](./labs/rust-session-state/README.md) 中分别实现：

- `Arc<Mutex<State>>` 直接修改；
- 单一 worker 持有 `State`，外部通过 channel 发命令。

比较代码可测试性、取消语义和并发访问边界。

## 10. 本篇验收

- 能解释 `Arc`、锁、channel 和 `Send/Sync` 在 Agent session 中分别解决什么问题。
- 能画出 Manager、connection task、SessionState 和 event stream 的所有权关系。
- 能区分 live state、snapshot、replay event 和 transcript。
- 能用一个具体状态说明「重复请求、取消、断连」如何影响状态机。
- 能在 Rust 中写出带 typed error、可取消任务和测试 seam 的最小 session manager。
