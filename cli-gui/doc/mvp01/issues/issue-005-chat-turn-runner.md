# chat 轮次执行：turn-runner + 互斥 / 取消 / 超时语义

## Description
在 Orchestrator 的 Worker 中加入 chat 模式：`submitTurn` 触发按轮 spawn headless 子进程（决策 D-5），经 Adapter 的 buildTurn/parseEvents 完成命令组装与输出翻译，Orchestrator 负责全部执行语义——轮次互斥、取消（SIGTERM→2s→SIGKILL）、超时、spawn 失败、resumeToken 回写。使用 fake CLI 脚本测试，不依赖真实 codex。

## Acceptance Criteria
- [x] `submitTurn(sessionId, input)`：先落 `user_message`（metadata.turnId），spawn 子进程（cwd=workspace 规范路径、干净 env），流式将 ParsedTurnEvent 转 appendEvent（runtime-orchestrator-spec §3.2）
- [x] 轮次互斥（I-2）：进行中再提交 → 抛 `TURN_IN_PROGRESS`；轮次结束追加 `lifecycle`（`turn-completed`/`turn-failed`，含 exitCode、turnId）
- [x] `cancelTurn(sessionId, turnId)`：SIGTERM → 2s 未退 → SIGKILL；落 `lifecycle(turn-cancelled)` + `error(TURN_CANCELLED)`；turnId 不匹配或无活动轮次 → `TURN_NOT_ACTIVE`
- [x] 超时：`SPECOS_TURN_TIMEOUT_MS`（默认 600000）触发取消流程，error code `TURN_TIMEOUT`
- [x] spawn 失败（ENOENT 等）→ `error(TURN_SPAWN_FAILED)` + `lifecycle(turn-failed)`，会话保持可用可重试
- [x] 轮次成功且 TurnParseResult 带 resumeToken → 经 `onRuntimeStatus` 回写 `chatContext.resumeToken`；失败轮不回写
- [x] 轮次子进程退出后 Worker 保持 running（chat 会话 running ≠ 有子进程存活）
- [x] fake CLI 集成测试：正常多轮 / 取消 / 超时 / spawn 失败 / 崩溃（非零退出）五场景（test-spec §2.2、§3.6）

## Dependencies
Issue #3, Issue #4

## Type
backend

## Priority
high

## SPEC Reference
runtime-orchestrator-spec §3.2；domain-spec §3.3（轮次状态机）、§4（I-2）；test-spec §3.6

## Notes
- 保持 Orchestrator 零 CLI 语义：`TurnInput` 扩展 `buildCommand()`/`parseOutput()` 回调（Adapter buildTurn/parseEvents 的应用侧包装，issue-006 接线），与 issue-003 的 `start(prepare)` 同模式；偏离 SPEC 字面签名但维持分层与红线（orchestrator 无 codex/claude 字面量，grep 验证 0 命中）。
- chat Worker 在首次 `submitTurn` 时隐式创建并驻留（onRuntimeStatus(running) + lifecycle(running) 事件）；start-and-send 语义由 issue-006 在 API 层接通。并发上限检查（§3.2 第二步）留待 issue-011。
- 终态事件序遵循 test-spec §3.2「失败轮以 error 收尾」：lifecycle(turn-*) 先、error 后；成功轮以 lifecycle(turn-completed) 收尾。
- 超时终态采用 lifecycle(turn-failed) + error(TURN_TIMEOUT)（SPEC 未指定超时的 lifecycle status，保守归入 failed）；非零退出的 error code 采用 `TURN_FAILED`（SPEC 仅要求“error 事件含 stderr 摘要”未命名 code，自定义记录）；stderr 摘要截断 2000 字符。
- `buildCommand()` 抛错（如非法选项）与 spawn ENOENT 同路径归入 `TURN_SPAWN_FAILED`（user_message 已落盘后只能以轮次失败收尾，不回滚事件）。
- 取消/超时/完成竞态：`terminationReason` 首次设置胜出 + 单次 finishTurn 保证单终态（§6 竞态行）；`cancelTurn` await 轮次完全落帐后返回。
- `SPECOS_TURN_TIMEOUT_MS` 经 application 层 `parsePositiveInteger` 注入 orchestrator（依赖项 `turnTimeoutMs`）；`cancelGraceMs`（默认 2000）也可注入以便测试提速。
- resumeToken 回写：application `onRuntimeStatus(running, {resumeToken})` 仅当 `interactionMode === "chat"` 时写入 `chatContext`（保 I-3）。
- `stop()` 对 chat Worker：先取消进行中轮次（error(turn) → 后续 lifecycle(stopped) 由 Session Manager 追加），符合 §6 事件序；`shutdown()` 对活动轮次直接 SIGKILL + 清理定时器。
- 新增 ApiErrorCode：TURN_IN_PROGRESS / TURN_NOT_ACTIVE / SESSION_CONCURRENCY_LIMIT / APPROVAL_NOT_PENDING / INTERACTION_MODE_MISMATCH（api-spec §3 批量入 shared/api.ts；后两个供 issue-011/012 使用）。
- 测试覆盖 8 用例：多轮+resumeToken、互斥+取消后可用、顷固 SIGTERM→SIGKILL+TURN_NOT_ACTIVE、超时+重试、spawn 失败+重试、崩溃 stderr 摘要、terminal 会话 mismatch、stop 中断轮次。
