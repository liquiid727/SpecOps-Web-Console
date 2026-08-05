# 03｜Rust / Next 选型：按 Codeg 的工作负载比较

## 本篇目标

这篇不回答「Rust 是否永远比 Node 快」或「Next 是否永远比 Vite 好」。它回答：

1. Codeg 面对的工作负载是什么？
2. Rust Core 和 Next 静态前端分别承担什么责任？
3. 这些责任为什么没有全部放在 Node 或全部放在 Rust？
4. 哪些结论可以对照当前 CLI GUI，哪些不能直接迁移？

## 1. 先拆选型对象

Codeg 的选型不是一个二选一：

```text
Rust / Tokio / Axum / Tauri
  -> 本地进程、文件、数据库、凭据、ACP、HTTP/WS、桌面生命周期

Next / React / TypeScript
  -> 工作区页面、设置、消息、编辑器、交互状态、静态资源

Agent runtimes
  -> Node / uv / bundled binary，由 Distribution 决定
```

**事实**：Codeg 的 `next.config.ts` 设置 `output: "export"`，前端产物作为静态资源
被桌面 WebView 或 Server 提供；Agent 本身仍可能依赖 Node、uv 或平台二进制。

源码：

- [`src-tauri/Cargo.toml`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/Cargo.toml)
- [`next.config.ts`](https://github.com/xintaofei/codeg/blob/v0.23.1/next.config.ts#L1-L38)
- [`package.json`](https://github.com/xintaofei/codeg/blob/v0.23.1/package.json#L1-L100)

官方架构文档也把「Rust Core」和「Next/React web frontend」分别描述为共享的两块，
而不是让 Next 承担本地 Agent 编排。[Architecture](https://docs.codeg.app/reference/architecture)

## 2. Rust Core 的选择理由

### 2.1 适合 Codeg 的部分

| 工作负载 | Rust 的适配点 | 需要付出的代价 |
| --- | --- | --- |
| 长期持有多个 Agent child process | Tokio process、显式任务和资源释放 | async 类型和生命周期学习成本较高 |
| 文件、Git、PTY、Keyring | 原生系统 API 和平台库容易形成单一 Core | 跨平台依赖和编译链复杂 |
| Desktop + Server + MCP | 一个 library，多 feature、多 binary | 编译时间、feature 组合和 CI 复杂度 |
| 并发 session 与事件流 | 类型系统约束共享状态，减少数据竞态 | `Send/Sync`、锁和 channel 需要显式设计 |
| 本地分发 | 可以生成 native binary，桌面安装不必携带 Node Core | Agent distribution 仍可能需要 Node/uv |
| 安全边界 | ownership、类型化错误、显式资源所有权 | 不会自动解决命令注入、权限和秘密泄露 |

**事实**：Codeg 用 Cargo feature 把 Tauri runtime 和 headless Server/MCP 分开；
`codeg-server` 和 `codeg-mcp` 可以不启用 Tauri 构建。[Cargo features](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/Cargo.toml#L20-L54)

**推断**：Rust 的主要收益不是单个函数的 benchmark，而是把进程、事件和共享状态
的所有权放进 Core，使三个运行入口共享同一套生命周期语义。

### 2.2 Rust 不自动带来的收益

以下说法不能直接作为结论：

- Rust 一定比 Node 有更低的端到端 Agent 延迟。模型服务、Agent CLI、磁盘和网络通常占主导。
- Rust 一定比 Node 使用更少内存。连接数量、buffer、历史消息和渲染进程才是具体变量。
- 使用 Rust 就自动安全。命令参数、路径、凭据、下载包和权限仍需要显式校验。
- 一个 Rust Core 就自动适合所有团队。编译速度、开发熟练度和第三方 SDK 可能改变选择。

## 3. Node / TypeScript 仍然有位置

Codeg 的 Agent 运行时支持 npm/Node、uv/Python 和 bundled binary。也就是说，即使
Core 采用 Rust，也没有试图把所有 Agent 重写成 Rust。

这体现了一个边界：

```text
Core owns orchestration and safety
Agent owns its native behavior and model integration
Distribution owns how the Agent is launched
```

当前 CLI GUI 也采取了类似的取舍：

- [`cli-gui/doc/mvp02/spec/architecture-spec.md`](/Users/liquiid/code/specos-ai/cli-gui/doc/mvp02/spec/architecture-spec.md)
  明确选择 Tauri supervises TypeScript runtime sidecar。
- [`cli-gui/package.json`](/Users/liquiid/code/specos-ai/cli-gui/package.json)
  采用 React、Vite、Node-PTY 和 TypeScript。
- [`design/cli-gui-platform-design.md`](/Users/liquiid/code/specos-ai/design/cli-gui-platform-design.md)
  将 Engine、Transport、Provider、Orchestrator 分开。

**学习结论**：不要把「Rust Core」理解成「所有逻辑都必须 Rust 化」。更可复用的
设计是把安全和生命周期稳定的部分放在 Core，把变化快、SDK 多、开发迭代频繁的部分
留在合适的运行时。

## 4. Next 与 Vite 的工作负载比较

### 4.1 Codeg 的 Next 实际用途

Codeg 的 Next 选择至少提供：

- App Router 和页面组织；
- React/TypeScript 工程约定；
- 静态构建和资源处理；
- 与桌面 WebView、Server 静态文件服务共用同一份前端产物。

但 `output: "export"` 也意味着：

- 页面不能把动态 SSR/API Route 当作核心依赖；
- 数据主要通过 Tauri IPC、HTTP/WebSocket 和客户端 store 获取；
- 图片优化等 Next server 能力需要关闭或改成静态策略。

### 4.2 与当前仓库的对照

| 维度 | Codeg | 当前 `cli-gui` | 当前 `spec-web-ui` |
| --- | --- | --- | --- |
| UI 框架 | Next + React | Vite + React | Next + React |
| 前端输出 | 静态导出 | SPA bundle | Next 应用/部署配置 |
| 主要运行时 | Rust Core | Node/TypeScript Runtime + Tauri | Next Server/本地 workspace 工具 |
| 流式 Agent UI | Codeg ACP event/store | `ClientRuntime` + WebSocket/Transcript | 当前不是主要职责 |
| 选型重点 | 同一前端服务 Desktop/Server | 快速开发、sidecar 复用、轻量边界 | 资产工作台、路由和部署 |

**结论**：Codeg 的 Next 不能直接证明 CLI GUI 应迁移 Next。它证明的是：当一个
前端需要同时作为 Desktop 静态资源和 Server UI 时，Next 的构建约定可以成为一个
可用选择。当前 CLI GUI 如果保持「本地 SPA + TypeScript sidecar」，Vite 的开发和
部署复杂度可能更低；这需要以当前产品边界和测量结果为准。

## 5. 性能比较方法

性能比较必须固定 workload，否则得到的只是语言印象。建议使用同一台机器、同一份
fake Agent fixture、同一批事件和相同的 release/debug 模式。

### 5.1 Core/Runtime 指标

| 指标 | 测量方法 | 关注点 |
| --- | --- | --- |
| 冷启动时间 | 进程启动到 HTTP/IPC ready | Rust binary、DB migration、日志初始化的成本 |
| 空闲 RSS | ready 后等待固定时间采样 | Core 常驻内存，而不是把 UI 内存混入 |
| spawn 延迟 | `session/new` 到 Agent ready | preflight、child spawn、ACP initialize |
| 事件吞吐 | 固定 N 个 delta/工具事件 | parser、normalizer、event bus 和锁竞争 |
| tail latency | 事件产生到客户端收到的 p50/p95 | queue、buffer、WebSocket/IPC 和调度 |
| 取消延迟 | cancel 到 child 退出/终态 | kill tree、清理和幂等终态 |
| 多 session 扩展 | 1/10/50/100 个 fake session | 资源上限、锁粒度和连接复用 |

### 5.2 Frontend 指标

| 指标 | 测量方法 | 关注点 |
| --- | --- | --- |
| 初始渲染 | 固定 transcript 的 load/commit | bundle、store hydration、首屏组件 |
| 流式追加 | 固定 delta 频率和消息长度 | React commit、Markdown 解析、layout |
| 滚动 | 固定长列表快速滚动 | 虚拟化、overscan、动态测量 |
| 内存增长 | 1k/10k/50k turns | 历史引用、缓存、DOM 和解析结果 |
| 构建 | clean/incremental build | Next/Vite 的开发反馈和发布成本 |
| 资源加载 | 静态产物在 WebView/Server 中加载 | asset prefix、locale、字体和 Monaco |

记录格式：

```text
environment: OS / CPU / RAM / Node / Rust / browser
build: debug or release, cold or warm
workload: session count / event count / message size / delta rate
metrics: p50 / p95 / max / RSS / long tasks / DOM count
result: measured / inferred / unknown
```

不要预先写死「Rust 必须快多少」或「Next 必须省多少内存」。实验的验收条件是：
同一 workload 下测量可重复、瓶颈有证据、结论注明适用边界。

## 6. 选型决策模板

以后为 Agent 产品做技术选型，可以用下面的顺序：

1. 先列出必须长期运行的资源：进程、连接、文件、数据库、事件和秘密。
2. 为每类资源指定 owner、关闭责任和可测试 seam。
3. 把变化快的供应商 SDK 与稳定的产品生命周期隔离。
4. 再比较语言和框架的开发成本、分发成本、性能和生态。
5. 用最小 fixture 做冷启动、吞吐、取消和渲染实验。
6. 把实测结果写成 workload-specific decision，不写成通用宣传语。

## 7. 学习实验

### 实验 A：Core 与 UI 分开测量

1. Rust 侧使用 `codeg-server --no-default-features`，不启动 Tauri。
2. 前端侧单独构建 Next 静态产物。
3. 用 fake Agent 产生固定事件流。
4. 分别记录 Core 端事件延迟和浏览器端 commit/layout。

目的：避免把模型服务延迟、网络延迟、Rust Core 和 React 渲染混成一个数字。

### 实验 B：Next 静态导出与 Vite SPA 对照

对照 Codeg 的 `next.config.ts`、本仓库 `cli-gui/vite.config.ts` 和
`spec-web-ui/next.config.ts`，记录：

- 开发服务器启动；
- clean build；
- incremental rebuild；
- 静态资源路径；
- WebView 中的路由和 locale；
- 运行时数据是否依赖 server-only API。

### 实验 C：用官方文档校准概念

- [Rust Ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)
- [Tokio tutorial](https://tokio.rs/tokio/tutorial)
- [Next static exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [React performance](https://react.dev/learn/render-and-commit)
- [Tauri architecture](https://v2.tauri.app/concept/)

## 8. 本篇验收

- 能解释 Codeg 为什么用 Rust 做 Core，却继续使用 Node/uv/binary 运行 Agent。
- 能说明 Next 在 Codeg 中的静态导出边界，以及它没有承担哪些职责。
- 能把当前 CLI GUI 的 Vite/TypeScript 选择描述成 workload trade-off，而不是落后或先进。
- 能写出一份包含环境、workload、p50/p95、内存和失败边界的性能报告。
- 能指出哪些性能判断目前只能通过实验确认。
