# SPEC: Chat 流式输出与常驻会话运行时

> Technical specification derived from: `.prd/prd-chat-streaming-and-persistent-runtime.md`
> Generated: 2026-07-27 | Target: cli-gui workspace（server + shared + client）

## 1. Summary

### 1.1 What This SPEC Covers

将 cli-gui chat 模式的 codex 执行切换为每会话常驻 `codex mcp-server` 进程（消除轮间冷启动），并新增 `turn-delta` WebSocket 临时帧把 `agent_message_content_delta` 增量推到前端流式渲染；claude 适配器接入 `--include-partial-messages` 增量解析。

### 1.2 PRD Reference

- Source: `.prd/prd-chat-streaming-and-persistent-runtime.md`
- User Stories covered: US-001 ~ US-005
- Functional Requirements covered: FR-1 ~ FR-9

### 1.3 Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 流式来源 | `codex mcp-server`（stdio JSON-RPC） | 探测证实 `exec --json` 无增量；mcp-server 有 `agent_message_content_delta`，且 `codex-reply` 消灭冷启动（1.8s vs 6-7.5s），一石二鸟 |
| 常驻边界 | Orchestrator 只见 `TurnInput.runPersistent?` 闭包 + kill 句柄 | 维持 runtime-orchestrator-spec §2.1「Orchestrator 不理解 CLI 语义」；MCP 协议细节全在 adapter 层 |
| 降级策略 | 轮次开始前常驻不可用 → 同轮内自动回落现有 spawn(`exec resume`) 路径；轮中崩溃 → TURN_FAILED，下一轮回落/重建 | 上下文经 threadId rollout 落盘跨进程可续（探测证实 exec resume 可用，mcp-server 内 reply 不可跨进程） |
| delta 通道 | 新 `turn-delta` EventServerFrame，临时帧不落盘不补发 | 复用 turn-status 先例（api-spec §4.2），transcript 回放语义零改动 |
| 取消/超时 | kill 常驻进程（SIGTERM→宽限→SIGKILL），下一轮重建 | MCP request cancellation 未验证；进程级 kill 语义与现有一致，代价仅一次冷启动 |
| MCP 客户端 | 自实现 newline-delimited JSON-RPC（约 100 行） | 仅需 initialize / tools\/call / 通知解析，不新增依赖 |
| claude 常驻 | 不做，仅接 delta 解析 | PRD Non-Goal；claude 原生 `--resume` 已跨进程可用 |

## 2. Architecture

### 2.1 File Structure

```
cli-gui/
├── shared/
│   └── websocket.ts                 [MODIFY] EventServerFrame 增加 turn-delta
├── server/
│   ├── codex-mcp-runtime.ts         [NEW]    每会话常驻 mcp-server 进程管理 + 协议客户端 + 事件映射
│   ├── codex-mcp-runtime.test.ts    [NEW]    协议/映射/生命周期单测（注入 fake 子进程）
│   ├── ports.ts                     [MODIFY] TurnInput.runPersistent?、OrchestratorCallbacks.onTurnDelta?、parseOutput 增 hooks
│   ├── orchestrator.ts              [MODIFY] runTurn 双路径：persistent 优先、spawn 回落；kill 路径覆盖常驻句柄
│   ├── application.ts               [MODIFY] 组装 runPersistent 闭包；广播 turn-delta 帧；会话 stop/delete/关停释放常驻进程
│   └── profile-adapters.ts          [MODIFY] claude buildTurn 加 --include-partial-messages；parseClaudeEvents 处理 stream_event → hooks.onDelta
├── client/
│   ├── api.ts                       [MODIFY] 解析 turn-delta 帧 → onTurnDelta handler
│   ├── components/TranscriptPanel.tsx [MODIFY] 流式气泡状态机（累积/落定去重/回退占位）
│   └── styles/components.css        [MODIFY] 流式气泡光标样式
└── （测试）orchestrator.test.ts / profile-adapters.test.ts / chat-api.test.ts / TranscriptPanel.test.tsx [MODIFY]
```

### 2.2 Module Interactions（一轮 chat 的数据流，persistent 路径）

```
ChatView 发送 → POST /messages → application.submitTurn
  → orchestrator.runTurn：input.runPersistent 存在 → runtime.runTurn(handlers)
     CodexMcpRuntime（每 sessionId 一个子进程，惰性创建）
       ├─ 首轮: tools/call "codex" {prompt, cwd, model?, sandbox?, approval-policy}
       ├─ 续轮: tools/call "codex-reply" {threadId, prompt}
       ├─ 通知 agent_message_content_delta → handlers.onDelta(delta)
       │    → callbacks.onTurnDelta → WS 广播 {type:"turn-delta", turnId, delta}
       ├─ 通知 item_completed(AgentMessage/CommandExecution/FileChange…)
       │    → handlers.onEvent(ParsedTurnEvent) → appendEvent（落盘 + transcript-event 广播，语义同现状）
       └─ tools/call 响应 → TurnParseResult {resumeToken: threadId, usage}
  → finishTurn（lifecycle/turn-status 现状不变）→ 成功轮回写 resumeToken
前端 TranscriptPanel：turn-delta 累积 → 流式气泡；同 turnId assistant_message 落地 → 清空流式态（去重落定）
```

## 3. Contracts

### 3.1 shared/websocket.ts

```ts
// EventServerFrame 联合新增（临时帧：不落盘、断线不补发，同 turn-status）
| { type: "turn-delta"; turnId: string; delta: string }
```

`shared/types.test.ts` 的 EventServerFrame type 断言同步加入 `"turn-delta"`。

### 3.2 server/ports.ts

```ts
export interface TurnStreamHooks {
  /** 文本增量（临时通道，不落 transcript） */
  onDelta?(delta: string): void;
}

export interface PersistentTurnHandle {
  /** 轮次结束的解析结论（与 spawn 路径 TurnParseResult 同构） */
  result: Promise<TurnParseResult>;
  /** 取消/超时：终止承载本轮的常驻进程 */
  kill(): void;
}

export interface TurnInput {
  // ……现有字段不变……
  /** 常驻运行时路径（FR-2）；缺省走 buildCommand+parseOutput spawn 路径 */
  runPersistent?(handlers: {
    onEvent(event: ParsedTurnEvent): Promise<void>;
    onDelta(delta: string): void;
  }): PersistentTurnHandle;
  /** spawn 路径解析：新增 hooks 承载 delta（claude 流式，FR-8） */
  parseOutput(stdout: Readable, hooks?: TurnStreamHooks): AsyncGenerator<ParsedTurnEvent, TurnParseResult, void>;
}

export interface OrchestratorCallbacks {
  // ……现有字段不变……
  /** turn-delta 临时帧（api-spec §4.2 同类）；可选 */
  onTurnDelta?(sessionId: string, turnId: string, delta: string): void;
}

/** 常驻运行时启动前不可用信号：orchestrator 捕获后同轮回落 spawn 路径 */
export class PersistentRuntimeUnavailableError extends Error { readonly code = "PERSISTENT_RUNTIME_UNAVAILABLE"; }
```

`ProfileAdapterRegistry` 不改——常驻运行时是 codex 专属实现，由 application 组装期直接持有 `CodexMcpRuntime` 实例并按 `profile.adapterId === "codex"` 决定是否注入 `runPersistent`（adapter registry 仍只做无状态翻译）。

### 3.3 server/codex-mcp-runtime.ts

```ts
export interface CodexMcpRuntimeOptions {
  clock: Clock; logger: Logger;
  /** 测试注入：默认 spawn("codex", ["mcp-server"], {cwd, env}) */
  spawnProcess?(options: { command: string; args: string[]; cwd: string; env: Record<string, string> }): McpChildProcess;
}

export interface McpChildProcess {  // node ChildProcess 结构子集，便于 fake
  stdin: Writable; stdout: Readable; stderr: Readable | null;
  kill(signal?: string): void;
  once(event: "close" | "error", listener: (...args: unknown[]) => void): void;
}

export interface CodexMcpRuntime {
  /** 会话进程存活且已完成 initialize 握手 */
  isAvailable(sessionId: string): boolean;
  runTurn(sessionId: string, turn: {
    turnId: string; prompt: string; cwd: string; env: Record<string, string>;
    command: string;                    // profile.command（含用户自定义 codex 路径）
    model: string | null; sandboxMode: string | null; approvalPolicy: string | null;
    resumeToken?: string;               // 存在且进程内 thread 匹配 → codex-reply
  }, handlers: { onEvent(e: ParsedTurnEvent): Promise<void>; onDelta(d: string): void }): PersistentTurnHandle;
  /** 会话 stop/delete：终止对应进程（幂等） */
  release(sessionId: string): void;
  /** 服务关停：终止全部进程 */
  shutdown(): Promise<void>;
}
```

核心逻辑：

1. **进程生命周期**：`Map<sessionId, ProcessEntry>`；`runTurn` 时无存活 entry → spawn + `initialize` 握手（超时 10s 判失败）。spawn/握手失败 → 同步 throw `PersistentRuntimeUnavailableError`（orchestrator 回落）。进程 `close` → 清 entry；若有进行中轮次，其 `result` reject。
2. **首轮/续轮选择**：entry 内记录 `threadId`（首轮 `codex` 响应的 `structuredContent.threadId`）。`turn.resumeToken` 存在且 ≠ entry.threadId（进程重建过）→ **thread 不可跨进程恢复**，throw `PersistentRuntimeUnavailableError` 让 orchestrator 走 `exec resume` 冷路径续上下文；本轮成功后 entry 失效重建（下轮重新探测）。resumeToken 与 entry.threadId 一致 → `codex-reply`。无 resumeToken → `codex`（新线程）。
3. **通知映射**（`_meta.requestId` 关联到进行中轮次）：
   - `agent_message_content_delta` → `handlers.onDelta(msg.delta)`
   - `item_completed`：`AgentMessage`（content Text 拼接）→ `assistant_message`；`CommandExecution` → `tool_activity`（metadata.tool="command_execution"、exitCode）；`McpToolCall` → `tool_activity`；`FileChange` → 每 path 一条 `file_change`。`UserMessage` 忽略（transcript 已有提交侧 user_message）。未识别 item 类型忽略（常驻模式无 stdout 噪音降级需要，记 debug 日志）
   - `token_count` → 暂存 usage（`last_token_usage.input_tokens/output_tokens`）
   - 其余通知（`item_started`、`raw_response_item`、`mcp_startup_*`、`task_*`、`agent_message` 终帧——与 item_completed 重复）忽略
4. **轮次收尾**：tools/call 响应到达 → `result` resolve `{ resumeToken: threadId, usage }`；JSON-RPC error → reject（orchestrator 记 TURN_FAILED）。**注意**：`item_completed(AgentMessage)` 是 assistant_message 唯一来源，tools/call 响应文本不再重复产出。
5. **kill()**：对该 entry 进程 SIGTERM；orchestrator 既有宽限计时器补 SIGKILL 语义由 runtime 内部实现（entry.kill 记录 → cancelGrace 由 orchestrator 层的等待 result reject 兜住即可，进程 close 时 result reject）。
6. **env**：继承 application 现算的 chat env（含 PATH 处理），不自行改写。

### 3.4 server/orchestrator.ts

`runTurn` 改为双路径（改动收敛在 spawn 段前后）：

```
if (input.runPersistent) {
  try { handle = input.runPersistent({ onEvent: 落盘+onActivity, onDelta: callbacks.onTurnDelta }) }
  catch (PersistentRuntimeUnavailableError) { handle = undefined /* 落到 spawn 路径 */ }
  if (handle) {
    turn.persistentHandle = handle          // requestTurnKill 改为优先 handle.kill()
    armTurnTimeout(...)
    try { parseResult = await handle.result }
    catch (error) { → outcome failed(TURN_FAILED, message) }
    → finishTurn（completed/cancelled/timeout 判定沿用 terminationReason 语义）
    → 成功回写 resumeToken（现状逻辑复用）
    return
  }
}
// —— 以下现有 spawn 路径不动，仅 parseOutput 传入 hooks: { onDelta: → callbacks.onTurnDelta } ——
```

`requestTurnKill`：`turn.persistentHandle ? handle.kill() : child.kill(...)`，SIGKILL 宽限逻辑对 persistent 由 runtime 进程 close → result reject 收敛（终态判定仍以 `terminationReason` 优先，保证 cancelled/timeout 语义正确）。

事件落盘时机与 spawn 路径一致：`closing || terminationReason` 后到达的事件丢弃。

### 3.5 server/application.ts

- 组装期创建 `CodexMcpRuntime` 单例（生产 spawn 真进程；测试可注入）。
- 构建 `TurnInput` 处：`profile.adapterId === "codex"` 且 capabilities.supportsHeadlessTurns → 注入 `runPersistent` 闭包（翻译 launchConfig → model/sandboxMode/approvalPolicy，复用现有选项校验）。
- `callbacks.onTurnDelta` → `publishToSubscriber(sessionId, { type: "turn-delta", turnId, delta })`。
- 会话 stop / delete / `close()` 关停链路 → `runtime.release(sessionId)` / `runtime.shutdown()`（挂到现有 orchestrator stop/shutdown 调用点之后，FR-6）。

### 3.6 server/profile-adapters.ts（claude 流式，FR-8）

- `buildTurn`（claude 分支）args 追加 `--include-partial-messages`。
- `parseEvents` 签名增 `hooks?: TurnStreamHooks` 透传至 `parseClaudeEvents`。
- `mapClaudeLine`：新增 `event.type === "stream_event"` 分支——`event.event.type === "content_block_delta" && event.event.delta?.type === "text_delta"` → `hooks?.onDelta(text)`，一律不产出 transcript 事件（含其他 stream_event 子型：直接 return，不降级 pty_output——增量帧是已知高频噪音）。
- codex 的 `parseCodexEvents` 不变（exec 路径无增量，探测证实）。

### 3.7 client/api.ts + TranscriptPanel.tsx

- api.ts：`frame.type === "turn-delta"` → `handlers.onTurnDelta?.(frame.turnId, frame.delta)`。
- TranscriptPanel（events socket 的持有者）：
  - state：`stream: { turnId: string; text: string } | undefined`
  - `onTurnDelta(turnId, delta)`：`turnId` 不同则重置后累积，相同则追加。
  - 清空条件：① 收到 `assistant_message` transcript 事件且 `metadata.turnId === stream.turnId`（最终落定，去重）；② turn-status 终态（completed/failed/cancelled）。
  - 渲染（列表末尾，替代/退化关系）：`stream?.text` 非空 → 流式气泡（assistant 样式 + 闪烁光标，标 `data-streaming`）；否则 `turnPending` → 现有 `TurnPendingIndicator`。断线重连无补发 → stream 为空 → 自然回退占位（US-004 AC3）。
  - 贴底跟随 effect 依赖加入 stream 文本长度。
- CSS：`.transcript-event.streaming` 光标 `▍` 闪烁动画。

## 4. Error Handling

| 场景 | 处理 | 用户可见 |
|------|------|---------|
| mcp-server spawn/握手失败 | `PersistentRuntimeUnavailableError` → 同轮回落 spawn(`exec`/`exec resume`) 路径 | 无感（仅该轮回到冷启动速度） |
| 常驻进程轮中崩溃 | `handle.result` reject → 现有 `TURN_FAILED` 收尾（lifecycle+error 事件、turn-status 帧） | 失败气泡 + 重试按钮（现有 UI）；重试轮自动重建/回落 |
| threadId 跨进程（服务重启后首轮） | runtime 探测 entry.threadId 不匹配 → 抛不可用 → `exec resume` 冷路径续上下文 | 该轮冷启动速度，上下文不丢 |
| 取消/超时 | kill 常驻进程 → result reject 被 `terminationReason` 判定拦截为 cancelled/timeout（语义同现状） | 现有取消/超时提示 |
| tools/call 返回 JSON-RPC error | result reject → TURN_FAILED，message 取 error.message | 失败气泡 |
| turn-delta 与最终消息竞态 | 前端以 assistant_message(turnId) 到达为清空信号，最终内容以 transcript 事件为准 | 无重复气泡 |

## 5. Testing Strategy

| US/FR | Test | Type | 说明 |
|-------|------|------|------|
| US-001/FR-1 | shared/types.test.ts EventServerFrame 断言 | type | 加 "turn-delta" |
| US-001/FR-3 | chat-api.test.ts：WS 收到 turn-delta 帧序 + 不落盘 | integration | fake adapter 触发 onDelta |
| US-002/FR-2 | codex-mcp-runtime.test.ts：握手→codex→codex-reply 复用；threadId 回写 | unit | 注入 fake McpChildProcess（脚本化 JSON-RPC 应答） |
| US-002/FR-9 | orchestrator.test.ts：persistent 取消/超时 → kill 调用 + cancelled/timeout 终态 | unit | fake runPersistent |
| US-003/FR-5 | orchestrator.test.ts：runPersistent 抛不可用 → 同轮 spawn 回落产出相同事件序 | unit | |
| US-003 | codex-mcp-runtime.test.ts：进程 close → result reject；下一轮重建 | unit | |
| US-004/FR-7 | TranscriptPanel.test.tsx：增量累积渲染、assistant_message 落定清空去重、无增量回退 TurnPendingIndicator | component | |
| US-005/FR-8 | profile-adapters.test.ts：claude args 含 --include-partial-messages；stream_event(text_delta) → onDelta 且不产 transcript 事件 | unit | fixture 流 |
| 回归 | 既有 orchestrator/chat-api/TranscriptPanel 套件全绿 | — | spawn 路径行为零变化 |

## 6. Implementation Order

1. shared 契约（websocket.ts + types.test.ts）
2. ports.ts 接口扩展（TurnStreamHooks / runPersistent / onTurnDelta / 错误类）
3. codex-mcp-runtime.ts + 单测（纯新增，可独立验证）
4. orchestrator.ts 双路径 + 单测
5. application.ts 接线（runtime 实例、runPersistent 注入、turn-delta 广播、释放链路）
6. profile-adapters.ts claude delta + 单测
7. 客户端 api.ts / TranscriptPanel.tsx / CSS + 组件测试
8. 全量 vitest + tsc + 浏览器端到端实测（chat 会话观察流式输出与二轮提速）

## 7. Risks & Assumptions

| Risk | Impact | Mitigation |
|------|--------|-----------|
| mcp-server 标记非 experimental 但事件 schema 可能随版本漂移 | 映射失效 | 未识别通知忽略 + debug 日志；adapterVersionRange 已锁 >=0.145.0 <1.0.0 |
| `config`/参数传递方式与 argv 语义差异（[Assumption] 探测仅验证 sandbox/approval-policy 顶层参数） | 选项失效 | 实现时以 tools/list schema 顶层参数（model/sandbox/approval-policy/cwd/config）传入；单测锁定组装结果 |
| 常驻进程内存驻留（每 chat 会话一个 codex 进程） | 资源占用 | 会话 stop/delete 即释放；空闲回收列为 PRD Open Question 不在本期 |
| claude 端到端未实测（本机二进制损坏） | 增量格式偏差 | fixture 基于 Claude Code 公开 stream-json 格式；解析未匹配时静默忽略，不影响最终消息 |
