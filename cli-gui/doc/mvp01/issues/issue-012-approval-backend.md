# 审批后端：waiting_approval 挂起 / 超时 / 应答 + approvals 端点

## Description
实现审批执行语义（B 段）：轮次解析出 `approval_request` 后进入 waiting_approval 挂起，等待用户决策经 stdin 回写子进程；超时按 deny 处理。新增 approvals HTTP 端点。事件协议位已在 A 段预留（#2），本 Issue 只做执行与 API。

## Acceptance Criteria
- [x] Orchestrator：解析到 `approval_request`（含 approvalId）→ 轮次状态 waiting_approval，子进程保活等待（runtime-orchestrator-spec §3.4）
- [x] `respondApproval(sessionId, approvalId, decision)`：按 Adapter 提供的应答格式写 stdin，落 `approval_response` 事件（metadata.decision）
- [x] 审批超时 `SPECOS_APPROVAL_TIMEOUT_MS`（默认 300000）→ 视同 deny，落 `approval_response`（decision=deny, metadata.code=APPROVAL_TIMEOUT）<!-- 实现按 SPEC：decision="timeout"，见 Notes N1 -->
- [x] `POST /api/sessions/:id/approvals/:approvalId`（body `{decision: "allow"|"deny"}`）→ 202；非 pending 审批 → 409 `APPROVAL_NOT_PENDING`（api-spec §2.5）<!-- 实现按 SPEC：受理 200，见 Notes N2 -->
- [x] waiting_approval 期间 cancelTurn 仍可用（取消优先于审批）
- [x] `supportsApproval=false` 的 profile 不产生挂起路径（审批类输出按 pty_output 透传）
- [x] fake CLI 集成测试：allow / deny / 超时 / 审批中取消四场景
- [x] 实测确认 codex headless 审批 stdin 行为，结论回写 adapter-spec §5 开放问题；若实测不阻塞，本卡按实测调整并同步 SPEC<!-- 实测完成；红线禁改 SPEC，结论记 Notes N7 -->

## Dependencies
Issue #5

## Type
backend

## Priority
medium

## SPEC Reference
runtime-orchestrator-spec §3.4；api-spec §2.5、§3；event-protocol-spec §3（approval kinds）；test-spec §3.6

## Notes
- N1 超时 decision：卡片要求 decision=deny + metadata.code=APPROVAL_TIMEOUT；event-protocol-spec decision 枚举为 allow|deny|timeout 且 runtime-orchestrator-spec §3.4 超时路径独立。按 SPEC 为准：decision="timeout"，兼容保留 metadata.code="APPROVAL_TIMEOUT"。超时后轮次走 kill 路径以 turn-failed + error 收尾；error code 复用 TURN_TIMEOUT（api-spec 事件级错误码表无审批专用码，保守解释）。
- N2 响应码：卡片写 202，api-spec §2.5 明确 `200 { approvalId, decision }`。按 SPEC 用 200。
- N3 审批通道设计：新增可选 `TurnInput.buildApprovalResponse(approvalId, decision): string` 与 `ProfileAdapterRegistry.buildApprovalResponse(profile, ...)`。stdin 应答格式由 Adapter 声明，Orchestrator 保持 CLI 中性（无 codex/claude 字面量红线）。仅 supportsApproval=true 且 registry 实现了 buildApprovalResponse 的 profile 接线。
- N4 stdin 策略：无审批通道时 spawn 后立即 stdin.end()（维持 issue-005 防挂死行为）；有通道时保持开放以回写决定。无通道时 approval_request 事件照常透传但不挂起（防死等）。
- N5 计时记账：挂起期间暂停轮次超时计时（剩余时长记账），应答后恢复；测试用 turnTimeoutMs=300 + 挂起 500ms 验证不误报 TURN_TIMEOUT。单挂起：已有挂起审批时后续 approval_request 忽略（SPEC 未定义多挂起，保守解释）。
- N6 终端会话/无挂起轮次调 approvals 端点：统一 409 APPROVAL_NOT_PENDING（不加 interactionMode 专用检查，api-spec §2.5 未要求区分）。事件顺序：approval_response 先落盘再写 stdin（§3.4）；cancel 时 approval_response(deny) 先于 error(TURN_CANCELLED)。
- N7 codex 实测（codex-cli 0.145.0，本机已登录）：`codex exec --help` 无 `--ask-for-approval`，仅有 `--dangerously-bypass-approvals-and-sandbox` 与 `-s/--sandbox`；非交互模式无任何 stdin 审批协议（stdin 仅作 prompt 输入）。结论：codex adapter `supportsApproval:false` 维持正确，真实 registry 不实现 buildApprovalResponse，审批链路由假 registry + fake CLI 验证。红线禁改 SPEC 分册，adapter-spec §5 开放问题的回写以本 Notes 为准；claude CLI 本机未安装，其审批协议实测为 PENDING-HUMAN（归入 verification 清单）。
