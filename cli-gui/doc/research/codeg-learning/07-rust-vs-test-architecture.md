# 07｜功能可独立集成与测试：Rust 特性，还是架构设计？

## 先给结论

Codeg 的「每个功能可以单独集成、单独测试」不是 Rust 单独带来的能力。更准确的
归因是：

```text
Rust 语言 / Cargo
  提供类型、所有权、trait、cfg、feature、测试工具

Codeg 架构
  把 Core、binary、transport、Agent adapter、session、event 和 UI 分层

Codeg 测试设计
  为这些边界准备 test constructor、fake emitter、in-memory DB、临时目录、
  test connection、snapshot 和不同 feature matrix
```

可以用一个比例感来理解，但不要把它当作可测量的百分比：

> Rust 让边界更容易被写进类型和编译过程；架构决定边界在哪里；测试设计决定边界
> 是否真的可以被单独验证。

Codeg 官方架构文档把产品描述为「一个 Rust core、一个 web frontend、三个 binary」，
并说明桌面、server 和 MCP companion 共享同一个 `codeg_lib`；官方开发文档又把
`test-utils`、Vitest、Rust feature matrix 和 parser snapshot 分别列为检查路径。
[Architecture](https://docs.codeg.app/reference/architecture)、[Development](https://docs.codeg.app/reference/development)

## 1. 把“独立可测试”定义清楚

一个功能真正能够独立集成/测试，至少满足下面五项：

```text
1. Contract       输入、输出、错误和终态稳定
2. Owner          状态、进程、连接和资源的所有者明确
3. Port           外部 DB、IPC、时间、文件、Agent 可替换
4. Projection     runtime 状态到 API/UI 的投影可单独验证
5. Fixture        不启动完整产品也能构造成功、失败和竞争场景
```

例如「Agent permission」不是一个按钮，而是一组可以独立验证的契约：

```text
permission request
  -> pending(request_id)
  -> allow / deny / cancel / timeout
  -> exactly one terminal result
  -> session state + event + UI projection
```

如果测试必须启动 Tauri、真实 Agent、真实账户和完整浏览器才能验证其中一条状态，
这项功能就还没有真正被隔离。

## 2. Rust 到底贡献了什么

### 2.1 `enum`、`Option`、`Result`：把状态和失败写进接口

Agent Runtime 有很多不适合用字符串表达的状态：连接是否 handshake、session 是否
等待 permission、tool 是否完成、cancel 是否已经结算。Rust 的 `enum` 和穷尽匹配
让代码必须面对状态集合；`Result<T, E>` 让错误成为返回契约而不是隐含异常。

这会带来两个直接收益：

- 新增状态时，编译器可以提示未处理的分支；
- 测试可以直接构造某个状态和某类错误，而不必通过长流程“碰巧”进入它。

但这仍然只是表达能力。一个 TypeScript 项目也可以用 discriminated union 和
`Result` 风格对象做到类似效果；差别是 Rust 编译器对遗漏分支、move 和类型不一致的
约束更强。

### 2.2 ownership、`Send`、`Sync`：帮助界定并发资源

Codeg 同时持有 child process、Tokio task、session state、WebSocket subscriber、
MCP companion 和数据库连接。Rust 的 ownership/borrow checker 不会替团队设计出
正确的锁粒度，但会迫使实现者回答：

- 谁拥有这个进程或连接？
- 哪些值可以跨 task 移动？
- 谁能修改 session state？
- 任务结束时，引用和锁怎样释放？

这对发现数据竞态很有帮助，但不会自动防止逻辑竞态。例如重复 cancel、事件乱序、
权限 reply 与 process exit 竞争，仍然需要状态机、sequence、幂等规则和测试。

### 2.3 trait：依赖倒置的语言工具

Codeg 在 delegation 等模块中把较小的能力拆成 trait，例如 parent session lookup、
child status lookup、event emitter、metadata writer、connection spawner。这样核心
逻辑不必直接依赖真实 manager、数据库或网络。

相关源码：

- [`delegation/broker.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/broker.rs)
- [`delegation/event_emitter.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/event_emitter.rs)
- [`delegation/listener.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/listener.rs)
- [`delegation/spawner.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/spawner.rs)

trait 的价值不是“用了接口就可测试”，而是接口足够窄，并且被传入业务逻辑：

```text
DelegationBroker
  depends on ConversationDepthLookup
  depends on ChildStatusLookup
  depends on ConnectionSpawner
  depends on DelegationEventEmitter

test
  supplies in-memory fakes
  asserts task creation, status and event behavior
```

如果 trait 只是把一个巨大 `AppState` 原样包起来，测试仍然会很重；这叫接口存在，
不叫依赖隔离。

### 2.4 `cfg` 和 Cargo feature：编译期隔离

Codeg 的 Cargo manifest 用 `tauri-runtime` 区分桌面能力，用 `--no-default-features`
构建 headless server/MCP，并用 `test-utils` 暴露测试构造器。固定版本的 manifest
明确列出：

- `codeg` binary 需要 `tauri-runtime`；
- `codeg-server`、`codeg-mcp` 不需要默认桌面 feature；
- `test-utils` 暴露 `AppState::new_for_test`、test emitter、test connection 和
  parser test helper。

源码：[`src-tauri/Cargo.toml`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/Cargo.toml)

这里有两个层次：

```text
编译期：不让 Server/MCP 带入 Tauri 桌面依赖
测试期：让 integration test 得到受控的构造入口
```

这不是 Rust 独有的思想。其他语言可以用 build profile、模块包、依赖注入或测试
替身实现；Rust/Cargo 只是把它变成非常直接的编译配置。

## 3. Codeg 架构真正做对的地方

### 3.1 一个 library，多种 front door

官方架构文档描述的三种 binary 不是三份业务实现：

```text
codeg          -> Tauri desktop front door
codeg-server   -> HTTP/WebSocket front door
codeg-mcp      -> per-agent stdio companion

                 ↓
             shared codeg_lib
```

这样做的可测试收益是：

- Core 的 session、数据库、ACP 和 delegation 逻辑可以在无 GUI 的环境验证；
- Server 不必伪造 Tauri window 才能跑测试；
- MCP companion 可以单独检查 stdin/stdout 协议和父子进程边界；
- desktop/server 的差异集中在 transport 和生命周期入口，而不是复制业务规则。

### 3.2 `AppState` 是 composition root，不是测试替身

`AppState` 集中组装 DB、ConnectionManager、EventEmitter、Web state、workspace
transfer、delegation 等长期服务。它适合作为 production composition root，但不应成为
每个单元测试的唯一入口。

Codeg 额外提供 `AppState::new_for_test(db, data_dir)`，用测试数据库、临时目录和
受控的 emitter 创建最小运行环境。这个设计把：

```text
如何组装真实系统
```

与：

```text
测试某个 handler 所需的最小资源
```

区分开来。

源码：[`app_state.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/app_state.rs)

### 3.3 Test double 是显式产品边界

Codeg v0.23.1 中可以看到几类专门的测试 seam：

| seam | 用途 | 避免什么 |
| --- | --- | --- |
| `AppState::new_for_test` | 构造最小 Core | 启动完整桌面壳 |
| `EventEmitter::test_web_only` | 只验证 Web 广播路径 | 依赖真实 Tauri window |
| `EventEmitter::Noop` | 不关心输出时丢弃 emitter | 测试被事件 transport 干扰 |
| `ConnectionManager::insert_test_connection` | 构造逻辑连接 | 启动真实 Agent CLI |
| parser `with_base_dir` | 指向临时数据目录 | 读取开发者真实 home |
| `db::test_helpers` | 临时/内存数据库 | 污染真实 SQLite |
| delegation traits | 替换查询、写入、spawn、事件 | 拉起完整 delegation graph |

这些 seam 比 Rust 语法更直接地解释了「功能可以单独测试」。源码入口：

- [`web/event_bridge.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/web/event_bridge.rs)
- [`acp/manager.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/manager.rs)
- [`db/mod.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/db/mod.rs)

### 3.4 协议边界天然形成集成 seam

ACP、MCP、HTTP/WebSocket 和 Tauri IPC 都是外部边界。Codeg 没有让每个 Agent 的业务
逻辑直接调用 UI，而是把外部输入转换为统一的 session/event state，再由不同 transport
投影出去。

因此可以分别测试：

```text
wire parser       -> event normalization
session state     -> invariant / replay
manager           -> lifecycle / dedup / cancel
transport         -> framing / auth / serialization
renderer          -> state-to-UI projection
```

这就是 Agent 产品里很有价值的“垂直切片”方式：从一个 feature 的完整契约出发，沿
边界拆成多个小测试，而不是只靠一个端到端用例。

## 4. Codeg 测试架构证明了什么

官方开发文档给出的测试路径包含：

```text
Frontend
  pnpm eslint .
  pnpm test / test:watch / test:coverage

Rust
  cargo check                         # desktop/default feature
  cargo check --no-default-features  # server / MCP mode
  cargo clippy --all-targets --features test-utils
  cargo test --features test-utils
  cargo test --no-default-features --bin codeg-server --lib
  cargo insta review                  # parser snapshot changes
```

这套矩阵说明它在验证不同问题：

| 测试入口 | 主要证明 |
| --- | --- |
| Rust unit | 状态、解析、错误和局部 invariant |
| Rust `test-utils` integration | Core 与临时 DB、事件、连接 seam 的组合 |
| headless Rust test | Server/MCP 不依赖 Desktop feature |
| parser snapshot | 外部 Agent transcript 到统一模型的稳定性 |
| Vitest store/component | 前端 projection、render contract 和状态隔离 |
| UDS/Windows delegation tests | 跨进程、平台 IPC 与 companion 行为 |
| E2E/browser tests | 用户滚动、重连、权限和资源加载的真实行为 |

**重要判断**：官方命令和源码测试展示的是“分层验证策略”，不是“Rust 项目天然能
单测”。如果把同样的逻辑全部写进一个巨型 `AppState` handler，即使用 Rust，也很难
单独测试。

## 5. 与语言无关、但 Codeg 做得好的设计模式

### 模式 A：Port / Adapter

业务模块依赖小接口，真实数据库、进程、事件总线和 transport 作为 adapter。Rust 用
trait 表达 port，TypeScript 可以用 interface + factory，Go 可以用 interface，Java
可以用 interface/DI container。

### 模式 B：Composition Root

把真实实现集中在启动入口组装，把测试实现从入口注入。它比全局 singleton 更容易替换
和清理。

### 模式 C：状态机 + 事件投影

把 Agent 行为建模为命令、状态、事件和 snapshot。UI 不直接猜测 child process 的状态，
而是消费稳定的 projection。

### 模式 D：Feature/Capability Matrix

每个 Agent 或 binary 声明 capability，连接层和 UI 根据能力决定行为；不把“是否支持
某功能”散落成大量供应商名称判断。

### 模式 E：测试专用构造器

为测试提供最小、显式、受控的构造方式；测试专用 API 在生产编译中不进入，避免形成
错误的正式使用面。

这些模式在 Java、Go、TypeScript、C# 中都可以实现。Rust 的优势在于 ownership、类型
和 `cfg` 让一部分错误更早暴露，但模块边界仍需要架构师主动设计。

## 6. 反例：什么不算真正的独立集成

下面几种做法看起来模块化，实际上边界仍然很弱：

1. 每个功能都有一个文件，但都直接读取全局 `AppState` 的所有字段；
2. 每个功能都有测试，但测试必须启动真实 Agent、真实网络和真实用户目录；
3. 用 `#[cfg(test)]` 把大量内部字段公开，却没有稳定的领域契约；
4. 所有 adapter 返回 `serde_json::Value`，错误只在 UI 运行时才暴露；
5. 用 Cargo feature 隐藏未编译路径，却没有为每种 shipping feature 做 CI 检查；
6. snapshot 测试只比较大 JSON，不检查重复事件、序列、权限和终态 invariant；
7. 只测成功路径，不测 child exit、timeout、cancel race、missing companion 和 gap。

Rust 可以让这些代码编译通过，但不会替你判断系统是否可恢复、可诊断和可演进。

## 7. 对当前 SpecOS/CLI GUI 的迁移方式

不要先问“要不要全部改 Rust”。先给每个 Agent capability 做一个可替换模块：

```text
feature/
  domain/       状态、命令、事件、错误
  ports/        Runtime、Transport、Store、Clock、Process 的最小接口
  application/  编排用例和终态规则
  adapters/     Node sidecar、WebSocket、MCP、文件系统等真实实现
  projection/   Transcript、message、inspector UI 投影
  tests/
    unit        纯状态和错误
    contract    adapter/protocol contract
    integration fake runtime + temp store
    e2e         用户流程和平台行为
```

在当前 TypeScript/Node 体系里，可以先这样落地：

```ts
export interface AgentRuntimePort {
  start(input: StartInput): Promise<RuntimeHandle>;
  send(handle: RuntimeHandle, command: AgentCommand): Promise<void>;
  cancel(handle: RuntimeHandle): Promise<void>;
}

export function createAgentService(deps: {
  runtime: AgentRuntimePort;
  store: TranscriptStore;
  clock: Clock;
}) {
  // application logic depends on ports, not child_process or WebSocket directly
}
```

然后准备三个替身：

- `FakeAgentRuntime`：按固定事件脚本返回 delta、tool、permission、exit；
- `MemoryTranscriptStore`：验证 snapshot/replay 和重复事件；
- `FakeClock`：验证 timeout、idle cleanup 和 cancel race。

等这些边界稳定后，如果某一部分确实需要 native process、并发安全或跨桌面/server
复用，再评估 Rust Core；Rust 应该是边界稳定后的实现选择，不是替代架构设计的捷径。

## 8. 推荐的判断顺序

以后看到 Codeg 某个“可以单独测试”的功能，按这个顺序分析：

1. 先找领域状态和终态，不要先看测试框架；
2. 找 production composition root，确认真实依赖在哪里组装；
3. 找 `trait`/interface/port，确认外部依赖能否替换；
4. 找 test constructor、fake emitter、temporary path、in-memory DB；
5. 找 feature matrix，确认不同 binary/部署模式是否都被检查；
6. 找 snapshot、integration、E2E，确认每层证明的内容；
7. 最后才把收益归因给 Rust、TypeScript 或某个测试库。

## 本篇验收

- 能把 Rust 语言能力、Cargo 能力、架构设计和测试设计分别归类。
- 能解释 `test-utils` 为什么比普通 `#[cfg(test)]` 更适合跨 crate integration tests。
- 能从 Codeg 源码找到至少三种 test seam，并说明它们替换了什么真实依赖。
- 能说明为什么共享 `codeg_lib` 和三 binary 让功能更容易做 headless/integration 验证。
- 能在当前 TypeScript 项目中设计等价的 port、fake runtime 和测试矩阵。
- 能识别“文件拆开了但依赖仍耦合”的假模块化。
