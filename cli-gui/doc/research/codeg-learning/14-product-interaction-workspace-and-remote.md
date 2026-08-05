# 14｜产品交互：Workspace、Git Worktree、审批、聚合与远程访问

## 本篇目标

Agent 产品的前端不是聊天窗口外面再加几个设置页。Workspace、文件、Git diff、终端、
审批、任务、远程访问和多会话并行会共同决定用户是否能安全地把 Agent 当作工程协作者。

Codeg 官方 Workspace 指南把这些功能放在同一工作循环：prompt、观察、审阅、运行、
提交。[The Workspace](https://docs.codeg.app/guide/workspace)

## 1. Workspace 是工作上下文组合器

官方描述的 workspace surface 可以抽象为：

```text
Conversation + Composer
      │
      ├── Files / Editor / Preview
      ├── Changes / Commits / Branch
      ├── Terminal
      ├── Session Details / Tasks
      └── Agent connection / token / status
```

这套布局的学习重点不是“四列 UI”，而是每个面板如何共享同一 context：

- 当前 folder/worktree；
- 当前 conversation/session；
- 当前 branch；
- 当前 Agent connection；
- 当前 task/permission；
- 当前 event sequence 和 transcript。

如果文件面板、终端和 Agent 使用不同 cwd 或 branch，用户看到的内容就可能与 Agent
实际修改对象不一致。

## 2. Folder、linked folder、worktree 是三种关系

| 关系 | 用户意图 | 文件系统行为 | Git行为 |
| --- | --- | --- | --- |
| Folder | 打开一个项目目录 | 根目录 | 当前 repo/branch |
| Linked folder | 把多个目录组成一个工作上下文 | symlink/junction | 主 repo 变化面板不一定覆盖 linked repo |
| Worktree | 并行隔离一个任务/分支 | 独立 checkout | 独立 branch，可并行 Agent |

官方指南明确指出 linked folder 是真实 filesystem link，Agent 的 cwd 能看到它；worktree
则是同一 repo 的独立 working copy 和 branch。[Workspace](https://docs.codeg.app/guide/workspace)、[Git & Worktrees](https://docs.codeg.app/guide/git)

这带来几个安全和交互约束：

- linked folder 的 symlink target 不能自动扩大文件访问根；
- linked repo 的 Changes/Commits 归属不能伪装成根 repo；
- worktree 删除不能误删原始 repo；
- folder alias 只改变显示名，不改变磁盘路径；
- workspace remove 是解除引用，不等于删除文件。

## 3. Conversation Aggregation：导入不是复制一段文本

Codeg 支持从各 Agent 的原生 session 目录发现、导入和继续历史。这个过程应理解为：

```text
agent-native session store
  -> scan / parser
  -> identity: external_id + agent_type
  -> reconcile: new / imported / deleted
  -> Codeg conversation projection
  -> optional resume / continue
```

导入模块需要同时处理：

- Agent session id 是否稳定；
- 文件仍在写入时的 transcript watermark；
- 同一 session 重复扫描；
- 用户手动改过的 title 是否保留；
- soft-deleted conversation 是否重新出现；
- 不同 Agent 的 tool/message schema 如何归一化；
- parser 版本更新后历史 projection 是否变化。

官方入口：[Conversation Aggregation](https://docs.codeg.app/guide/aggregation)

## 4. Composer 是一个 command builder

Composer 不只是文本输入，它需要组装：

```text
agent + model + mode + folder + branch + attachments
  + @file/@agent/@session/@commit
  + skill + slash command + feedback
  -> prompt command
```

UI 必须分清 draft 状态和已绑定 session：

- draft 可以切 folder/Agent；
- session 启动后 connection identity 固定；
- send/cancel/fork 有不同的 request lifecycle；
- queued prompt 需要显示顺序、取消和失败；
- context window/token usage 只是观测，不等于业务 loading；
- mode/model 的能力来自 Agent，不应由 UI 假设所有 Agent 相同。

## 5. Permission、Question、Plan、Tool Result 的交互类型

消息区里看到的是不同产品状态：

| 类型 | 用户任务 | 交互要求 |
| --- | --- | --- |
| Markdown reply | 阅读和继续 | 渐进渲染、复制、引用 |
| Plan | 了解 Agent 接下来做什么 | 展开/折叠、状态更新 |
| Tool card | 审阅副作用 | command/input/status/result/错误 |
| Permission | 决定是否授权 | risk、scope、duration、allow/deny |
| Question | 提供缺失信息 | 选项/自由输入、校验、取消 |
| Delegation | 查看子任务 | child status、进度、跳转、结果 |
| Empty reply | 诊断协议/Agent异常 | 区分无输出、解析失败、只有状态 |

这些内容不能全部落成一条 assistant text。它们需要稳定的 content kind、request id、
终态和可重连的 snapshot。已有消息渲染专题可配合阅读：[05 Next/React UI](./05-next-react-ui-rendering.md)。

## 6. 审批的用户体验与安全语义

一个审批卡片至少需要让用户知道：

- Agent 要做什么；
- 目标文件/命令/工具是什么；
- 允许范围多大；
- 这个决定持续多久；
- Allow/Reject 是否只影响本次 turn、session、项目还是用户设置；
- 关闭窗口、重连、重复点击后状态如何处理。

移动/远程场景下，审批尤其不能“自动重放”：请求可能已经过期、Agent 可能已退出、
用户可能只看到旧 UI。重连后应展示 pending request 的当前状态，并在不确定投递时要求
重新确认。

## 7. 远程与移动：先保证 Web 语义，再考虑 native

固定版本文档能确认 Codeg 有 Server + browser/static UI 的远程路径；不要据此推断
`v0.23.1` 已包含完整原生移动客户端。远程 Web 和移动 viewport 需要额外解决：

```text
browser/mobile client
  -> authenticated HTTP/WS
  -> snapshot + replay
  -> touch-friendly message/permission UI
  -> offline/read-only cache
  -> reconnect and stale request handling
```

优先级建议：

1. 认证、token rotation、WebSocket reconnect；
2. snapshot/replay 和只读历史缓存；
3. approval/question 的触控确认和过期提示；
4. 长消息、工具卡、日志和 diff 的移动折叠；
5. 再评估是否需要 iOS/Android 原生 client。

## 8. 可访问性与键盘路径

Agent UI 的可访问性不只是颜色对比度，还包括：

- streaming message 更新不会让 screen reader 每个 token 都朗读；
- permission/question 能通过键盘完成；
- tool card 的状态变更有 `aria-live` 合理边界；
- 终端/编辑器/消息列表 focus 不互相抢夺；
- scroll lock、new message、jump to latest 对键盘和触控都可操作；
- collapsed tool result 仍提供可理解的标题、状态和错误摘要。

## 9. Git Review 是 Agent 交互的一部分

Codeg 将 diff、commit、branch、worktree 放在 conversation 旁边，减少用户从“Agent 说
已修改”到“我确认具体改了什么”的跳转。

学习时要区分：

- Agent 修改是否自动可见；
- diff 是 working tree 还是 HEAD 对比；
- commit 是否由用户显式确认；
- worktree 合并失败如何回到 task；
- rollback/discard 的破坏性动作是否需要二次确认；
- linked repo 的改动是否被错误归入根 repo。

## 10. 实验与验收

### 实验 A：workspace context 一致性

打开多个 folder/worktree，分别从 Agent、terminal、editor、diff 读取 cwd/branch，确认
四者指向一致；再切换 session，验证旧事件不会进入新 folder。

### 实验 B：审批断线

Agent 发起 permission 后断开 WebSocket，重连收到 snapshot，再模拟过期和重复确认；
验收只产生一个 decision，并且 UI 不显示已失效的 Allow 按钮。

### 实验 C：aggregation reconcile

构造 new/imported/deleted/renamed/transcript-in-progress 五种原生 session，验证扫描
和导入不会覆盖手动 title、不会重复 conversation。

### 实验 D：移动 viewport

在窄 viewport 测试长消息、tool card、permission、keyboard、scroll-follow、reconnect；
记录可见性、触控命中面积、layout shift 和事件丢失。

本篇验收：

- 能解释 workspace 的 panel 与 runtime context 如何关联；
- 能区分 folder、linked folder、worktree 的文件和 Git 语义；
- 能为 aggregation、approval、question、remote reconnect 写出状态契约；
- 能指出固定版本中哪些移动能力有证据、哪些只能作为后续设计；
- 能把 Git review、消息渲染和 Agent 生命周期放在同一个用户工作循环里。
