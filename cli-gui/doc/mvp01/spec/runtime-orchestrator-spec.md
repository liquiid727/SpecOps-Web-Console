# SPEC: Agent Console MVP01 — Runtime Orchestrator（runtime-orchestrator-spec）

> 派生自：`Agent_Console_MVP01_PRD.md` v0.3 §4.3、§4.2.4
> 上游：[architecture-spec.md](./architecture-spec.md)（决策 D-4 ~ D-8、D-10）、[domain-spec.md](./domain-spec.md) §3.3
> 现状：执行控制逻辑内嵌于 `server/application.ts`（per-session `Runtime` 对象、startLocks、
> generation 计数）；本 SPEC 将其显式化为独立契约并补齐 chat 轮次编排

## 1. Summary

Runtime Orchestrator 位于 Session Manager 与 Adapter 之间，管「怎么跑」：
为每个运行中会话维护一个 Runtime Worker，收拢生命周期幂等、轮次互斥、
取消、超时、显式重试、审批等待、全局并发上限。Orchestrator **不理解任何
CLI 语义**——argv 组装与输出解析全部委托 Adapter。

---

## 2. 契约定义

### 2.1 RuntimeOrchestrator port（NEW: `server/ports.ts`）

```ts
interface RuntimeOrchestrator {
  /** 幂等 start：已运行返回现有 Worker；超并发上限抛 SESSION_CONCURRENCY_LIMIT */
  start(session: SessionV3, launch: ResolvedLaunch, terminal?: { cols: number; rows: number }): Promise<void>;
  /** 幂等 stop：未运行为 no-op；保证 lifecycle 事件与进程退出一致 */
  stop(sessionId: string): Promise<void>;
  /** 仅 chat 模式：提交一轮；违反互斥抛 TURN_IN_PROGRESS */
  submitTurn(sessionId: string, input: TurnInput): Promise<{ turnId: string }>;
  /** 取消指定轮次；turnId 非当前进行中轮次抛 TURN_NOT_ACTIVE；取消后会话保持可用 */
  cancelTurn(sessionId: string, turnId: string): Promise<void>;
  /** B 段：传达审批决定；无挂起审批抛 APPROVAL_NOT_PENDING */
  respondApproval(sessionId: string, approvalId: string, decision: "allow" | "deny"): Promise<void>;
  /** terminal 模式透传（现有 PTY write/resize 语义迁移至此） */
  writeTerminal(sessionId: string, data: string): void;
  resizeTerminal(sessionId: string, cols: number, rows: number): void;
  attachTerminalClient(sessionId: string, client: WebSocket): void;
  runningCount(): number;
  shutdown(): Promise<void>;
}

interface TurnInput {
  turnId: string;            // 服务端生成，事件 metadata.turnId
  prompt: string;
  model?: string;            // chatContext.activeModel 覆盖值
  resumeToken?: string;      // 上一轮产出的 CLI 会话凭据
}
```

### 2.2 Orchestrator 的回调依赖（依赖注入，不反向 import application）

```ts
interface OrchestratorCallbacks {
  appendEvent(sessionId: string, input: AppendEventInput): Promise<TranscriptEvent | undefined>;
  onRuntimeStatus(sessionId: string, status: SessionRuntimeStatus, extra?: { exitCode?: number; resumeToken?: string }): Promise<void>;
}
```

- transcript 写入与 state 持久化仍归 Session Manager（application）所有；
  Orchestrator 通过回调上报，维持「Session Manager 管会话是什么」的分层。
- `onRuntimeStatus` 携带轮次成功后 Adapter 解析出的 `resumeToken`，
  由 Session Manager 写入 `chatContext`（domain-spec §2.1）。

---

## 3. Runtime Worker

每个运行中会话对应一个 Worker，按 `interactionMode` 二态：

| | terminal Worker | chat Worker |
|---|---|---|
| 执行载体 | PTY 进程（node-pty，现有实现迁移） | headless 轮次执行器（每轮一个子进程） |
| 生存期 | PTY 进程存活期 | 显式 stop 前保持（轮次间空闲驻留） |
| 输入 | WS terminal-input 透传 | `submitTurn` |
| 输出 | 原样广播 + 批量 `pty_output` 事件 | Adapter `parseEvents` 产出的结构化事件流 |
| 退出 | 进程 exit → stopped | stop / 会话删除 / archive/complete 确认停止 |

### 3.1 生命周期幂等语义（现有语义冻结 + 迁移）

- `start`：并发调用收敛到单一启动操作（现有 startLocks 机制迁移）；
  已运行直接返回；启动失败 → `runtimeStatus: error` + `error` 事件。
- `stop` / `kill`：重复调用 no-op；进程退出与 `lifecycle` 事件写入保持
  一致性（现有 generation 计数防旧进程回调污染，迁移保留）。
- 服务关停：`shutdown()` 停止全部 Worker、flush transcript 队列
  （现有 close 流程语义保持）。

### 3.2 chat 轮次状态机（domain-spec §3.3 的执行细则）

```
submitTurn
  → [互斥检查] 有进行中轮次 → 409 TURN_IN_PROGRESS
  → [并发检查] 会话未运行且超全局上限 → 429 SESSION_CONCURRENCY_LIMIT
  → append user_message 事件（幂等键 clientMessageId）
  → Adapter.buildTurn({ profile, workspace, prompt, model, resumeToken }) → CommandSpec
  → spawn 子进程（argv 数组，cwd = workspace.path）
  → Adapter.parseEvents(stdout) 逐事件 append + publish（流式）
  → 结束分支：
     exit 0        → completed：lifecycle(turn-completed) + resumeToken 上报
     exit ≠ 0      → failed：error 事件（含 stderr 摘要）
     cancelTurn    → SIGTERM（2s 后 SIGKILL）→ error 事件（code: TURN_CANCELLED）
     超时(D-7)     → 同取消路径 → error 事件（code: TURN_TIMEOUT）
     approval_request 事件 → waiting_approval（§3.4）
```

约束：

- **轮次互斥（I-2）**：同一 chat 会话同时只允许一个进行中轮次；
  互斥锁按 sessionId 持有，轮次终态（completed/failed）后释放。
- **取消后可用**：取消不改变会话 `running` 状态；用户可立即提交下一轮。
- **重试是新轮次**：失败轮次由用户在 UI 显式重试；重试 = 以原 prompt
  提交新 `turnId` 的轮次，**不自动重放**、不复用失败轮次的部分输出。
- 轮次子进程 stderr 不解析语义，失败时截断存入 `error` 事件 raw。

### 3.3 全局并发上限（D-6，B 段验收）

- 计数口径：`runtimeStatus ∈ {starting, running}` 的 Session 数
  （terminal 与 chat 合并计数）。
- 上限来自 `SPECOS_MAX_RUNNING_SESSIONS`（默认 8，配置下限 4）。
- 超限的 start / start-and-send 请求：明确拒绝，返回
  `429 SESSION_CONCURRENCY_LIMIT` + 当前运行数与上限（UI 解释用）。
  不做隐式排队（演进位：MVP01+ 若需要排队，在此契约点扩展）。

### 3.4 审批等待（D-8：A 段协议就绪，B 段接通 UI）

```
parseEvents 产出 approval_request(metadata.approvalId)
  → Worker 进入 waiting_approval：暂停超时计时，挂起等待
  → respondApproval(sessionId, approvalId, "allow" | "deny")
      → append approval_response 事件
      → 决定写入子进程 stdin（格式由 Adapter capability 声明）
      → 回到 running，恢复计时
  → 审批超时（SPECOS_APPROVAL_TIMEOUT_MS）
      → append approval_response(decision: "timeout") → 走取消路径 failed
```

- CLI 不支持 headless 审批协议（capability `supportsApproval: false`）：
  Adapter 不会产出 `approval_request`，权限不足表现为轮次失败 +
  错误指引（frontend-spec §5.4 兜底文案）。
- A 段实现范围：`waiting_approval` 状态、超时路径、事件写入；
  `respondApproval` 的 HTTP 端点与 UI 在 B 段（api-spec §2.5）。

---

## 4. 与现有代码的迁移映射

| 现有位置（application.ts） | 去向 |
|---|---|
| `Runtime` 类型、`runtimes` Map、generation 计数 | orchestrator.ts Worker 内部 |
| `startLocks` 启动收敛 | orchestrator `start` 幂等实现 |
| `startSession` 的 spawn/onData/onExit 接线 | orchestrator terminal Worker |
| `queuePtyTranscript`/`flushPtyTranscript` 批量落盘 | orchestrator（回调 appendEvent） |
| `stopSession`/`finishExit` | orchestrator `stop` + 状态回调 |
| `broadcastTerminal`、terminal WS client 集合 | orchestrator terminal 通道 |
| state 持久化、revision、组织状态、路由 | 留在 application.ts |

迁移原则：先保 `application.test.ts` 契约全绿再搬移（architecture-spec §5.2 风险项）；
terminal 行为零变更是迁移完成的验收线。

## 5. Error Taxonomy（本层新增，汇总见 api-spec §3）

| 错误码 | 触发 | HTTP |
|---|---|---|
| `TURN_IN_PROGRESS` | 违反轮次互斥 | 409 |
| `TURN_NOT_ACTIVE` | cancelTurn 的 turnId 非当前进行中轮次 | 409 |
| `TURN_TIMEOUT` | 轮次超时（事件内 code，非 HTTP） | — |
| `TURN_CANCELLED` | 用户取消（事件内 code） | — |
| `SESSION_CONCURRENCY_LIMIT` | 超全局并发上限 | 429 |
| `APPROVAL_NOT_PENDING` | respondApproval 无挂起审批 | 409 |
| `INTERACTION_MODE_MISMATCH` | 对 terminal 会话调 submitTurn 等 | 400 |

## 6. Edge Cases

| 场景 | 处理 |
|---|---|
| 轮次进行中收到 stop | 先取消轮次（SIGTERM→SIGKILL），再停 Worker，事件顺序：error(turn) → lifecycle(stopped) |
| 轮次进行中服务崩溃 | 重启后会话标记 stopped；孤儿轮次无 turn-completed 事件，前端按「中断轮次」呈现（frontend-spec） |
| cancelTurn 与轮次自然完成竞态 | 以先到达终态者为准，后者 no-op；不产生双终态事件 |
| 子进程 spawn 失败（可执行文件不存在） | 轮次立即 failed：error 事件 code `TURN_SPAWN_FAILED`，会话保持 running 可重试 |
| waiting_approval 中收到 cancelTurn | 挂起审批按 deny 落 approval_response，走取消路径 |
| 并发上限收紧（重启后 env 变小）时已超限 | 已运行会话不被杀；仅拒绝新 start |

## 7. PRD 映射与验收

| PRD §4.3 条目 | 本 SPEC |
|---|---|
| 执行上下文（Worker 二态） | §3 |
| 生命周期幂等 / lifecycle 一致性 | §3.1 |
| 轮次互斥 | §3.2 |
| 取消 | §3.2 |
| 超时与显式重试 | §3.2（D-7） |
| 并发上限 ≥ 4 | §3.3（B 段门禁：4 并发零串台，test-spec §4.2） |
| 审批等待 | §3.4 |
| 「不理解 CLI 语义」 | §1 + 架构禁令（architecture-spec §2.1） |
