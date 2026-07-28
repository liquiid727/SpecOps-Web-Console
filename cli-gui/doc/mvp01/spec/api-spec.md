# SPEC: Agent Console MVP01 — API 契约（api-spec）

> 派生自：`Agent_Console_MVP01_PRD.md` v0.3 §4.2.2、§4.2.5、§4.3
> 上游：[architecture-spec.md](./architecture-spec.md)（决策 D-6 ~ D-8）、[event-protocol-spec.md](./event-protocol-spec.md)、[runtime-orchestrator-spec.md](./runtime-orchestrator-spec.md)
> 现状：`server/application.ts` 路由 + `shared/api.ts`（36 个错误码）+ `shared/websocket.ts`
> 通用约定（冻结）：JSON body ≤ 现有上限、`ApiError { code, message, requestId, field? }`、
> 写操作需 CSRF capability、readonly 模式拒绝全部写、乐观锁 `expectedRevision`

## 1. Summary

MVP01 API 增量 = messages 端点按 `interactionMode` 分流 + 轮次取消 +
审批应答（B 段）+ 会话内模型切换 + WS `turn-status` 帧。现有端点全部
保持向后兼容；transcript 回放与 WS 订阅协议零变更（kind 值经存储层
规范化后自然更新，见 storage-spec §4）。

---

## 2. HTTP 端点

### 2.1 现有端点冻结清单（不变更）

| 端点 | 说明 |
|---|---|
| `GET /api/state` | 全量状态（workspaces/profiles/sessions + capabilities） |
| `POST /api/workspaces` / `POST /api/workspaces/pick` | 创建 / macOS 目录选择 |
| `GET /api/workspaces/:id/files|preview|languages|git/status|git/diff` | 只读检查（Git allowlist） |
| `GET /api/profiles/:id/capabilities` | capability 探测（响应含 §2.7 新字段） |
| `POST /api/sessions` | 创建（可选 `start+confirmed`）；请求体新增 `interactionMode`（§2.6） |
| `PATCH /api/sessions/:id` | 名称 / launchConfig（扩展见 §2.6） |
| `DELETE /api/sessions/:id` | 删除（`SESSION_HAS_FORKS` 保护） |
| `POST /api/sessions/:id/start|stop|pin|archive|complete|restore|reopen|fork` | 生命周期与组织管理 |
| `POST /api/sessions/reorder` | 手动排序 |
| `POST /api/sessions/:id/resize` | terminal resize |

`start` 新增行为：受全局并发上限约束（D-6）——超限返回
`429 SESSION_CONCURRENCY_LIMIT`，body `details: { running, limit }`。

### 2.2 messages 端点按 interactionMode 分流（MODIFY）

`POST /api/sessions/:id/messages`
请求体（不变）：`{ clientMessageId, content, startIfStopped?, confirmedStart? }`

公共前置（现状保持）：`clientMessageId` 幂等去重（重复 → 202
`duplicate: true`）、`SESSION_NOT_ACTIVE` 校验、空内容拒绝、
stopped 会话需 `startIfStopped + confirmedStart`（start-and-send，
首轮启动确认语义与 `start` 一致）。

| interactionMode | 行为 |
|---|---|
| `terminal` | 现状不变：append `user_message` 事件 + PTY write |
| `chat` | append `user_message` → `orchestrator.submitTurn`（runtime-orchestrator-spec §3.2） |

chat 分支响应 `202`：

```ts
{ event: TranscriptEvent, runtimeStatus, duplicate: false, turnId: string }
```

chat 分支新增错误：`409 TURN_IN_PROGRESS`（轮次互斥）、
`429 SESSION_CONCURRENCY_LIMIT`（start-and-send 触发启动且超限）。
重试失败轮次 = 前端用**新 `clientMessageId`** 重新提交原 prompt
（runtime-orchestrator-spec §3.2「重试是新轮次」），无独立 retry 端点。

### 2.3 transcript 回放（现状冻结）

`GET /api/sessions/:id/transcript?afterSequence=N&limit=M`（limit ≤ 200）

响应：`{ events, hasMore, nextAfterSequence, retentionFloor? }`——
现有分页语义保持；events 的 kind 已经存储层规范化（storage-spec §4）；
Fork 子会话返回「父前缀（只读）+ 自有事件」单一序列（现状保持）。

### 2.4 轮次取消（NEW，A 段）

`POST /api/sessions/:id/turns/cancel`
请求体：`{ turnId: string }`（防止取消竞态误伤下一轮）

| 结果 | 响应 |
|---|---|
| 取消受理 | `202 { turnId }`；终态经 `error` 事件（code `TURN_CANCELLED`）到达 |
| `turnId` 非当前进行中轮次 | `409 TURN_NOT_ACTIVE`（含已完成、已取消、从未存在） |
| terminal 会话 | `400 INTERACTION_MODE_MISMATCH` |

### 2.5 审批应答（NEW，B 段——协议 A 段已就绪）

`POST /api/sessions/:id/approvals/:approvalId`
请求体：`{ decision: "allow" | "deny" }`

| 结果 | 响应 |
|---|---|
| 受理 | `200 { approvalId, decision }`；`approval_response` 事件随 WS 到达 |
| 无此挂起审批（已应答/已超时/不存在） | `409 APPROVAL_NOT_PENDING` |
| decision 非法 | `400 VALIDATION_FAILED` |

readonly 模式：本端点与 §2.4 一并纳入写拦截（`403 READONLY_MODE`）。

### 2.6 创建与更新的 chat 扩展（MODIFY）

`POST /api/sessions` 请求体新增：

- `interactionMode?: "chat" | "terminal"`——缺省 `"chat"`（PRD 默认
  体验）；Profile capability 不支持 headless 时服务端**降级为
  `terminal`**，响应体附 `interactionModeDowngraded: true` 供创建流
  解释（domain-spec §6，不报错）。

`PATCH /api/sessions/:id` 请求体新增：

- `activeModel?: string`——仅 chat 会话（否则 `400
  INTERACTION_MODE_MISMATCH`）；值必须在 capability models 列表内
  （否则 `CLI_OPTION_UNSUPPORTED`）；写入 `chatContext.activeModel`，
  下一轮生效（storage-spec §5）。运行中允许调用（区别于
  launchConfig 的 `SESSION_RUNNING` 限制）。

### 2.7 capabilities 响应扩展（MODIFY）

`GET /api/profiles/:id/capabilities` 响应对象新增
`supportsHeadlessTurns` / `supportsResume` / `supportsApproval`
（adapter-spec §2.2）；前端据此渲染创建流的模式选择与降级说明。

---

## 3. 错误码汇总（本次新增，并入 `shared/api.ts` ApiErrorCode）

| 错误码 | HTTP | 来源 |
|---|---|---|
| `TURN_IN_PROGRESS` | 409 | orchestrator 轮次互斥 |
| `TURN_NOT_ACTIVE` | 409 | §2.4 取消目标已非进行中 |
| `SESSION_CONCURRENCY_LIMIT` | 429 | D-6 全局并发上限 |
| `APPROVAL_NOT_PENDING` | 409 | §2.5 |
| `INTERACTION_MODE_MISMATCH` | 400 | 模式与操作不符（§2.4、§2.6） |

事件级错误码（不走 HTTP，出现在 `error` 事件 `metadata.code`）：
`TURN_TIMEOUT`、`TURN_CANCELLED`、`TURN_SPAWN_FAILED`、
`MESSAGE_DELIVERY_FAILED`（已存在）。
现有 36 个错误码全部保持；错误响应结构 `ApiError` 不变。

---

## 4. WebSocket 协议

### 4.1 现有帧冻结

- `/ws?sessionId=…&channel=events&afterSequence=N`：
  `subscription-ready` / `transcript-event` / `session-updated` /
  `recording-warning` / `protocol-error`——全部保持。
- `/ws?…&channel=terminal`：`terminal-input`/`terminal-resize`/
  `terminal-output`/`runtime-status`/`protocol-error` 保持
  （chat 会话的 Terminal tab 只读回放同样经 events 通道的
  `pty_output` 事件，不新开通道）。

### 4.2 turn-status 帧（NEW：`shared/websocket.ts` EventServerFrame）

```ts
| { type: "turn-status"; turnId: string;
    status: "running" | "waiting_approval" | "completed" | "failed" | "cancelled" }
```

- 用途：前端呈现轮次进行中 / 审批挂起 / 终态的即时 UI 状态
  （气泡 spinner、审批高亮），**不承载内容**——内容一律走
  `transcript-event`（单一事实源，回放可完整重建，D-10）。
- 断线重连后无 turn-status 补发：前端从事件流推导轮次状态
  （有 `turnId` 的最后事件是否 lifecycle/error 终态），
  turn-status 仅是实时优化提示。

---

## 5. Edge Cases

| 场景 | 处理 |
|---|---|
| chat 会话调 `POST :id/resize` | `400 INTERACTION_MODE_MISMATCH`（无 PTY 可 resize） |
| 取消请求与轮次自然完成竞态 | orchestrator 以先到终态为准（runtime-orchestrator-spec §6）；取消方收 `409 TURN_NOT_ACTIVE` 或 `202`（受理但 no-op） |
| messages 并发提交（双击） | 同 `clientMessageId` → 幂等 202 duplicate；不同 id → 第二个 `409 TURN_IN_PROGRESS` |
| PATCH activeModel 与进行中轮次并发 | 允许；进行中轮次不受影响，下一轮取新值 |
| 降级创建（`interactionModeDowngraded`）后客户端仍发 turn 操作 | `400 INTERACTION_MODE_MISMATCH`（服务端以持久化的 mode 为准） |

## 6. PRD 映射

| PRD | 本 SPEC |
|---|---|
| §4.2.5 Composer 送达/幂等/start-and-send | §2.2 |
| §4.2.2 游标回放 / 重连接续 | §2.3、§4.1 |
| §4.3 取消 / 并发上限 / 审批等待 | §2.4、§2.1(start)、§2.5 |
| §4.2.5 chat 内切模型下一轮生效 | §2.6 |
| §4.2.4 降级解释 | §2.6、§2.7 |
