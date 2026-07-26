# 全局并发上限 + 4 并发零串台验收

## Description
在 Orchestrator 实现全局运行会话上限（决策 D-6）：超限显式拒绝（HTTP 429 `SESSION_CONCURRENCY_LIMIT`），不排队。完成 B 段核心验收之一：4 个会话（2 chat + 2 terminal）并行零串台。

## Acceptance Criteria
- [x] `SPECOS_MAX_RUNNING_SESSIONS`（默认 8，下限 4，非法值回落默认并告警日志）生效于 `start()` 入口（runtime-orchestrator-spec §3.3）
- [x] 超限 start → 429 `SESSION_CONCURRENCY_LIMIT`，响应体含 `{ running, limit }`；已 running 会话的幂等 start 不受限
- [x] `runningCount()` 口径：running 状态 Worker 数（chat 会话无活动子进程也计入）
- [x] 前端处理 429：明确提示「运行中会话已达上限（N/limit），请先停止部分会话」，非静默失败
- [x] 集成测试：limit=4 时第 5 个 start 被拒；停一个后可再启
- [x] 并发验收（fake CLI + Playwright）：2 chat 会话同时进行轮次 + 2 terminal 会话输出，各自 transcript 的 sessionId/turnId 无交叉、WS 事件无串台（test-spec §4.2）
- [x] 事件顺序断言：并发下各会话内 sequence 单调，跨会话互不影响

## Dependencies
Issue #5

## Type
backend

## Priority
medium

## SPEC Reference
runtime-orchestrator-spec §3.3；api-spec §2.1、§3；test-spec §4.2；architecture-spec §1.3（D-6）

## Notes
- 上限实施点选在 `application.startSession` 而非 `orchestrator.start`：runtime-orchestrator-spec §3.3 的计数口径是「运行中 Session 数（terminal 与 chat 合并）」，而 chat 会话 start 不经过 orchestrator.start（无需 spawn）；在 startSession 入口检查可同时覆盖 `POST /:id/start` 与 messages 的 start-and-send 路径。计数使用 `session.runtimeStatus ∈ {starting, running}`。
- `orchestrator.runningCount()` 保持 Worker 口径（workers.size，chat 空闲 Worker 也计入）不改动；AC3 的「chat 无活动子进程也计入」由 session runtimeStatus 口径天然满足（chat start 后即置 running）。
- 环境变量解析的保守解释：非法值（非整数或 <1）→ 回落默认 8 + logger.warn；合法整数但 <4 → clamp 到下限 4 + logger.warn（“下限 4”理解为配置地板而非拒绝启动）。
- test-spec §4.2 拆分：零串台深度断言（transcript sessionId/turnId 互斥、sequence 严格递增、4 路 WS 帧归属）在 vitest 服务端集成测试（chat-api.test.ts，2 chat + 2 terminal，fake PTY runtime）；Playwright 只做 UI 层多会话内容隔离冒烟（2 chat + 1 terminal）。
- E2E 创建 chat 会话经 `page.evaluate` + `GET /api/state` 的 `csrfCapability` 直接调 API：fixture state 保持 schemaVersion 2 以保留迁移冒烟，而 v2 会话迁移默认 interactionMode=terminal，chat 会话只能运行时创建。fake headless CLI 为 node 脚本（codex JSONL 行协议），adapterVersionRange 取宽区间使 node 版本命中从而开启 headless 能力。
- E2E 稳定性：多会话冒烟用例对 fixture 会话的 Resume 按钮做状态容忍（若前序用例已启动则直接断言 Stop 可见），避免全量串行运行时的顺序耦合。
