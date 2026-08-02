# CLI-GUI-031 Execution Attempts and Safe Technical Fallback

## Meta

- Spec ID: `CLI-GUI-031`
- Spec Version: `1.0`
- Title: Execution Attempts and Safe Technical Fallback（执行尝试与安全技术降级）
- Epic: MVP02-B Model Management
- Status: approved
- Owner Agent: implementation-agent
- Source PRD: `.prd/prd-cli-gui-multi-provider-model-routing.md`
- Covered Requirements: `US-006..US-009`, `FR-1`, `FR-15..FR-24`, `FR-29`
- Depends On: `CLI-GUI-030`
- Prerequisites: ResolvedRoute is deterministic and frozen before execution；AgentBackend events/errors remain normalized；Runtime Orchestrator owns cancellation/timeout/approval
- Risk Tier: `P0`
- Quality Profile: state-machine + concurrency + fault-injection + security + recovery
- Approval Evidence: 用户于 2026-08-02 确认父 PRD，并要求直接生成对应 SPEC 与 Issues

## Goal

为一次用户发送建立一个 `ExecutionTask`，为每次真实 AgentBackend 调用建立独立、可恢复的 `ExecutionAttempt`。首选 Attempt 发生白名单技术故障时，只有在明确未产生持久副作用的前提下，系统才自动创建最多一个备用 Attempt；存在或无法排除副作用时进入用户确认状态。

独立成片理由：Attempt 持久化、故障分类、副作用门禁和 cancel/fallback 竞态构成一个独立 P0 运行时边界，不应散落到 Provider、ProfileAdapter 或 UI 中。

## Why This Exists

当前一次 Chat turn 只记录可变的 Session/model 状态和 Transcript 事件。AgentBackend 内部的 app-server → spawn fallback 是同一 Backend 的 Transport 降级，无法表达跨 Deployment 的模型切换。缺少 Attempt 实体会导致失败历史被覆盖、无法解释实际供应商，也无法安全判断何时可以重放用户输入。

## Out of Scope

- 不实现质量重试、A/B 并行、动态成本/延迟策略或熔断。
- 不自动合并不同模型的代码结果。
- 不把 AgentBackend/Transport fallback 计为新的 Model Attempt。
- 不依据错误 message 文本猜测可重试分类。
- 不实现最终 GUI；GUI 由 `CLI-GUI-032` 交付。
- 不复制完整 prompt 到 Execution repository；输入引用现有 Transcript user-message。

## Deliverables

- ExecutionTask/Attempt snapshots、transition 和 error classification shared 合同。
- 版本化 append-only ExecutionRepository，按 Session 存储并支持 fold/recovery。
- RouteExecutionCoordinator，在 Application 与 RuntimeOrchestrator 边界执行候选策略。
- AgentBackend failure class 与 side-effect observation 扩展。
- 自动 fallback、确认重试、取消和候选耗尽 API/事件。
- fault injection、race、restart/fork/resume 和 secret redaction 套件。

## Domain

### Entities

```ts
type ExecutionTaskState =
  | "created"
  | "running"
  | "awaiting_confirmation"
  | "completed"
  | "failed"
  | "cancelled";

type ExecutionAttemptState =
  | "created"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

type AttemptTrigger = "primary" | "automatic-fallback" | "confirmed-retry";

interface InputSnapshotRef {
  transcriptEventId: string;
  sha256: string;
}

interface DeploymentExecutionSnapshot {
  deploymentId: string;
  deploymentName: string;
  providerId: string;
  providerName: string;
  profileId: string;
  modelId: string;
}

interface ExecutionTask {
  id: string;
  sessionId: string;
  turnId: string;
  input: InputSnapshotRef;
  resolvedRoute: ResolvedRoute;
  state: ExecutionTaskState;
  revision: number;
  selectedAttemptId?: string;
  createdAt: string;
  completedAt?: string;
}

interface ExecutionAttempt {
  id: string;
  taskId: string;
  ordinal: number;
  trigger: AttemptTrigger;
  deployment: DeploymentExecutionSnapshot;
  state: ExecutionAttemptState;
  startedAt?: string;
  completedAt?: string;
  failure?: RoutingFailure;
  usage?: { inputTokens?: number; outputTokens?: number };
  latencyMs?: number;
  cost?: number;
  sideEffect: SideEffectObservation;
}
```

- 一个 accepted user message/turn 对应一个 Task；每次真实 `runTurn()` 对应一个 Attempt。
- Task/Attempt identity、input ref、resolved Route 和 Deployment snapshot 创建后不可修改。
- 只有 lifecycle state、timestamps、failure、usage、side-effect evidence 和 selectedAttemptId 通过带 revision 的 transition 追加。
- archived/deleted Provider、Deployment、Route 不影响历史 snapshot 渲染。
- Token/cost 不可用时字段缺省，不生成估算值。

### Failure Classification

```ts
type RoutingFailureClass =
  | "startup"
  | "connection"
  | "timeout"
  | "rate-limited"
  | "provider-unavailable"
  | "model-temporarily-unavailable"
  | "configuration"
  | "secret-missing"
  | "authentication"
  | "invalid-request"
  | "policy"
  | "approval-denied"
  | "cancelled"
  | "unknown";
```

- AgentBackend/adapter 将 vendor code 映射为稳定 class；Route coordinator 不解析自然语言 message。
- `model_not_found` 是 `configuration`；供应商明确返回临时容量/下线才是 `model-temporarily-unavailable`。
- 未知 vendor、parse 或断流错误归为 `unknown`。
- 只有前六个技术类具备自动 fallback 资格。

### Side-Effect Observation

```ts
interface SideEffectObservation {
  state: "clean" | "possible" | "confirmed" | "unknown";
  evidenceEventIds: string[];
}
```

- AgentEvent 对 tool/command/file_change 增加 `effect: "none" | "read" | "write" | "external" | "unknown"`。
- `write`/`external` → confirmed；未能证明只读的 tool/command → possible。
- stream gap、parse failure 或 Backend 无法证明边界 → unknown。
- 只有 clean 允许无确认自动 fallback；possible/confirmed/unknown 均进入 awaiting_confirmation。
- 无副作用事件但事件协议不支持 effect 声明时视为 unknown，不得乐观判定 clean。

### State Machines

```text
Task:
created -> running -> completed
                  -> failed
                  -> cancelled
                  -> awaiting_confirmation -> running -> completed|failed|cancelled

Attempt:
created -> running -> completed|failed|cancelled
```

- Task 最多包含一个 `automatic-fallback` Attempt。
- 用户确认后创建 `confirmed-retry` Attempt，不续写失败 Attempt。
- cancel 与 failure/fallback 决策使用 Task revision/单飞锁原子收敛；cancel 获胜后不创建新 Attempt。
- confirmation endpoint 使用 expectedRevision + confirmationToken + input hash 幂等。

## Core Algorithm

1. 接受 user message，持久化 Transcript event 并计算 input hash。
2. 冻结 ResolvedRoute，创建 Task 与 primary Attempt。
3. 通过统一 deployment launch resolver 获取临时 Provider env，并调用 AgentBackend。
4. 记录 normalized events、effect evidence、usage 和 result。
5. 成功：Attempt completed，Task completed/selectedAttemptId。
6. 失败：分类错误并持久化 primary failure。
7. 若 cancelled，Task cancelled，结束。
8. 若非白名单、fallback disabled、已使用 automatic fallback 或没有下一候选，Task failed。
9. 若 sideEffect clean，创建一个 automatic-fallback Attempt 并执行下一候选。
10. 若 sideEffect possible/confirmed/unknown，Task awaiting_confirmation，发布稳定恢复事件。
11. 用户确认且 revision/hash/token 匹配时创建 confirmed-retry Attempt；拒绝/取消则终止 Task。
12. 候选耗尽返回按 ordinal 排列的脱敏 error chain。

## Architecture

```text
Application
    |
RouteExecutionCoordinator  -> ExecutionRepository
    |
RuntimeOrchestrator        -> TranscriptRepository
    |
AgentBackend -> Transport -> official CLI
```

- Coordinator 拥有候选选择、Task/Attempt 和 fallback policy。
- RuntimeOrchestrator 继续拥有运行互斥、timeout、cancel、approval 和事件顺序。
- AgentBackend 拥有 vendor failure translation 与 effect 声明，不选择备用模型。
- Transport 只处理 I/O。既有 persistent → spawn fallback 保留在同 Attempt，并通过 `fallbackAttempted` 记录。

## Application

- message send 由 Application 完成 Route preflight 和 user-message 持久化，再将冻结输入交给 RouteExecutionCoordinator。
- Coordinator 调用 RuntimeOrchestrator 的单 Attempt 执行入口，不重复追加 user-message。
- cancel、approval、timeout 和 terminal/session 生命周期继续由 RuntimeOrchestrator 统一裁决。
- AgentBackend 只返回规范事件、effect 和 stable failure；不得读取下一候选或直接触发模型 fallback。
- Task/Attempt transition 持久化成功后才广播对应临时状态帧；广播失败不回滚事实状态。

## Repository

- `shared/execution-attempt.ts`: entities、transitions、failure/effect types。
- `server/execution-store.ts`: `executions/<sessionId>.jsonl` format v1、append/fold/recovery。
- `server/route-execution-coordinator.ts`: state machine 与 candidate policy。
- `server/orchestrator.ts`: 可复用的单 Attempt 执行入口和 effect callbacks。
- `server/agent-backends.ts`: failure/effect normalization。
- `server/application.ts`: send/history/confirmation/cancel wiring。
- `shared/transcript.ts` 和 cards contract：非秘密 Attempt summary component。

## Persistence And Migration

- ExecutionRepository 使用独立 `formatVersion: 1` JSONL record，不增加 AppState schema。
- 每条 transition 包含 taskId、attemptId（如适用）、revision、occurredAt 和 payload；完整记录换行后 append。
- 不完整尾行在恢复时忽略；中间坏行返回 `EXECUTION_HISTORY_CORRUPT`，不静默跳过。
- 旧 Session 没有 execution 文件时返回空历史，不生成伪 Task/Attempt。
- fork 不复制父 execution 文件；fork Session 通过现有 Transcript/materialization 保留可读上下文，并从新消息开始建立 Task。
- delete Session 删除对应 execution 文件；archive/complete 保留。

## Database Impact

无数据库，也不提升 AppState schema。ExecutionTask/Attempt 使用独立 `execution format v1` JSONL repository；旧 Session 没有该文件时等价空历史。格式升级必须通过版本化 reader/writer 和非破坏迁移另立变更，不得静默重写现有完整记录。

## API

- `POST /api/sessions/:id/messages` 成功 202 响应扩展：

```json
{
  "turnId": "turn-1",
  "taskId": "task-1",
  "attemptId": "attempt-1",
  "resolvedDeployment": {
    "id": "deployment-codex-primary",
    "name": "Codex Primary",
    "modelId": "gpt-5.6"
  }
}
```

- `GET /api/sessions/:id/execution-tasks?after=<cursor>&limit=<n>`：分页 Task summaries。
- `GET /api/execution-tasks/:id`：Task + ordered Attempts + redacted error chain。
- `POST /api/execution-tasks/:id/confirm-retry`：`expectedRevision`、`confirmationToken`、`inputSha256`。
- 现有 cancel turn endpoint 映射 Task active Attempt，并保持旧响应兼容。
- Transcript/WebSocket 新增 attempt 状态 summary；ExecutionRepository 是恢复事实源，临时帧不是事实源。

## Error Semantics

| Code | HTTP/async | Automatic fallback | Meaning |
| --- | --- | --- | --- |
| `PROVIDER_RATE_LIMITED` | async | clean 时允许 | Provider 限流 |
| `PROVIDER_UNAVAILABLE` | async | clean 时允许 | 连接/供应商暂不可用 |
| `MODEL_TEMPORARILY_UNAVAILABLE` | async | clean 时允许 | 模型暂不可用 |
| `ROUTE_REPLAY_CONFIRMATION_REQUIRED` | async/409 | no | 可能有副作用，等待确认 |
| `ROUTE_FALLBACK_EXHAUSTED` | async | no | 没有更多可执行候选 |
| `TASK_REVISION_CONFLICT` | 409 | no | confirmation/cancel 竞态 |
| `TASK_CANCELLED` | async | no | 用户取消，禁止 fallback |
| `EXECUTION_HISTORY_CORRUPT` | 500 | no | 完整 JSONL record 损坏 |

所有 error chain 必须按 Attempt ordinal 返回，且通过统一 redactor。

## Security

- Deployment snapshot 不保存 `credentialRef`、Secret、完整 env 或认证 header。
- input 只保存 Transcript event ID 与 SHA-256；不在 execution 文件复制 prompt。
- logger 和 error details 禁止序列化 PreparedLaunch.env。
- confirmation token 短期、Task 绑定、单次使用；成功或 state 变化后失效。

## Test Plan

- **State machine**：全部合法/非法 transitions、终态不可改、revision 冲突。
- **Allowed failures**：每个白名单错误在 clean 状态精确产生两个 Attempt。
- **Forbidden failures**：认证、配置、invalid、policy、approval、cancel 精确产生一个 Attempt。
- **Effects**：read 保持 clean；write/external → confirmed；event gap/parse → unknown；均验证确认门禁。
- **Confirmation**：幂等双击、过期 token、hash mismatch、取消与确认竞态。
- **Transport separation**：persistent → spawn 不增加 Model Attempt。
- **Recovery**：restart fold、incomplete tail、corrupt middle、resume、fork、archive、delete。
- **Security**：canary Secret 不出现在 execution/transcript/log/API；删除 Deployment 后历史 snapshot 可读。
- **Concurrency**：failure 与 cancel、双 WebSocket completion、重复 clientMessageId 只产生一个 Task 终态。

## Definition of Done

- [ ] Task/Attempt shared contracts、append-only repository 和 recovery 完成
- [ ] stable failure/effect contract 穿过 AgentBackend、Orchestrator 和 Coordinator
- [ ] 一次 automatic fallback、副作用确认、取消与候选耗尽闭环完成
- [ ] 旧 no-route Session、resume、fork 和 transport fallback 无回归
- [ ] fault-injection、concurrency、security、test/build 全部通过
- [ ] `npm --prefix cli-gui run test`、`npm --prefix cli-gui run build` 通过
- [ ] 实施记录写入 `implementation/CLI-GUI-031-*.md`
