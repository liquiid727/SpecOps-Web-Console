# 05｜Next / React 消息渲染：把流式 Agent 状态变成可用的工作区

## 本篇目标

Agent UI 的难点不是把一段 Markdown 放进 `<div>`，而是同时处理：持续追加的文本、
工具调用、权限卡片、用户滚动、历史记录、重连恢复和大量消息。Codeg 的前端值得
学习的是它如何把「运行时状态」和「消息投影」分开，再把复杂内容拆成稳定的渲染边界。

读完后应该能够回答：

1. 一条 Agent event 怎样进入消息列表？
2. 为什么 live streaming message 不应该让整个 workspace 重渲染？
3. React Hook、memo、selector 和虚拟化各自解决什么问题？
4. 哪些性能问题是列表行数量，哪些是单条消息的 Markdown/代码渲染？
5. 流式、空态、加载、错误和权限等待怎样形成完整交互？

## 1. 消息渲染链

Codeg v0.23.1 的主链可以压缩为：

```text
ACP / workspace event
        ▼
conversation-runtime-store
        ▼
selectTimelineTurns
        ▼
MessageListView
        ▼
MessageTurnAdapter
        ▼
HistoricalMessageGroup / live group
        ▼
ContentPartsRenderer
        ▼
Markdown、代码、工具、权限、问题、附件等内容块
```

源码入口：

- [`conversation-runtime-store.ts`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/stores/conversation-runtime-store.ts)
- [`message-list-view.tsx`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/components/message/message-list-view.tsx)
- [`ai-elements-adapter.ts`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/lib/adapters/ai-elements-adapter.ts)
- [`content-parts-renderer.tsx`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/components/message/content-parts-renderer.tsx)
- [`virtualized-message-thread.tsx`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/components/message/virtualized-message-thread.tsx)

**学习重点**：不要从组件树反推数据模型。先找 runtime store 如何接收事件，再找
selector 如何生成 timeline，最后看 renderer 如何处理内容 part。这样才能区分：

- 事实状态：session 是否运行、事件序号、权限是否待处理；
- 消息投影：一个 turn 显示成几个 group；
- 视觉状态：是否自动滚动、是否展开 tool、是否显示 skeleton。

## 2. 历史消息和 live message 是两种性能问题

### 2.1 历史消息：稳定、可缓存、适合虚拟化

历史 turn 一旦完成，引用和结构可以尽量保持稳定。`MessageListView` 将历史组和
当前 live 内容分开，历史 group 使用 memo/ref 稳定化，避免新 delta 到来时所有历史
消息重新计算。

### 2.2 Live message：高频、局部、需要单独订阅

流式事件可能每几十毫秒到达一次。Codeg 的 runtime store 用 `SET_LIVE_MESSAGE`
更新当前内容，并让常规 workspace connection consumers 排除 `liveMessage` 和
`lastAppliedSeq` 这类高频字段；对应测试验证了 live slice 的解耦。

相关源码和测试：

- [`use-connection.ts`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/hooks/use-connection.ts)
- [`conversation-runtime-store.ts`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/stores/conversation-runtime-store.ts)
- [`runtime-live-message-slice-decoupling.test.ts`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/stores/runtime-live-message-slice-decoupling.test.ts)
- [`runtime-timeline-prefix-cache.test.ts`](https://github.com/xintaofei/codeg/blob/v0.23.1/src/stores/runtime-timeline-prefix-cache.test.ts)

可以把这条经验抽象为：

```text
high-frequency stream state
  -> narrow selector -> live renderer

low-frequency workspace state
  -> broad selector -> shell / sidebar / settings
```

如果一个 Hook 同时订阅两类状态，任何一小段 token 都可能触发 sidebar、header、
workspace tree 和消息历史一起 render。第一优化目标不是加 `useMemo`，而是缩小订阅
边界。

## 3. Timeline selector 是产品语义层

`selectTimelineTurns` 不只是数组过滤器。它把底层事件/消息结构转换成用户理解的
turn、group 和 content part，因此这里必须明确：

- 同一轮 Agent 调用如何合并文本 delta；
- tool call 的开始、进度、结果是否属于同一 group；
- permission/question 是否插入 timeline，还是作为 session side state；
- snapshot 恢复后，重复事件是否会生成重复消息；
- live message 结束时，怎样无跳变地转入历史缓存。

Codeg 对 timeline prefix 做缓存，目标是让历史前缀在 live delta 更新时尽量复用；但
缓存不是免费优化，必须有失效条件。学习时画出下面的 invariant：

```text
timeline(prefix events[0..S]) is reusable
iff session identity, event ordering and projection inputs are unchanged
```

一旦 session 切换、snapshot 替换、事件乱序或 renderer 版本改变，就必须重新计算
受影响的前缀，而不能只依赖对象引用相等。

## 4. Hook 怎样服务于边界

### 4.1 selector Hook：订阅最小状态

推荐把 Hook 分成三类：

| Hook 类型 | 例子 | 负责什么 | 常见错误 |
| --- | --- | --- | --- |
| state selector | runtime store selector | 取一个稳定、最小的状态切片 | 直接订阅整个 store |
| lifecycle/IO | connection、reconnect、cancel | 管理副作用和清理 | 在 render 中启动进程或请求 |
| interaction | stick-to-bottom、scroll、keyboard | 管理用户操作和 DOM 观测 | 让 scroll event 直接修改全局 store |

Hook 的设计问题不是「是否用了 Hook」，而是：

1. 它订阅的值是否会高频变化？
2. effect 的依赖是否包含真实资源身份？
3. cleanup 是否在 session、workspace 或 connection 切换时执行？
4. callback 是否传给 memo 子组件，是否需要稳定引用？
5. 一个 Hook 是否同时承担数据获取、业务决策和 DOM 交互三种职责？

### 4.2 `useMemo` 和 `useCallback` 的正确位置

它们只在有明确收益时使用：

- selector 生成的昂贵 timeline projection，且依赖集合可说明；
- 传给大量 memo row 的稳定回调；
- 虚拟化 item renderer 的结构化输入；
- Markdown 解析结果的短期缓存，前提是缓存不会无限增长。

它们不能修复：

- store selector 订阅过宽；
- 每个 token 都重新解析整篇超长 Markdown；
- 一个 row 内挂载几十个昂贵子树；
- effect 因依赖不稳定而反复建立连接；
- 用户滚动策略本身不明确。

React 官方对 render/commit 的解释适合和这些源码一起阅读：[Render and Commit](https://react.dev/learn/render-and-commit)。

### 4.3 effect 的生命周期清单

为连接或滚动 Hook 写 effect 时，至少记录：

```text
resource identity: workspace/session/connection id
setup: subscribe / observer / listener
update: what changes without re-subscribe
cleanup: unsubscribe / abort / dispose
race: setup finishes after cleanup?
error: how failure enters UI state?
```

如果无法写出 cleanup 和 race 的答案，这个 Hook 还没有形成可靠的资源边界。

## 5. 虚拟化解决什么，不能解决什么

Codeg 的 `virtualized-message-thread.tsx` 使用 Virtua，采用动态测量、overscan 和
滚动到指定 index 等策略。它主要降低「不可见历史 row 同时存在于 DOM」的成本。

```text
很多 turns
  -> virtualizer 只挂载可视窗口附近的 rows
  -> dynamic measure 处理 Markdown/tool card 高度变化
  -> stick-to-bottom 管理流式追加时的滚动策略
```

但虚拟化不自动解决三类瓶颈：

1. **单条消息太大**：一个 row 有 100k 字符 Markdown，仍然需要解析和布局；
2. **高频更新范围太大**：如果 live row 的 props 变化导致父列表重算，virtualizer
   仍可能付出调度成本；
3. **测量抖动**：图片、代码高亮、折叠工具结果和字体加载会改变高度，导致滚动
   锚点跳动。

性能分析应分别记录：DOM row 数、单 row render 时间、Markdown parse 时间、layout
时间和 scroll correction 次数。不要只记录「启用了虚拟化」。

## 6. 消息内容要做成 discriminated union

Agent 消息通常不止 text。一个可维护的产品模型至少需要区分：

```ts
type ContentPart =
  | { kind: "text"; text: string }
  | { kind: "markdown"; source: string }
  | { kind: "tool_call"; id: string; name: string; input: unknown; status: ToolStatus }
  | { kind: "tool_result"; id: string; output: unknown; status: ToolStatus }
  | { kind: "permission"; requestId: string; ... }
  | { kind: "question"; requestId: string; ... }
  | { kind: "error"; code: string; retryable: boolean; message: string };
```

Codeg 的真实类型比这个示例丰富；这里强调的是设计方向：渲染器根据稳定的 kind
分发，而不是在 UI 中解析 vendor-specific JSON。每一种 kind 都应定义：

- 是否可以流式追加；
- 是否可折叠；
- 是否需要权限；
- 是否可以重试；
- snapshot/replay 后如何恢复；
- 无法识别时怎样安全展示。

这也是 `ContentPartsRenderer` 的学习入口：先看分发协议，再看每个内容块的视觉组件，
最后看它如何接入交互回调。

## 7. 滚动是状态机，不是一个 `scrollIntoView`

一个可用的 Agent 消息列表至少有这些状态：

```text
AtBottom
  ├── new live delta -> follow bottom
  └── user scrolls up -> PausedByUser

PausedByUser
  ├── new event -> show unread/new-message affordance
  └── user clicks follow -> AtBottom

Any state
  ├── session switch -> restore per-session anchor or top
  ├── snapshot replace -> preserve valid anchor if possible
  └── error -> keep visible context and expose retry/reconnect
```

Codeg 的 `use-stick-to-bottom`、虚拟化 thread 和消息列表应放在一起阅读。学习时要
观察三个细节：

- 用户主动上滚时，流式追加不能强行抢回滚动位置；
- 当前 turn 高度变化时，底部锚点要尽量稳定；
- 断线恢复带来历史补齐时，不能把用户视野突然跳到最新消息。

## 8. 完整 UI 状态契约

不要只实现「有消息」的 happy path。建议每个 session/message pane 至少有：

| 状态 | 用户看到什么 | 数据来源 | 可操作动作 |
| --- | --- | --- | --- |
| empty | 没有会话/没有消息的解释和入口 | session/workspace snapshot | 新建、选择 Agent、打开设置 |
| loading | 首次加载或恢复中的稳定 skeleton | connection lifecycle | 取消、重试（若安全） |
| streaming | 增量文本、tool progress、滚动提示 | live event slice | 停止、回答问题、处理权限 |
| success | 完整 turn、可折叠工具结果和历史 | normalized timeline | 复制、重试、继续对话 |
| waiting | 明确等待用户的 permission/question 卡片 | pending request state | allow/deny、提交答案、取消 |
| failure | 错误原因、影响范围和恢复动作 | typed error / terminal state | retry、重连、查看诊断 |
| reconnecting | 当前可见快照 + 连接恢复提示 | snapshot + stream state | 继续等待或离开 |

错误文案不要直接把 child process stderr 或 vendor 原始异常全部塞进消息区。产品层应
保留稳定 code、用户可读 message、retryable 和诊断 id；详细日志放到诊断边界。

## 9. 性能排查顺序

当消息流式渲染变慢时，按下面的顺序测量：

1. **事件频率**：是不是每个 token 都产生一条 React 更新？是否可以在不增加交互
   延迟的前提下批处理？
2. **订阅范围**：哪些组件被 live slice 更新唤醒？
3. **timeline 计算**：prefix cache 是否命中？projection 是否重复遍历整个历史？
4. **row 数量**：是否需要虚拟化，overscan 是否过大？
5. **单 row 成本**：Markdown、代码高亮、语法解析、图片和 tool result 是否占主导？
6. **浏览器工作**：React commit、layout、paint、long task 分别是多少？
7. **内存**：是否保留了重复 raw event、render tree、解析 AST 和 transcript？

只有第 4 步才是「加虚拟化」；如果第 2 或第 5 步占主导，换列表库不会解决根因。

推荐固定 workload：1/100/1,000 turns，短文本/长 Markdown，低频/高频 delta，工具
结果包含/不包含代码块，用户在底部/用户主动上滚，并记录 p50/p95、commit、layout、
long task、DOM 数和内存。

## 10. 动手实验

### 实验 A：store slice 隔离

对照 Codeg 的 live-message decoupling 测试，设计两个伪组件：

```text
WorkspaceShell 订阅低频 session/workspace state
LiveMessage    只订阅当前 live message
```

在固定 delta 流下统计两个组件的 render 次数。先让两个组件订阅整个 store，再按
slice 拆开；把结果记录为「render count + 事件数 + workload」，不要只记录主观感受。

### 实验 B：虚拟化与单消息大小分离

分别构造：

- 10,000 条短 turn；
- 100 条、每条 10,000 字符的 Markdown；
- 1 条、1,000,000 字符的 Markdown。

比较 row virtualization、Markdown parse、layout 和内存。这个实验能直接验证「列表
多」与「单消息重」不是同一个问题。

### 实验 C：滚动状态机

写出至少四个测试场景：

1. 用户在底部，live delta 到来，继续跟随；
2. 用户上滚，live delta 到来，不抢焦点；
3. 用户点击回到底部，累积内容一次性追上；
4. 重连 snapshot 替换后，保留合理的可见锚点。

## 11. 本篇验收

- 能从 runtime store 追踪到 `ContentPartsRenderer`，并指出每个投影边界。
- 能解释 selector、memo、Hook effect 和虚拟化各自的责任。
- 能说明为什么一个巨大的 Markdown message 不能靠 row virtualization 解决。
- 能为消息 pane 写出 empty/loading/streaming/waiting/success/failure/reconnecting 状态。
- 能用 render count、commit、layout、long task、DOM 和内存数据定位性能瓶颈。
- 能画出「用户滚动」与「Agent 追加」竞争时的状态机。
