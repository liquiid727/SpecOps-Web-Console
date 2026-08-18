# PRD: Chat 流式输出与常驻会话运行时

> 产物路径按 `.specos/manifest.yaml` `artifacts.draftsDir` 落 `.prd/`（替代 skill 旧默认 `tasks/`）。
> 来源：cli-gui chat 模式响应慢诊断结论（每轮冷启动 6-7.5s、无流式、整段回答一次性出现）。
> 用户已拍板：1) 必须做成流式；2) 消除每轮重新启动 CLI 进程的开销。

## 1. Introduction / Overview

cli-gui 的 chat 模式当前每轮对话都重新 spawn 一次 `codex exec --json` 子进程，且该模式下 codex 不输出任何文本增量事件，导致：① 每轮固定 1s+ 进程冷启动开销；② 用户在 6-7.5s 内只能看到"正在生成"占位，回答整段瞬间出现，等待感被显著放大。

本特性将 chat 模式的 codex 执行方式切换为**常驻 `codex mcp-server` 进程**（每个 chat 会话一个，跨轮复用），并把其 `agent_message_content_delta` 增量事件经 WebSocket 实时推送到前端，实现打字机式流式渲染。claude-code 适配器同步接入其原生流式能力（`--include-partial-messages`）。

**探测已验证的事实（2026-07-27，codex 0.145.0）：**

- `codex exec --json`：无 agent_message 增量事件，无可用 feature flag → 流式在该模式下不可行。
- `codex mcp-server`（stdio JSON-RPC）：提供 `codex`（新线程）/`codex-reply`（threadId 续聊）两个工具；轮次期间以通知形式推送 `agent_message_content_delta`（逐 token）、`item_started/item_completed`、`task_complete`、`token_count` 等事件。
- 常驻进程内第二轮耗时 **1.8s**（对比冷启动 6-7.5s）。
- threadId **不能跨进程**恢复（新 mcp-server 进程内 `codex-reply` 返回 "Session not found"）；但 codex 将会话 rollout 落盘，`codex exec resume <threadId>` 冷路径可跨进程续聊（现有代码已使用）。

## 2. Goals

- chat 模式下 codex 回答以流式增量渲染，首 token 出现即替代"正在生成"占位。
- 同会话第 2 轮起消除 CLI 进程冷启动，轮次端到端延迟从 6-7.5s 降至 ≤3s（短回答，以探测数据 1.8s 为基准留余量）。
- 常驻进程异常退出时自动降级为现有单轮 `exec resume` 冷路径，会话上下文不丢失。
- 不破坏既有契约：transcript 持久化仍只落最终 `assistant_message` 事件；断线重连回放语义不变。

## 3. User Stories

### US-001: 流式增量传输通道
**Description:** As a chat 用户, I want 助手回答的文本增量实时推到浏览器 so that 我能立刻看到生成进度而不是等整段。

**Acceptance Criteria:**
- [ ] events WebSocket 通道新增 `turn-delta` 帧（`{ type, turnId, delta }`），与 `turn-status` 同为临时帧：不落盘、断线不补发
- [ ] 最终 `assistant_message` transcript 事件仍照常持久化并广播（回放完整性不变）
- [ ] shared 类型测试更新并通过
- [ ] Typecheck 通过

### US-002: codex 常驻会话运行时
**Description:** As a chat 用户, I want 同一会话的多轮对话复用一个常驻 codex 进程 so that 第二轮起没有冷启动等待。

**Acceptance Criteria:**
- [ ] 每个 chat 会话首轮惰性启动一个 `codex mcp-server` 子进程并跨轮驻留；首轮用 `codex` 工具，后续轮用 `codex-reply(threadId)`
- [ ] threadId 回写为会话 resumeToken（沿用现有"成功轮才回写"语义）
- [ ] 会话 stop/删除/服务关停时常驻进程被终止（无孤儿进程）
- [ ] 轮次超时/取消沿用现有 kill 语义（SIGTERM→宽限→SIGKILL 作用于常驻进程），进程死后下一轮自动重建
- [ ] 单元测试覆盖：多轮复用、取消、超时、进程崩溃恢复
- [ ] Typecheck 通过

### US-003: 常驻进程崩溃降级
**Description:** As a chat 用户, I want 常驻进程意外退出后对话仍能继续 so that 稳定性不因新架构下降。

**Acceptance Criteria:**
- [ ] 常驻进程不可用（启动失败/中途崩溃）时，下一轮自动走现有 `codex exec --json resume <threadId>` 单轮冷路径，上下文延续
- [ ] 崩溃当轮以现有 `TURN_FAILED` 语义收尾（lifecycle + error 事件 + turn-status 帧），不悬挂
- [ ] 单元测试覆盖降级路径

### US-004: 前端流式气泡渲染
**Description:** As a chat 用户, I want 助手气泡随增量逐步长出文本 so that 体验与主流 AI 对话产品一致。

**Acceptance Criteria:**
- [ ] 首个 `turn-delta` 到达后，"正在生成"占位替换为流式气泡，文本随增量追加（计时器保留）
- [ ] 同 turnId 的最终 `assistant_message` transcript 事件到达后，流式气泡无缝落定为持久气泡（无重复、无闪烁）
- [ ] 断线重连后无增量补发时回退为现有"正在生成"占位（由事件流推导），最终消息到达仍正确落定
- [ ] 组件测试覆盖：增量累积、落定去重、无增量回退
- [ ] Typecheck 通过
- [ ] 浏览器实测验证（chat 会话可见逐步输出）

### US-005: claude-code 流式解析
**Description:** As a claude 用户, I want claude 适配器同样输出增量 so that 两大主力 CLI 体验一致。

**Acceptance Criteria:**
- [ ] claude buildTurn 追加 `--include-partial-messages`，解析 `stream_event`（`text_delta`）为增量回调
- [ ] 最终 assistant 帧仍映射为持久 `assistant_message`（现有语义不变），增量与终帧不重复计入 transcript
- [ ] 基于 fixture 的单元测试通过（本机 claude 二进制损坏，不做端到端实测，标注于风险）

## 4. Functional Requirements

- FR-1: 系统必须在 events WebSocket 通道上定义 `turn-delta` 临时帧（turnId + delta 文本），不写入 transcript 存储。
- FR-2: codex 适配器必须提供常驻运行时：每 chat 会话一个 `codex mcp-server` 子进程，首轮 `codex` 工具、后续轮 `codex-reply`。
- FR-3: 常驻运行时必须把 `agent_message_content_delta` 通知转换为增量回调并触发 `turn-delta` 帧广播。
- FR-4: 常驻运行时必须把轮次内结构化通知映射为既有规范事件（assistant_message / tool_activity / file_change），映射语义与现有 `exec --json` 解析一致。
- FR-5: 系统必须在常驻进程不可用时自动降级为现有单轮 `exec resume` 冷路径。
- FR-6: 会话 stop、删除与服务关停必须同步终止对应常驻进程。
- FR-7: 前端必须在收到首个 `turn-delta` 后渲染流式气泡，并在最终 assistant_message 事件到达后落定去重。
- FR-8: claude 适配器必须解析 `--include-partial-messages` 的 text_delta 为增量回调。
- FR-9: 轮次取消/超时必须终止常驻进程当前轮（kill 进程可接受），且下一轮可自动重建。

## 5. Non-Goals (Out of Scope)

- terminal（PTY）模式不做任何改动。
- 不做 claude 的常驻进程模式（仅 codex；claude 保持单轮 spawn + 原生 resume）。
- 不持久化增量（transcript 仍只存最终消息；回放不重现打字机效果）。
- 不做 reasoning/思维链增量展示（仅 agent_message 文本增量）。
- 不改造审批（approval）流程在常驻模式下的语义（codex chat 现状 supportsApproval=false，维持）。
- 不引入 `codex app-server`/`exec-server`（标记 experimental 且协议未稳定）。

## 6. Technical Considerations

- 常驻进程集成点：`ProfileAdapterRegistry` 新增可选 port，Orchestrator ChatWorker 优先走常驻运行时、缺省回落现有 spawn 路径——保持"Orchestrator 不理解 CLI 语义"的边界（runtime-orchestrator-spec §2.1）。
- `turn-delta` 帧复用 `turn-status` 的"临时帧"先例（api-spec §4.2：不承载回放语义、断线不补发）。
- MCP JSON-RPC 客户端自实现（newline-delimited JSON over stdio，仅需 initialize/tools\/call/通知解析），不新增依赖。
- [Assumption] mcp-server 的 `codex` 工具经 `config` 参数传入 model/sandbox/approval-policy，与现有 argv 选项映射等价。
- [Assumption] 取消轮次通过 kill 常驻进程实现（MCP request cancellation 未验证）；代价是下一轮走一次冷启动重建，可接受。

## 7. Success Metrics

- 同会话第 2 轮短回答端到端 ≤3s（现状 6-7.5s）。
- 首增量出现时间 ≈ CLI time_to_first_token（探测值 4.7s 内含首轮线程创建；热轮次应显著更短）。
- 现有测试套件全绿；transcript 回放行为零回归。

## 8. Open Questions

- mcp-server 长时间空闲是否需要回收（本期不做空闲回收，随会话 stop 释放）？
- codex 未来版本若为 `exec --json` 补充 delta 事件，是否退役 mcp-server 路径（留待版本观察）？
