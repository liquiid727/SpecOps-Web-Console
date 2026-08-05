# 11｜Multi-Agent Delegation：父子会话、Task、Broker 与取消传播

## 本篇目标

多 Agent 不是“同时打开几个聊天窗口”。当一个 Agent 调用另一个 Agent 时，系统需要
处理父子关系、权限、任务状态、结果回传、取消、超时、断线、资源上限和 UI 展示。

Codeg 的 delegation 设计把长任务拆成 task id 和状态查询，再通过 companion/broker
传递结果；这和传统同步 RPC 的思路不同。[Multi-Agent Collaboration](https://docs.codeg.app/guide/multi-agent)

## 1. Delegation 的四个对象

```text
Parent Agent / Conversation
  └── MCP tool call: delegate_to_agent
        ├── task_id
        ├── child agent identity / distribution
        ├── child conversation
        ├── child connection
        └── task status / result / error
```

| 对象 | owner | 主要职责 |
| --- | --- | --- |
| Companion | 每次 Agent launch 的 MCP 子进程 | 接受 tool call、调用 parent IPC、返回短响应 |
| Broker | Codeg Core | 创建 child、记录 task、传播事件、处理取消/状态 |
| Child connection | ACP manager | 启动和管理子 Agent 协议会话 |
| Conversation/task projection | DB + UI | 展示父子树、进度、结果和终态 |

不要让 companion 自己持有完整业务状态，也不要让父 Agent 等待一个永远不返回的同步
RPC。Companion 适合做受控 protocol bridge，Broker 才是 lifecycle owner。

源码入口：

- [`delegation/companion.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/companion.rs)
- [`delegation/broker.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/broker.rs)
- [`delegation/spawner.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/spawner.rs)
- [`commands/delegation.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/delegation.rs)

## 2. 一个 delegation 调用的时序

```text
Parent Agent
  -> codeg-mcp: tools/call(delegate_to_agent)
  -> Companion: validate input + parent token
  -> Local IPC: create delegation task
  -> Broker: choose Agent / workspace / depth / capability
  -> ConnectionManager: preflight + spawn child
  -> Broker: return task_id quickly
  -> Parent Agent: continue or poll status

Child events
  -> SessionState / Broker
  -> task progress / child transcript / parent tool metadata
  -> UI event stream

Child terminal state
  -> Broker cache/DB
  -> parent status query or event
  -> exactly one completed/failed/cancelled result
```

从这个时序可以看出，`delegate_to_agent` 的 response 和 child 的最终结果是两个不同
的时刻。第一个回答“任务是否创建”，第二个回答“任务做成了什么”。

## 3. Delegation 的状态机

建议至少分开两套状态：

```text
Request lifecycle
  Requested -> Accepted -> Rejected / Cancelled / Failed

Task lifecycle
  Created -> Spawning -> Running -> Waiting ->
  Completed / Failed / Cancelled / TimedOut
```

父 turn、child turn、delegation task 不应共享一个 `isLoading`。例如：

- parent Agent 已经继续生成下一段文本，child 仍在运行；
- child 正等待 permission，parent conversation 已经静止；
- parent turn 被 cancel，但 child task 被策略允许继续；
- child 完成后 parent 已断线，结果需要在 reconnect 时可查询。

每个状态至少要记录：`task_id`、parent/child connection、created_at、terminal_at、
error code、cancel source、last event sequence 和 result reference。

## 4. Companion 的安全边界

`codeg-mcp` 通过 stdio 接收 MCP JSON-RPC，再通过 local IPC 找到 parent Core。安全要点：

```text
Agent stdout -> companion protocol
Companion -> parent socket + short-lived token
Parent -> broker-owned task state
```

需要检查：

- parent token 是否每次 launch 生成；
- socket path 是否位于受控临时目录；
- companion 是否能访问任意 workspace；
- tool 参数是否经过 schema 校验；
- stdout 是否绝对不输出调试日志；
- parent 关闭后，companion 是否停止接受新请求；
- companion 缺失时是否只关闭 delegation，不影响普通 session。

Codeg 官方架构说明 companion 是按 Agent session 启动的 stdio MCP server，缺失时
delegation soft-fail；这提供了一个“可选能力不拖垮主会话”的边界。[Architecture](https://docs.codeg.app/reference/architecture)

## 5. Broker 的并发难点

### 5.1 同一请求的重复提交

网络重试、MCP client retry 或用户重复点击可能让同一 logical request 到达两次。需要
使用 request id/idempotency key 或 task creation fence：

```text
first request  -> task T created
retry request  -> return T, no second child
```

### 5.2 取消竞争

取消可能来自：

- parent Agent 的 MCP notification；
- 用户取消 parent turn；
- child connection 退出；
- task timeout；
- parent conversation teardown；
- server shutdown。

所有来源都应进入同一个 broker transition，而不是各自直接 kill child。

### 5.3 子任务深度与资源

多 Agent 递归 delegation 需要限制：

- 最大 depth；
- 同一 parent 的并行 child 数；
- 全局 Agent process 数；
- 每个 task 的 duration、output、token 或磁盘预算；
- 子任务能否再次 delegation；
- 失败重试次数和 backoff。

否则一个小 prompt 可能展开成失控的 process tree。

## 6. 结果回传与 transcript 投影

推荐让 child 的结果分三层回传：

```text
progress event
  -> UI 可见的短状态

child transcript / artifact
  -> 可展开、可追踪的详细结果

terminal summary
  -> parent tool result / task card / search index
```

不要把完整 child transcript 每次都复制到 parent message；这会造成数据膨胀、重复解析
和 UI 嵌套过深。更合理的是 parent tool part 保存 child conversation/task reference，
需要时再读取子线程。

## 7. Chat Channel、Automation 与 Delegation 的关系

这三类功能都可能触发 Agent，但 owner 不同：

| 入口 | 触发者 | 持久化对象 | 长任务状态 |
| --- | --- | --- | --- |
| UI prompt | 人 | conversation/turn | connection/session |
| delegation | parent Agent | child conversation/task | broker/child connection |
| chat channel | Telegram/Lark/iLink 用户或 bot | channel command/conversation | channel session + task |
| automation | cron/manual trigger | automation run/task | scheduler/worktree/connection |

统一的关键是：入口只负责把请求转换成一个受控 command；真正的 session、task、event、
permission 和 cleanup 仍由 Core owner 管理。

## 8. 异常矩阵

| 场景 | 目标行为 |
| --- | --- |
| companion 不存在 | delegation 不可用，普通 Agent session 继续 |
| parent token 错误 | fail closed，不创建 child |
| child spawn 失败 | task 进入 Failed，parent 得到可读错误 |
| parent disconnect | 明确 child 继续/取消策略，不靠连接断开猜测 |
| child disconnect | task 终态唯一，保留诊断和最后状态 |
| cancel before spawn | 不应晚到时又启动 child |
| cancel during spawn | spawn 完成后立即 cleanup，不能遗留进程 |
| cancel after complete | 幂等 no-op，不覆盖 Completed |
| duplicate request | 返回既有 task，不生成第二条子会话 |
| child asks permission | permission 绑定 child request，不能错误显示给 parent turn |
| child delegates again | depth/concurrency policy 先检查 |
| server restart | task 状态可查询；运行时 handle 重新建立或明确失败 |
| parent result arrives late | task reference 仍可从历史/状态接口读取 |

## 9. 实验与验收

### 实验 A：父子任务状态

用 fake child fixture 创建 parent → child，记录 task id、child conversation、event
sequence 和 terminal state；分别模拟 child completed、failed、cancelled。

### 实验 B：取消 race

在 child spawn 前、spawn 中、child ready、child completed 四个时间点发送 cancel；验证
只产生一个终态且没有残留进程。

### 实验 C：重复 delegation

发送相同 request id 两次，断开 parent 后重连查询 task，验证只存在一个 child。

### 实验 D：深度和容量

构造 parent → child → grandchild，分别超过 depth、并发、超时预算，检查拒绝原因和
已经创建的子任务是否正确收敛。

本篇验收：

- 能画出 companion、broker、connection、conversation、task 的 ownership；
- 能解释 delegation response 与最终结果为什么分离；
- 能为取消、重复请求、parent disconnect 和 child failure 写出唯一终态；
- 能提出 depth、并发、时长、输出和重试预算；
- 能把 delegation、chat channel、automation 放进同一套 command/task/event 语义。
