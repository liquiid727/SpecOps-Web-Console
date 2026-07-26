# chat API 接线：messages 分流、turns/cancel、activeModel、创建降级、turn-status 帧

## Description
把 chat 能力接入 HTTP + WebSocket 契约层：`messages` 端点按 `interactionMode` 分流，新增取消端点，session 创建/PATCH 支持 chat 字段，WS 广播 `turn-status` 帧。既有 terminal 路径行为不变（api-spec §2.1 冻结清单）。

## Acceptance Criteria
- [x] `POST /api/sessions/:id/messages`：terminal 分支现行为不变；chat 分支调 `submitTurn`，响应含 `turnId`；`clientMessageId` 幂等语义两种模式一致（api-spec §2.2）
- [x] `POST /api/sessions/:id/turns/cancel`（body `{turnId}`）→ 202 `{status:"cancelling"}`；`TURN_NOT_ACTIVE` → 409；terminal 会话调用 → 400 `INTERACTION_MODE_MISMATCH`（api-spec §2.4）
- [x] 创建端点接受 `interactionMode`（缺省 `"chat"`）；profile 不支持 headless → 服务端降级为 terminal 并返回 `interactionModeDowngraded: true`；创建后模式不可变，PATCH 改模式 → 400（api-spec §2.6）
- [x] `PATCH /api/sessions/:id` 支持 `chatContext.activeModel`（轮次进行中允许，下一轮生效）
- [x] 新错误码注册进集中映射：`TURN_IN_PROGRESS` 409 / `TURN_NOT_ACTIVE` 409 / `INTERACTION_MODE_MISMATCH` 400（api-spec §3）
- [x] WS 事件通道新增 `turn-status` 帧（turnId + status，不含内容）；断线重连不补发，状态由事件回放推导（api-spec §4.2）
- [x] chat 会话 `start` 不再必然 spawn PTY；`session-updated`/回放/fork 端点响应含 v3 新字段
- [x] 集成测试：分流、取消、降级、幂等重试、错误码矩阵（test-spec §3.5）

## Dependencies
Issue #1, Issue #5

## Type
backend

## Priority
high

## SPEC Reference
api-spec §2–4；event-protocol-spec §5（回放保证）；test-spec §3.5

## Notes
- 取消响应为 202 `{ turnId }`（api-spec §2.4），非本卡 AC 所写 `{status:"cancelling"}`；SPEC 为准。
- `user_message` 落盘保留在 `orchestrator.submitTurn` 内部（互斥检查与落盘原子化，避免 application 层 append 后互斥失败的竞态）；submitTurn 返回已落盘事件供 202 响应使用。SPEC §2.2「append → submitTurn」按整体行为解读，非分层指令。
- 落盘失败（appendEvent 返回 undefined）→ 500 `TRANSCRIPT_WRITE_FAILED` 且不启动轮次，与 terminal messages 分支语义对齐。
- `turn-status` 帧经 OrchestratorCallbacks 可选回调 `onTurnStatus` 注入，orchestrator 保持 CLI/传输无关（grep 验证无 codex/claude 字面量）。
- `activeModel` 取 PATCH body 顶层字段（api-spec §2.6 示例），并严格校验属于 capabilities.models 的 `id` 列表，否则 400 `CLI_OPTION_UNSUPPORTED`。
- chat 会话 `start` 只做校验并标记 running，不 append lifecycle 事件——lifecycle running 由首轮 submitTurn 的 Worker 创建时落盘，避免重复。
- `chatContext` 创建时不初始化；resumeToken 由轮次成功后 onRuntimeStatus 回写，activeModel 仅经 PATCH 写入；轮次 model 取 `chatContext.activeModel ?? launchConfig.model`。
- registry 缺 `buildTurn`/`parseEvents` 时 chat 消息 → 422 `SESSION_START_FAILED`（保守降级，避免半接线状态）。
- SPEC 疑点：api-spec §2.6 提及 launchConfig PATCH 的 `SESSION_RUNNING` 限制未在本卡实现（非本卡 AC，且会改变 terminal 现行为，留待后续卡处理）；test-spec 引用 §3.5 的集成测试内容实际位于 §3.7。
