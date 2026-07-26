# Composer chat 交互：取消 / 重试 / 模型切换 / start-and-send + A 段列表收口

## Description
把 `PromptComposer` 与会话状态接到 chat API 上：发送触发轮次、进行中可取消、失败可重试、模型即时切换；配合最简会话列表完成 A 段「创建→对话→重启回放」的端到端闭环。

## Acceptance Criteria
- [x] 发送：POST messages（chat 分支），乐观渲染 user 气泡，`turn-status` / 事件流驱动状态；轮次进行中输入框可编辑但发送禁用（I-2 前端呈现）
- [x] 取消按钮：进行中显示，调 `turns/cancel`（携带当前 turnId）；竞态下收到 409 `TURN_NOT_ACTIVE` 静默刷新状态（frontend-spec §5.2）
- [x] 失败轮次重试：以新 `clientMessageId` 重发原文（无 retry 端点，frontend-spec §5.3 / api-spec §2.2）
- [x] 模型即时切换：选择器 PATCH `chatContext.activeModel`，UI 标注「下一轮生效」；选项来源 profile capabilities
- [x] start-and-send：会话 stopped 时发送自动先 start 再提交轮次（沿用现有 startIfStopped 语义）
- [x] 会话列表最简收口：chat 会话显示 interactionMode 标识与轮次进行中指示（A 段仅此，组织能力核对归 #16）
- [x] WS 断线重连后经 afterSequence 回放补齐事件，无重复气泡（dedup by event id）
- [x] 组件/交互测试覆盖：发送-取消-重试链路、模型切换、禁用态

## Dependencies
Issue #6, Issue #7

## Type
frontend

## Priority
high

## SPEC Reference
frontend-spec §5、§2；api-spec §2.2、§2.4、§2.6、§4.2；test-spec §3.7

## Notes
- 轮次状态双通道：`turn-status` 帧（实时，经 TranscriptPanel 订阅透传 ChatView）+ `deriveActiveTurnId` 事件流推导（api-spec §4.2 断线重连无补发，刷新/回放后兑底）；合并优先级 frame > derived，derived 仅在会话 running 时生效。
- 乐观渲染采保守解释：不造临时气泡（临时 id 无法与服务端事件去重），而是将 202 响应里的 `event`（user_message）注入 TranscriptPanel `localEvents`，`mergeEvent` 按 event id 去重，WS 重复推送不产生双气泡（同时覆盖 AC7 的 dedup 验收路径）。
- start-and-send：AC 写「自动先 start」，但 frontend-spec §5.1 明确要求提交前弹启动确认（命令预览 + cwd）——SPEC 为准：实现 ActionDialog 确认弹窗，确认后才走既有 startIfStopped+confirmedStart 提交；取消弹窗抛 `ComposerCancelled`，composer 静默保留输入不报错。
- 模型切换选「CLI default」（null）时不发 PATCH：api-spec §2.6 要求 activeModel 必须在 capabilities.models 内，null 无端点语义，保守跳过。
- 取消后 composer 立即可用：`cancelledTurnsRef` 抑制 derived 通道（终态 lifecycle 事件可能晚到）；409 `TURN_NOT_ACTIVE` 同样记入并静默刷新（frontend-spec §5.2）。
- 会话列表轮次进行中指示：服务端 state 无 activeTurn 字段，由 ChatView `onTurnActivity` 上报 App 维护 `activeTurns` Record 传入 Sidebar；仅当前打开过的会话有指示（A 段最简收口，全局指示需服务端字段，归 B 段评估）。
- 重试按钮数据流：TranscriptPanel 用 `buildTurnPrompts`（turnId→user_message.raw）给 error 条目带 onRetry 闭包，ChatView `retryTurn` 以 `crypto.randomUUID()` 新 clientMessageId 重发原文；readonly/非 active 会话不传 onRetry（按钮不渲染）。
- AC7（重连 afterSequence 补齐）：重连取 `latestSequenceRef` 作 afterSequence + `mergeEvent` id 去重为 issue-007 既有实现；本卡新增回显事件同样走 mergeEvent，未新增 E2E（归 #9 冒烟）。
- 测试：PromptComposer（turnActive 禁提交/可编辑/停止按钮、chat 模型选择器走 onActiveModelChange 且不碰 launchConfig）+ TranscriptPanel（deriveActiveTurnId 终态清除、buildTurnPrompts、error 重试按钮有/无回调两态）；全量 34 files / 162 tests 绿。
