# 08｜领域模型与生命周期：Workspace、Folder、Conversation、Session、Task

## 本篇目标

Agent 产品很容易从「聊天记录」开始建模，随后把 workspace、project、session、turn、
task、branch 全部塞进一个会话表。Codeg v0.23.1 提供了一个相反的观察入口：持久化
领域实体、外部 Agent session、运行时 connection 和任务编排分别存在，彼此通过显式
身份和代际字段关联。

官方 Workspace 指南把文件、会话、Git、终端和任务放在一个工作区表面；源码则由
`folder`、`conversation`、`work_task` 等实体承载这些关系。[Workspace guide](https://docs.codeg.app/guide/workspace)

## 1. 先画实体关系

```text
Folder / workspace root
  ├── path、branch、kind、alias
  ├── Conversation
  │     ├── external_id -> Agent native / ACP session id
  │     ├── turns -> event/transcript projection
  │     └── parent_id -> delegated child conversation
  └── WorkTask
        ├── worktree folder
        ├── base_branch + base_sha
        ├── work_branch
        ├── run_seq / status / verdict
        └── conversation_id / connection_id

Runtime only
  ConnectionManager
    └── connection_id -> child process -> ACP session state
```

**事实**：v0.23.1 没有独立的 `Project` entity；项目语义主要由 `folder` 承担。ACP
session 也不是本地独立数据库表，而是外部 Agent 的 session identity 和 Codeg
conversation 的 `external_id` 映射。`work_task` 则是持久化编排实体。

源码入口：

- [`models/folder.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/models/folder.rs)
- [`models/conversation.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/models/conversation.rs)
- [`models/work_task.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/models/work_task.rs)
- [`db/entities/conversation.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/db/entities/conversation.rs)
- [`db/entities/work_task.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/db/entities/work_task.rs)

## 2. 五种 identity 不要混用

| identity | owner | 生命周期 | 典型用途 |
| --- | --- | --- | --- |
| `folder_id` / path | 数据库 + workspace | 长期 | 文件、Git、默认 Agent、打开的项目 |
| `conversation_id` | Codeg 数据库 | 长期 | 历史、侧边栏、父子会话树 |
| `external_id` / ACP session id | Agent + Codeg 映射 | 由 Agent 决定 | resume、导入、协议关联 |
| `connection_id` | Runtime | 进程存活期间 | event stream、cancel、permission、WebSocket attach |
| `task_id` + `run_seq` | WorkTask engine | 一次任务及其重试代际 | worktree、分支、结果、迟到事件 fencing |

常见错误是把 `conversation_id` 当作“当前进程 id”，或者把 `external_id` 当作永远
可恢复的本地主键。Codeg 的数据模型把这些身份分开，意味着重启、导入、重试和
delegation 可以分别处理。

## 3. Folder 是工作边界，不只是目录字符串

`folder` 除了 `path`，还包含：

- `git_branch`：当前工作目录的分支上下文；
- `parent_id`：worktree 或嵌套 folder 的关系；
- `kind`：普通 folder、chat folder 等不同展示/路由语义；
- `alias`、颜色、排序和最近打开时间；
- 默认 Agent 和 folder 级命令/设置。

这解释了为什么 Codeg 的 Workspace 可以同时承载：

```text
一个真实仓库
多个 worktree
一个只用于聊天的入口
多个 Agent conversation
```

官方指南还支持把多个目录以真实 symlink/junction 链接到 workspace。该功能的学习
重点不是 UI 的“多目录”，而是 Agent 进程的工作目录、文件访问根和 Git 视图之间
必须保持一致。[Work across several folders](https://docs.codeg.app/guide/workspace#work-across-several-folders)

## 4. Conversation、Session、Turn 的三层关系

```text
Conversation
  = Codeg 持久化的产品历史和 UI 入口

ACP Session
  = 外部 Agent 协议层的运行会话

Turn
  = 一次 prompt 到终态之间的交互单元
      text delta / tool / permission / question / result
```

一个 conversation 可能在不同时间对应多个 connection；一个运行中的 connection
也可能因为重试、resume 或 Agent capability 变化进入不同的 session 行为。Turn 通常
不需要作为独立数据库实体，而由 transcript、ACP state 和 UI projection 共同表达。

学习时应分别回答：

1. 关闭窗口后，哪些 conversation 数据必须留下？
2. connection 退出后，哪些 session state 只作为诊断？
3. turn 的临时 delta 什么时候变成持久消息？
4. 一个迟到事件怎样证明它属于旧 connection 或旧 turn？

## 5. Delegation 是父子会话树，不是普通消息

Codeg 的 conversation 可以通过 `parent_id`、`parent_tool_use_id` 和
`delegation_call_id` 形成子会话关系：

```text
Parent Conversation
  └── tool call: delegate_to_agent
        └── Child Conversation
              └── Child ACP Connection
```

父 conversation 的 tool part 要能显示子任务状态，但父 turn 完成不一定意味着子任务
已经结束。因此：

- parent turn status 与 child task status 不能复用一个枚举；
- child connection 断开不一定等同于 parent conversation 失败；
- 子任务结果需要 task id、状态查询和事件关联；
- snapshot 需要保留 delegation metadata，否则重连后 UI 只能看到一个孤立 tool call。

对应源码：

- [`acp/delegation/broker.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/broker.rs)
- [`acp/delegation/companion.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/delegation/companion.rs)
- [`models/message.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/models/message.rs)

## 6. WorkTask 是持久化编排层

`work_task` 记录的不是一句 prompt，而是一个可重试、可 review、可合并的工作单元：

```text
Task
  ├── config snapshot
  ├── status / failure / run_seq
  ├── base branch / base sha
  ├── worktree folder / work branch
  ├── conversation / connection
  ├── preflight result
  ├── progress / verdict / result summary
  └── additions / deletions / merge commit
```

这使任务能够在 Agent turn 之外拥有自己的生命周期：

```text
Draft
  -> Preflight
  -> Queued
  -> Running
  -> Awaiting / Failed / Completed
  -> Review / Merge / Archived
```

官方 Git & Worktrees 指南说明：每个 worktree 是独立工作副本和分支，Automation 或
Task Board 可以在隔离 worktree 中并行执行。[Git & Worktrees](https://docs.codeg.app/guide/git)

## 7. 代际 fencing：处理重试和迟到事件

推荐重点阅读 `run_seq`、`connection_id` 和 `conversation_id` 的组合：

```text
task A, run_seq = 1, connection = c1
       │ cancel / retry
task A, run_seq = 2, connection = c2

c1 的迟到事件 -> 拒绝
c2 的事件     -> 接受
```

这不是分布式系统里的全套 fencing token，但解决了同一产品里最常见的一类问题：旧
进程、旧 WebSocket、旧重试结果不能覆盖当前代际。

要验证的 invariant：

- 同一 task 的新 run 必须拥有更高代际；
- terminal state 写入后，迟到 delta 不能重新打开 task；
- connection 退出时先清除可用于 kill 的 pid/handle，再执行 backstop cleanup；
- UI 收到旧 snapshot 时不能覆盖新 sequence。

## 8. 对 SpecOS 的迁移启发

当前项目中建议区分：

```text
Workspace / project scope
  -> Conversation / session history
  -> ExecutionAttempt / runtime handle
  -> Turn / transcript event
  -> Goal / task / issue
```

不要让 `ExecutionAttempt` 直接等于 conversation，也不要让 provider session id 直接
作为业务主键。对每个 identity 写清：owner、持久化位置、重启行为、是否可重放、是否
允许跨 workspace 使用。

## 9. 实验与验收

### 实验 A：画实体状态图

用 Codeg 源码和数据库 entity 画出 Folder → Conversation → Connection，以及
Folder → WorkTask → Worktree → Conversation 两条线；给每条边标注 owner 和删除行为。

### 实验 B：旧事件 fencing

模拟同一 task 的 run 1/run 2，向 runtime 注入乱序事件，验证 run 1 的事件不会修改
run 2 的 transcript、status 或 UI。

### 实验 C：分离 turn 与 child task

让 parent turn 完成但 child delegation 继续运行，分别显示两个状态；再模拟 child
失败和 parent 断线，验证状态不会互相覆盖。

验收标准：

- 能区分 folder、conversation、external session、connection、task 五种 identity；
- 能解释为什么 turn 不一定是独立数据库实体；
- 能画出 worktree/branch/task 与 Agent session 的关系；
- 能用 `run_seq` / connection identity 解释迟到事件如何被拒绝。
