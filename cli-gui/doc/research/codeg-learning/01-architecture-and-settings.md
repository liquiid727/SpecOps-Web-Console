# 01｜架构与配置：先找到 Codeg 的运行时边界

## 本篇目标

读完后应该能够回答四个问题：

1. Codeg 为什么可以同时提供桌面、Server 和 MCP companion？
2. 哪些能力属于共享 Rust Core，哪些只是不同的前门？
3. 一个设置从 UI 到数据库、环境变量、子进程的流向是什么？
4. 为什么「配置存在哪里」和「什么时候生效」必须一起设计？

## 1. 总体结构

Codeg 的架构可以先压缩成下面这张图：

```text
                    ┌──────────────────────┐
                    │  Next.js static UI   │
                    └──────────┬───────────┘
                               │
                  ┌────────────┴────────────┐
                  │                         │
             Tauri IPC                 HTTP / WebSocket
                  │                         │
        ┌─────────▼─────────┐   ┌──────────▼──────────┐
        │ codeg desktop     │   │ codeg-server         │
        │ native window     │   │ headless HTTP/WS     │
        └─────────┬─────────┘   └──────────┬──────────┘
                  └────────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │ codeg_lib / Rust    │
                    │ DB · ACP · Git      │
                    │ files · settings   │
                    └──────────┬──────────┘
                               │ stdio + local IPC
                    ┌──────────▼──────────┐
                    │ codeg-mcp           │
                    │ per-agent companion │
                    └─────────────────────┘
```

**事实**：官方架构文档把 `codeg`、`codeg-server`、`codeg-mcp` 描述为同一个 Cargo
package 产出的三个 Rust binary，共享 `codeg_lib`；桌面和浏览器的差异主要是
Tauri IPC 与 HTTP/WebSocket transport。[Architecture](https://docs.codeg.app/reference/architecture)

源码入口：

- [Cargo manifest](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/Cargo.toml#L1-L54)
  声明 library、features 和三个 binary。
- [`src-tauri/src/main.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/main.rs#L1-L17)
  是很薄的桌面入口。
- [`src-tauri/src/lib.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/lib.rs#L152-L242)
  负责 Tauri builder、插件和共享状态注册。
- [`src-tauri/src/bin/codeg_server.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/bin/codeg_server.rs#L1-L100)
  负责无 Tauri 的 Server 入口。

**推断**：桌面壳没有复制一套业务逻辑，Server 也不是第二个产品。前门只负责把
不同运行时能力接到同一个 Core，这降低了桌面和远程模式之间的语义漂移。

## 2. Cargo feature 是运行时边界

Codeg 使用一个默认 feature：`tauri-runtime`。

| 构建目标 | feature | 作用 |
| --- | --- | --- |
| `codeg` | 默认启用 `tauri-runtime` | Tauri 窗口、更新、通知、OS keyring 等桌面能力 |
| `codeg-server` | `--no-default-features` | HTTP/WebSocket、数据库、ACP，不引入 Tauri 桌面依赖 |
| `codeg-mcp` | `--no-default-features` | stdio MCP 和 delegation companion |
| 集成测试 | `test-utils` | 暴露临时目录、内存 DB、WebOnly emitter 等测试 seam |

**学习重点**：Feature 不只是「编译开关」，还在表达部署边界。一个依赖如果只
服务 Desktop，就不应成为 Server 和 MCP 的强制运行时依赖。

建议顺着下面的命令观察构建差异：

```bash
cd /tmp/codeg-v0231.Wj1u0S/codeg/src-tauri
cargo check
cargo check --no-default-features --bin codeg-server
cargo check --no-default-features --bin codeg-mcp
```

官方开发文档也把 Desktop、Server、MCP 的构建和检查命令拆开，并把 `--no-default-features`
作为 headless 模式的关键差异。[Development](https://docs.codeg.app/reference/development)

## 3. AppState 是 composition root

[`app_state.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/app_state.rs#L1-L240)
把数据库、ACP ConnectionManager、TerminalManager、EventEmitter、Web state、delegation
broker、workspace transfer、配置和更新状态组合到一起。

可以把它理解为：

```text
AppState
  ├── 持久化：AppDatabase
  ├── Agent：ConnectionManager / DelegationBroker
  ├── 事件：EventEmitter / InternalEventBus / Web bridge
  ├── 本地能力：Terminal / Git / Files / Workspace transfer
  ├── 外部入口：Web server / Tauri commands
  └── 运行时配置：feedback / question / session-info / update state
```

这里有两个值得区分的设计：

1. 长期存活的服务用 `Arc` 共享；互斥的更新、重启、回滚用 Tokio Mutex 串行化。
2. delegation 相关逻辑通过 trait 注入数据库查询、连接生成、状态查询和事件发送，
   使核心逻辑可以在没有 Tauri 的测试环境中运行。

**不要直接照搬的地方**：AppState 集中并不意味着所有模块都应从全局状态读取一切。
Codeg 仍然通过显式参数、trait 和模块边界把局部能力隔离开。学习时要记录每个依赖
是「长期共享状态」还是「本次调用输入」。

## 4. 配置所有权矩阵

Codeg 的配置可以按「读取时机」分为五类：

| 配置层 | 示例 | 存储/来源 | 读取者 | 生效时机 | 学习问题 |
| --- | --- | --- | --- | --- | --- |
| 启动前偏好 | Windows WebView2 GPU 开关 | `~/.codeg/preferences.json` | Tauri builder | 进程启动前 | 为什么不能等 Tokio 启动后再读？ |
| 普通应用设置 | 语言、日志、delegation 开关 | SQLite / shared settings helper | Core、Settings UI | 即时或下一次 Agent 启动 | 设置的写入者和消费方是否一致？ |
| 数据目录 | `CODEG_HOME`、`CODEG_DATA_DIR` | 环境变量 + 平台默认路径 | DB、uploads、pets、logs、子进程 | 进程初始化时 | 如何避免相对路径被子进程重新解释？ |
| 运行入口 | `CODEG_STATIC_DIR`、`CODEG_MCP_BIN` | 环境变量/相邻文件 | Server、delegation launcher | 启动或 spawn 前 | 缺失时是阻断还是降级？ |
| Secret | Git token、channel token | OS Keyring 或 Server token file | credential helper、MCP、channel | 调用时按需读取 | 秘密是否进入 DB、日志、事件和 transcript？ |

### 4.1 启动前 JSON：只保存必要的最小状态

[`preferences.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/preferences.rs#L1-L52)
保存需要在 Tauri builder 之前读取的偏好，例如 Windows 的硬件加速开关。读取失败
时回退默认值，避免「设置文件损坏导致应用无法启动」。

[`lib.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/lib.rs#L116-L150)
展示了读取偏好、拼接 WebView2 参数并在运行时线程启动前设置环境的顺序。

这里的 Rust 学习点不是 `unsafe set_var` 本身，而是它前面的生命周期约束：

```text
read preference
  -> validate/default
  -> apply process-level option
  -> start async/plugin runtime
```

### 4.2 SQLite：普通设置和业务事实共用持久化核心

[`db/mod.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/db/mod.rs#L20-L128)
展示了 Codeg 的数据库启动顺序：先建目录和恢复 backup，再用单连接跑 migration，
最后用运行时连接池服务请求。

SQLite 连接初始化还设置了 WAL、busy timeout、foreign keys、NORMAL synchronous 等
pragma。学习时要分别回答：

- 哪些设置是性能取舍？
- 哪些设置是数据一致性约束？
- 为什么 migration 不直接复用运行时连接池？

**可迁移原则**：schema migration 和业务并发访问不应共享同一个「随时可变」的初始化阶段。

### 4.3 数据目录：单一解析函数比散落环境读取更安全

[`paths.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/paths.rs#L1-L80)
和 [`lib.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/lib.rs#L242-L305)
共同体现了一个约束：启动早期解析出有效数据根目录，并把绝对路径传给数据库、文件、
Git credential helper、ACP 和子进程。

Codeg 同时保留 `CODEG_HOME` 与 `CODEG_DATA_DIR` 的兼容语义。源码对两者分裂只发出
警告，不自动合并，因此这是一个需要在运维文档中明确的边界，而不是可以忽略的命名差异。

## 5. Secret boundary

[`keyring_store.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/keyring_store.rs#L1-L180)
按照构建模式选择存储：

```text
Desktop/Tauri -> OS Keyring
Server         -> CODEG_DATA_DIR/tokens.json
MCP companion  -> per-launch temporary token
```

上层代码可以保持 token 的读写接口稳定，但实际安全属性不同：Server 的 `tokens.json`
不能等同于 macOS Keychain、Windows Credential Manager 或 Linux Secret Service。

学习时建立一张「秘密流向图」：

```text
Settings input
  -> validation
  -> keyring/file store
  -> short-lived launch environment
  -> child process
  -> redacted logs/events
```

每个箭头都要回答「有没有复制」「有没有落盘」「有没有进入 UI/日志」。

## 6. 这套架构解决了什么问题

1. **多前门复用语义**：Desktop、Server 和 MCP 不需要复制 Agent、数据库和会话逻辑。
2. **可测试的 Core**：`AppState::new_for_test`、内存 SQLite、临时目录和 WebOnly emitter
   让集成测试不依赖真实窗口。
3. **配置按生命周期分层**：必须早读的偏好、普通设置、数据目录和秘密不会全部塞进同一份配置。
4. **子进程边界可解释**：数据目录、PATH、credential helper 和 MCP token 在 spawn 前确定。
5. **降级点明确**：缺少 `codeg-mcp` 时只影响 delegation，不应让普通 Agent 会话全部失败。

## 7. 学习实验

### 实验 A：构建模式观察

目标：观察默认 feature 如何改变依赖和 binary。

```bash
cd /tmp/codeg-v0231.Wj1u0S/codeg/src-tauri
cargo tree -e features --no-default-features --bin codeg-server
cargo tree -e features --bin codeg
cargo check --no-default-features --bin codeg-mcp
```

记录：Tauri、keyring、Server 和 MCP 的依赖差异。不要把依赖数量直接当成性能结论。

### 实验 B：配置生效时机

目标：区分「即时保存」「下一次启动」「进程启动前」三种设置。

1. 阅读 `preferences.rs`、`lib.rs` 的 setup 和对应 settings handler。
2. 在临时 `CODEG_DATA_DIR` 下启动 headless server。
3. 修改一个普通设置，观察当前进程、下一次 Agent launch 和重启后的差异。
4. 检查失败时是否返回结构化错误，而不是只打印日志。

### 实验 C：无 GUI 集成测试

目标：理解为什么测试不需要启动 Tauri。

```bash
cd /tmp/codeg-v0231.Wj1u0S/codeg/src-tauri
cargo test --no-default-features --features test-utils --lib
cargo test --no-default-features --features test-utils --test api_integration
```

## 8. 本篇验收

- 能画出 UI → transport → Rust Core → ACP child → event bus → UI 的链路。
- 能解释 `tauri-runtime` 和 `test-utils` 的不同职责。
- 能指出 `preferences.json`、SQLite、环境变量、Keyring 和 token file 各自的边界。
- 能说明一个设置的存储位置、生效时机、失败行为和秘密风险。
- 能明确说出：Codeg 的架构事实不自动等于 SpecOS 的规范。
