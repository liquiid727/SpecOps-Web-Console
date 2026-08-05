# 06｜测试、运维与学习项目：把阅读变成 Agent 工程能力

## 本篇目标

前五篇解决了「怎么看」：架构、Rust Core、选型、ACP 适配和 React 消息渲染。最后
需要解决「怎么证明」：一个 Agent 工作台是否能在进程退出、断线、权限竞争、消息很大
和多 session 并发时保持正确。

这篇给出一条小步、可复现的学习项目路线。它不是 Codeg 的生产规范，也不覆盖本仓库
全部开发流程；它把 Codeg 的关键边界翻译成可以独立验证的实验和检查表。

## 1. 从 source of truth 到实验结果

本仓库的研究材料应当遵循这条证据链：

```text
Codeg fixed source / official docs
        ▼
事实记录（file + symbol + version）
        ▼
推断（由哪些事实支持）
        ▼
实验假设（workload + metric + expected boundary）
        ▼
结果（environment + command + output）
        ▼
学习结论 / 是否可迁移到 SpecOS
```

Codeg 固定基线：`v0.23.1`，commit
`f1a727d3561a0c6b26359e6ab02cfbe80f618782`。每条源码结论都应带固定链接，避免随着
上游主分支变化而失去上下文。研究中的「可迁移」必须单独标注，因为一个项目选择
Rust、Next 或某种 ACP 组织方式，不等于当前产品有同样的约束。

## 2. 测试分层：每一层证明不同的事情

### 2.1 纯状态与类型测试

目标是证明输入事件如何改变产品状态，不启动 Tauri、浏览器或真实 Agent。适合覆盖：

- event apply 的顺序、重复和未知事件；
- permission/question/cancel 的终态；
- snapshot 的序列号和恢复；
- registry validation 的坏输入；
- delegation task 的状态转移。

Codeg 的 `test-utils` feature 暴露了测试构造路径，`session_state.rs` 和 registry 模块
也有大量边界测试。阅读这些测试时，先写出 invariant，再看 fixture 如何触发它。

### 2.2 Runtime / process 集成测试

目标是证明 Core 能正确管理外部资源：

- child process 启动、stdout/stderr 边界和退出；
- ACP initialize/session/prompt/cancel；
- MCP companion 的 local IPC；
- DB migration、临时目录和 keyring 替身；
- reconnect 时 snapshot + replay。

这层应使用 fake Agent、临时目录和 test emitter，避免把网络模型服务或真实凭据引入
测试。真实 vendor Agent 的 smoke test 可以单独放在 opt-in job，不应成为每次本地单测
的隐含依赖。

### 2.3 Frontend store / projection 测试

目标是证明 event 到 timeline 的投影稳定：

- live slice 更新不会唤醒无关消费者；
- timeline prefix cache 命中和失效条件正确；
- duplicate/gap/snapshot replace 不生成重复消息；
- session 切换不会串用上一个 session 的 live 内容；
- permission/question/cancel 卡片与终态一致。

Codeg v0.23.1 的 Vitest 测试已经把 live-message slice decoupling 和 timeline prefix
cache 作为独立主题。它们是学习「如何测试性能意图」的好入口：测试的不只是返回值，
还包括不应该发生的重新计算或状态污染。

### 2.4 Component / browser 行为测试

目标是证明用户实际看到并能操作：

- 流式追加和滚动策略；
- tool card 展开/折叠；
- permission/question 的键盘和鼠标路径；
- empty/loading/failure/reconnect 状态；
- 大消息和虚拟化窗口。

Codeg v0.23.1 的现有测试重点在 Rust 与 Vitest；不要据此推断「没有 E2E 就足够」。
浏览器级行为属于当前学习路线建议补上的验证层，尤其是 scroll anchor、WebSocket
reconnect 和 WebView 资源路径。

### 2.5 性能和容量测试

性能测试要证明一个具体预算，而不是证明某种语言优越。至少拆成：

| 层 | 固定 workload | 指标 |
| --- | --- | --- |
| Core | 1/10/50/100 fake sessions | cold start、RSS、spawn、cancel、event p95 |
| Event stream | 固定 event size/rate、断线和 gap | queue、buffer、replay、snapshot latency |
| Store | 固定 turns 和 delta rate | projection 时间、selector 命中、render count |
| Browser | 短/长 Markdown、tool card、滚动位置 | commit、layout、long task、DOM、内存 |
| Build | clean/incremental、Desktop/headless | build time、产物大小、资源加载 |

每次结果都写清 OS、CPU/RAM、Node、Rust、浏览器、debug/release、事件大小和 delta
频率。没有 workload 的「快」不具备迁移价值。

## 3. 推荐的命令与验证顺序

以下命令针对 Codeg 临时固定 checkout；实验命令针对本仓库新增目录。先观察脚本和
feature，再执行测试，避免把默认 Desktop 依赖误认为 headless Core 的必需依赖。

### 3.1 Codeg 源码观察

```bash
cd /tmp/codeg-v0231.Wj1u0S/codeg
git rev-parse HEAD
pnpm install
pnpm test

cd src-tauri
cargo check
cargo check --no-default-features --bin codeg-server
cargo check --no-default-features --bin codeg-mcp
cargo test --no-default-features
```

具体脚本名称以该固定 checkout 的 `package.json` 和官方开发文档为准；如果本机没有
Node、pnpm、Rust 或平台构建依赖，应记录为环境前置条件，不要为了通过研究而修改
生产依赖。[Codeg development](https://docs.codeg.app/reference/development)

### 3.2 本学习材料的实验

```bash
cargo test --manifest-path \
  cli-gui/doc/research/codeg-learning/labs/rust-session-state/Cargo.toml

node cli-gui/doc/research/codeg-learning/labs/acp-jsonl-fixture/client.mjs
```

这两个实验不依赖 Codeg、Tauri、React 或真实 Agent，适合先建立「状态机 + 进程协议」
的直觉，再回到大项目源码。

## 4. 最小学习项目：从 fake Agent 到可解释 UI

### Milestone 0：建立证据习惯

交付：

- 能在固定 tag 中定位 registry、manager、session state、event stream、message list；
- 每条结论分成事实、推断、建议；
- 记录环境和命令，不把未测量的性能写成定论。

### Milestone 1：写一个 session state machine

交付：

- `Idle / Running / Waiting / Completed / Failed / Cancelled` 类型；
- start、delta、tool、permission、cancel、finish 事件；
- 重复 cancel 幂等；
- 非法状态转移返回可断言错误；
- 单元测试覆盖正常和竞争路径。

对应实验：[Rust Session State](./labs/rust-session-state/README.md)。

### Milestone 2：写一个 fake ACP-like process

交付：

- stdin/stdout JSONL 帧；
- request id 与 response 关联；
- notification 不阻塞 request response；
- partial output、unknown update、child exit 可诊断；
- cancel 后不重复发送 terminal result。

对应实验：[ACP JSONL Fixture](./labs/acp-jsonl-fixture/README.md)。

### Milestone 3：把 event 投影成 timeline

交付：

- `ContentPart` discriminated union；
- text delta 合并；
- tool call/result 配对；
- permission/question 作为独立待处理状态；
- snapshot/replay 后得到与连续消费一致的 timeline。

这里先不做真实网络，不追求完整 UI。重点是证明 projection 是可重放、可测试的纯
函数或窄接口。

### Milestone 4：做一个消息 pane

交付：

- empty/loading/streaming/waiting/success/failure/reconnecting；
- live message 单独 selector；
- 历史列表虚拟化；
- 底部跟随与用户上滚暂停；
- tool、permission、question 的最小渲染器；
- render count 和长消息性能基线。

实现时可对照 Codeg 的 `MessageListView`、`MessageTurnAdapter`、`ContentPartsRenderer`
和 `VirtualizedMessageThread`，但不要复制其具体业务类型。

### Milestone 5：接一个真实分发入口

交付：

- Agent identity 与 distribution 配置分离；
- preflight 能报告 Node/uv/binary 的缺失；
- command 参数和环境变量有显式 allowlist；
- 版本、平台和缓存行为可观察；
- adapter 错误与 Agent 协议错误分层展示。

这一步才接真实 Agent，并且先使用 opt-in 本地配置。不要在学习阶段把账号 token、
全局 shell 配置或生产 workspace 自动写入代码库。

### Milestone 6：补恢复、权限和 delegation

交付：

- snapshot + replay + gap fallback；
- permission/question/cancel 的唯一终态；
- task id、状态查询、取消和超时；
- MCP companion 的 stdout 纯协议约束；
- child process、socket、subscription 的 shutdown 顺序。

达到这里，才算从「聊天 UI」进入「Agent Runtime」学习阶段。

## 5. 运维和安全检查表

### 5.1 进程和任务

- 每个 child process 有 owner、启动时间、session/task id 和退出原因；
- spawn、handshake、prompt、cancel、cleanup 都有 timeout 或终止条件；
- shutdown 先停止接收新工作，再取消任务、关闭协议、回收进程和 socket；
- 不使用全局可变状态隐藏连接，避免 session 串线；
- 对重复 cancel、重复 reply、重复 terminal event 做幂等处理。

### 5.2 配置、路径和秘密

- 用户配置、数据库、缓存、token 和日志有不同的 ownership；
- 路径输入经过绝对路径/根目录校验，拒绝 traversal；
- command、args、env 使用结构化参数，不把未经校验的字符串拼成 shell；
- secret 不进入事件 payload、React store、错误文案或 debug log；
- MCP companion 使用短生命周期凭据，日志不打印 token；
- `CODEG_HOME` / `CODEG_DATA_DIR` 这类目录差异要在启动日志中可诊断，但不输出
  私密内容。

Codeg 的 keyring 与 server token store 是两个不同边界，学习时不要把文件 token 当作
桌面 OS keyring 的等价物。对应源码可看：[`keyring_store.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/keyring_store.rs)。

### 5.3 可观测性

一条 Agent 事件至少应能通过这些字段关联：

```text
workspace_id / session_id / connection_id / request_id / task_id / event_seq
```

日志分层建议：

- info：生命周期和终态；
- debug：能力协商、队列、缓存命中；
- warn：重连、gap、未知事件、慢操作；
- error：无法恢复的协议、资源或权限失败。

事件日志和用户消息不是同一份数据。前者服务诊断，后者服务产品体验，二者的保留、
脱敏和体积策略也应不同。

## 6. Review 时的五个问题

看到一个 Agent feature 或配置改动，可以固定问：

1. **Owner**：谁创建、谁持有、谁关闭？
2. **Contract**：输入、输出、错误、超时和终态是什么？
3. **Recovery**：断线、重复、乱序、进程退出后如何恢复？
4. **Projection**：wire/runtime state 怎样变成用户可见消息？
5. **Evidence**：哪条测试或指标证明它正确、可用、足够快？

这五问比单纯检查代码风格更接近 Agent 工程的风险来源。

## 7. 学习成果模板

每完成一个模块，用一页记录：

```markdown
# 模块：

## 我观察到的事实
- file / symbol / fixed version:

## 我推断的设计意图
- evidence:

## 我还不知道的地方
- unknown / needs experiment:

## 我做的实验
- environment:
- command:
- workload:
- result:

## 可迁移到当前项目的原则
- principle:
- boundary:
- not directly portable because:
```

建议按下面顺序输出最终学习报告：

1. 一页运行时架构图；
2. 一页 configuration ownership matrix；
3. 一页 Agent distribution/ACP lifecycle；
4. 一页 event/snapshot/replay contract；
5. 一页 React rendering and performance budget；
6. 一页异常场景与测试矩阵；
7. 一页对当前 CLI GUI 的有限迁移建议。

## 8. 本篇验收

- 能为一个 Agent feature 选择合适的测试层，而不是只写端到端 happy path。
- 能运行两个最小实验，并解释它们与 Codeg 真实实现的差异。
- 能写出 session、event、permission、question、cancel、delegation 的错误和终态契约。
- 能提出带 workload、环境、指标和失败边界的性能结论。
- 能在 review 中检查 owner、cleanup、recovery、projection 和 evidence。
- 能把学习结果转成当前项目的设计输入，同时明确哪些地方不能直接照搬。
