# Codeg 深度剖析与 Agent 工程学习

> 研究类型：外部项目源码学习与实验记录
>
> 固定基线：Codeg `v0.23.1`，commit `f1a727d3561a0c6b26359e6ab02cfbe80f618782`
>
> 研究对象：Codeg；本仓库只在选型和迁移启发处做有限对照

## 这组文档回答什么问题

Codeg 的学习价值不只在于它支持了多少 Agent，而在于它把一个本地 Agent
工作台拆成了几组可以独立验证的边界：

```text
配置 / Registry
    -> Preflight / Distribution / Cache
    -> ACP Connection / Session
    -> Event / Snapshot / Transcript
    -> Workspace / Message Renderer
    -> Permission / Question / Delegation
```

这组专题面向从后端开发转向 Agent 工程的学习者。每篇都同时提供：

- Codeg 源码和官方文档定位；
- 概念与设计判断；
- 事实、推断、建议的区分；
- 异常场景；
- 可以单独运行的实验或验证方法。

## 阅读顺序

1. [01 架构与配置](./01-architecture-and-settings.md)：先建立运行时地图和配置所有权。
2. [02 Rust 核心与设计模式](./02-rust-patterns-and-core.md)：理解共享 Core 怎样隔离 Desktop、Server 和 MCP。
3. [03 Rust / Next 选型](./03-rust-next-selection.md)：用 Codeg 的工作负载解释选型，而不是做语言排名。
4. [04 ACP 与 Agent 适配](./04-acp-agent-adapters.md)：理解 Agent 接入、会话、事件、权限和 delegation。
5. [05 Next / React 消息渲染](./05-next-react-ui-rendering.md)：学习流式消息、Hook、状态隔离和虚拟化。
6. [06 测试、运维与学习项目](./06-testing-operations-and-learning-project.md)：把阅读转成可验证的工程能力。
7. [07 Rust 与测试架构](./07-rust-vs-test-architecture.md)：区分语言能力、架构 seam 和测试设计。
8. [08 领域模型与生命周期](./08-domain-model-and-lifecycle.md)：建立 Folder、Conversation、Turn、Task、Session、Worktree 的统一语言。
9. [09 进程监督与平台抽象](./09-process-supervision-and-platform.md)：理解 CLI 子进程、ACP、PTY、取消、PATH 和跨平台边界。
10. [10 数据持久化与恢复](./10-data-persistence-and-recovery.md)：学习 SQLite、事件/快照、Transcript、备份与恢复的责任划分。
11. [11 多 Agent 委派与任务引擎](./11-multi-agent-delegation-and-task-engine.md)：拆解 parent/child session、broker、并发预算和取消竞态。
12. [12 扩展、Skills、MCP 与 Channels](./12-extensibility-skills-mcp-channels.md)：掌握 Agent、Skill、MCP、聊天渠道、自动化和领域包的扩展边界。
13. [13 安全、可观测性与部署](./13-security-observability-and-deployment.md)：把 secret、权限、日志、追踪、Docker、CI 和升级策略放进同一张图。
14. [14 工作区交互与远程体验](./14-product-interaction-workspace-and-remote.md)：学习多目录工作区、聚合视图、Composer、权限交互和远程使用边界。
15. [15 垂直功能切片模板](./15-vertical-feature-slices.md)：用 Custom Agent、MCP、Channel、Automation/Skill 四条链练习端到端设计。

这 15 篇可以按三条主线交叉阅读：

```text
运行时主线：08 领域模型 -> 09 进程 -> 04 ACP -> 11 多 Agent -> 10 恢复
扩展主线：01 配置 -> 12 Skills/MCP/Channels -> 15 垂直切片
产品主线：05 消息渲染 -> 14 工作区交互 -> 13 安全/部署 -> 06 测试门禁
```

其中 15 不是新增抽象，而是把前面各篇的边界组合成可验收的 feature slice；每个切片都要求同时回答：配置从哪里来、运行时谁负责、消息如何呈现、失败如何恢复、测试 seam 在哪里。

可运行实验：

- [Rust Session State 实验](./labs/rust-session-state/README.md)
- [ACP JSONL Fixture 实验](./labs/acp-jsonl-fixture/README.md)

专题中的实验入口：

- 领域模型：为生命周期状态机补状态转移表、非法转移测试和 `run_seq` fencing 测试。
- 进程监督：用 fake CLI 验证 stdout/stderr 分流、超时、取消、子进程树回收和 PATH 诊断。
- 持久化恢复：模拟半写入 Transcript、数据库迁移失败、备份校验失败和 stage-then-swap 恢复。
- 多 Agent：构造 parent/child 并发、重复 cancel、超深 delegation 和 child 崩溃场景。
- 扩展生态：分别为 Custom Agent、MCP Tool、Chat Channel、Automation/Skill 写最小注册—执行—错误展示链。
- 产品与运维：验证权限/问题卡片、断线重连、敏感字段脱敏、日志关联 ID 和升级回滚。

## 来源和证据规则

主要来源按以下优先级使用：

1. Codeg `v0.23.1` 固定源码和测试；
2. Codeg 官方架构、开发、配置和使用文档；
3. ACP 官方架构与协议文档；
4. Rust、Tokio、Next、React、Tauri 的官方文档；
5. 本仓库已有研究文档，仅作为索引和对照，不替代上面的原始来源。

所有 Codeg 源码链接都固定到 `v0.23.1`，例如：

- [`src-tauri/Cargo.toml`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/Cargo.toml)
- [`src-tauri/src/acp/registry.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/registry.rs)
- [`src-tauri/src/acp/connection.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/connection.rs)
- [`src/components/message/message-list-view.tsx`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/components/message/message-list-view.tsx)

文档中的标签含义：

- **事实**：可以在固定源码、测试或官方文档中直接定位。
- **推断**：由多个事实归纳出的实现意图，必须注明证据。
- **建议**：面向学习或 SpecOS 对照的后续做法，不代表 Codeg 的规范。

## 有限对照范围

本次不逆向整个 SpecOS，只使用以下三个位置做选型对照：

- `cli-gui/doc/mvp02/spec/architecture-spec.md`
- `design/cli-gui-platform-design.md`
- `spec-web-ui/package.json` 与 `cli-gui/package.json`

对照结论只回答「为什么 Codeg 的 Rust Core + Next 静态前端适合它的工作负载」以及
「当前 CLI GUI 的 Node/TypeScript + Vite + Tauri 取舍」，不会把 Codeg 的实现直接提升为
SpecOS 的规范。

## 安全和复现边界

- 实验使用 fake Agent、临时目录和无密钥环境；不读取或记录真实账户、token、Keyring 内容。
- 性能数据必须记录操作系统、Node、Rust、浏览器、构建模式和 workload；不写成脱离环境的绝对结论。
- 研究资料是非规范性输入，不能替代本仓库的 Feature Spec、平台设计或测试门禁。
