# 09｜进程监督与平台适配：Agent Runtime 的操作系统边界

## 本篇目标

Agent 工程与普通 HTTP 后端的差异之一，是产品需要长期拥有外部进程：Agent CLI、
MCP companion、PTY shell、Git、OfficeCLI 或其他工具。进程启动成功只是第一步；还
需要处理 PATH、环境、stdout/stderr、子进程树、信号、退出、重启和升级。

Codeg 的相关实现值得按「进程所有权」来学习，而不是只看某个 `Command::new`。

## 1. 一条进程链有多个 owner

```text
Codeg process
  ├── Agent ACP child
  │     ├── adapter / vendor CLI
  │     └── MCP companion
  ├── terminal PTY
  │     └── shell -> command -> grandchildren
  ├── server worker
  │     └── supervisor / container PID 1
  └── update helper / sidecar binary
```

每个 child 都要记录：

- logical owner：session、task 或 terminal id；
- OS handle：pid、PTY master、socket；
- input/output channel；
- start time、last activity、exit status；
- cleanup function 和升级策略；
- 是否允许被复用、取消或重启。

Codeg 的 ACP connection、terminal manager、server supervisor 形成了三种不同监督
场景：协议子进程、交互式终端、服务 worker。

源码入口：

- [`process.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/process.rs)
- [`terminal/manager.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/terminal/manager.rs)
- [`acp/terminal_runtime.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/terminal_runtime.rs)
- [`supervise.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/supervise.rs)

## 2. 启动命令不是一个字符串

一个安全的 spawn contract 应拆为：

```text
program: resolved executable
args: structured argument list
env: explicit overrides / allowlist
cwd: validated working directory
stdin/stdout/stderr: separate ownership
timeout: startup and handshake budget
identity: session/task/terminal id
```

Codeg 的 `process.rs` 对普通命令和 Tokio 命令使用统一环境设置；在 Windows 上对裸
命令名补充 `.exe`、`.cmd`、`.bat` 解析，以适配 npm 生态中的 shim。这个细节说明
跨平台适配往往发生在“启动前”，而不是出错后在 UI 里补一句提示。

## 3. PATH 是运行时配置

桌面应用从 Dock、菜单或系统服务启动时，通常不继承交互式 shell 的全部 PATH。Agent
在终端可运行、在 Codeg 里 preflight 失败，可能不是 Agent 没安装，而是两个进程看到
的环境不同。

Codeg 的环境诊断和 PATH 处理要回答：

- 当前进程实际看到哪个 Node/npm/uv？
- nvm/fnm/Homebrew 等 version manager 的 bin 是否可见？
- `CODEG_MCP_BIN`、同目录 sidecar、PATH 的优先级是什么？
- 修复 PATH 后是重启当前进程，还是只影响下一次 child spawn？

官方 Agents 指南也把 preflight 与认证分开：preflight 检查 runtime、version、install，
不负责判断用户是否登录。[Working with Agents](https://docs.codeg.app/guide/agents)

## 4. stdout、stderr 和协议帧必须分离

```text
stdout -> JSON-RPC / ACP / MCP protocol only
stderr -> diagnostic logs / vendor warnings
exit   -> lifecycle terminal signal
```

如果 Agent 或 MCP companion 把日志写进 stdout，JSONL reader 可能把一条 warning 当成
协议帧；如果只读取 stdout、不保留 stderr，用户看到的可能是“空回复”，而不是 Agent
版本或配置错误。

Codeg 在 connection、companion 和 stderr tail 之间保留了不同职责。学习时要测试：

- partial line；
- 多个 JSON message 合并在一个 OS chunk；
- stderr 与 stdout 交错；
- stdout 关闭但 stderr 仍有内容；
- child 退出前没有 terminal event；
- 超长 stderr 是否被 ring buffer 截断。

## 5. 取消不是关闭 stdin

取消通常包含多层动作：

```text
用户 cancel
  -> application state = cancelling
  -> ACP cancel / MCP cancellation
  -> stop accepting new work
  -> graceful signal
  -> wait budget
  -> kill process tree if needed
  -> exactly one terminal state
```

只关闭 stdin 可能让 shell、Node runtime 或 Agent CLI 继续运行；只 kill 父进程又可能
留下 grandchildren。Codeg 的 `kill_tree`、cancel race 和 manager cleanup 值得作为一组
阅读，不要只看一个函数。

需要明确：

- child 已退出后再 cancel 是 no-op 还是错误；
- cancel 与 successful result 同时到达谁赢；
- parent session 取消是否向 delegation child 传播；
- shutdown 是否等待所有 task；
- cleanup 失败如何进入诊断而不覆盖原始终态。

## 6. PID 复用与代际安全

一个容易忽略的竞态：

```text
1. Codeg 记录 pid = 100
2. Agent 退出，操作系统回收 pid 100
3. 新进程得到 pid 100
4. 旧 cleanup 仍尝试 kill(100)
```

因此 cleanup 不能只保存裸 pid，还要绑定 connection identity、spawn generation 或
process handle。Codeg 的学习重点是：Agent reap 后先清除可用于 kill 的 owner 状态，
再执行后续 backstop，降低误杀 PID 复用进程的风险。

## 7. PTY 与 ACP 是不同 runtime

| 维度 | ACP connection | PTY terminal |
| --- | --- | --- |
| 目标 | 结构化 Agent session | 交互式 shell/命令行 |
| 输入 | JSON-RPC prompt/cancel/reply | 字节/文本 stdin |
| 输出 | typed event / notification | ANSI、stdout、stderr、终端 resize |
| 终态 | turn/session state | process exit / terminal closed |
| 测试重点 | framing、能力、事件序列、权限 | shell、PTY、信号、编码、进程树 |

不要用 PTY parser 伪装成 ACP；如果一个 Agent 没有结构化协议，只能声明它支持
terminal/PTY 能力，并在 UI 上区别协议能力和终端能力。

## 8. Supervisor 与 worker 的升级语义

Codeg 的 `--supervise` 设计把 server worker 与 supervisor 分开：

```text
supervisor / PID 1
  -> spawn worker
  -> forward SIGTERM/SIGINT
  -> reap orphan children
  -> observe restart exit code
  -> relaunch new binary
  -> trial window
  -> rollback previous bundle on fast failure
```

这里值得学习的不是某个升级命令，而是“升级是有 probation 的状态机”：新版本启动
成功不等于健康，trial window 内快速崩溃可以触发回滚；普通运行时错误不应无限热循环。

## 9. Web shutdown 的 sticky signal

异步服务常见 race：shutdown 通知在 worker 订阅之前发生，后到的 worker 永远等不到。
Codeg 的 web shutdown 使用 sticky flag + notify 的组合，使：

```text
shutdown 已发生 -> 新订阅者立即观察到
shutdown 未发生 -> 当前 worker 仍可 await 通知
```

这是一种可迁移的运行时模式，适用于：WebSocket hub、MCP companion、后台 scheduler、
event bridge 和 app update worker。

## 10. 跨平台学习矩阵

| 场景 | macOS/Linux | Windows | 需要验证 |
| --- | --- | --- | --- |
| shell | `SHELL`、zsh/bash/sh | `SHELL`、`COMSPEC`、cmd | 实际 shell、编码、启动参数 |
| Agent binary | executable bit、PATH | `.exe/.cmd/.bat`、PATH | preflight 与真实 spawn 一致 |
| process stop | signals、process group | terminate/tree semantics | 子孙进程是否回收 |
| symlink | 通常可创建 | Developer Mode/junction | linked folder 与安全根 |
| sidecar | sibling binary、PATH | sibling binary、PATH | 版本、架构、权限 |
| server | signal/PID 1 | service/console | graceful shutdown、reap |

## 11. 实验与验收

### 实验 A：PATH gap

用一个只在 shell profile 中可见的 fake binary，分别从终端和 GUI-like clean environment
启动，记录 preflight 的 resolved path、版本和错误。不要修改真实用户 PATH。

### 实验 B：进程树取消

启动 fake Agent → child shell → grandchild sleep，分别测试 graceful cancel、超时、
kill tree 和 parent exit；验收所有进程最终退出，且重复 cancel 不报假错误。

### 实验 C：stdout/stderr framing

复用 [ACP JSONL Fixture](./labs/acp-jsonl-fixture/README.md)，加入 stderr warning、
partial line、超长 line 和 child early exit。

### 实验 D：升级 trial

用两个无害 worker binary 模拟正常升级、新版本立即退出、旧版本恢复和 supervisor
收到 SIGTERM，画出每个 exit code 对应的动作。

验收标准：

- 能区分 ACP、PTY、MCP companion 和 supervisor 的 owner；
- 能解释 PATH、stdout/stderr、PID、process tree 和 shutdown race；
- 能为每个 child 写出 spawn、cancel、exit、cleanup contract；
- 能指出哪些平台差异需要真实 CI 验证，而不能靠本地 macOS 推断。
