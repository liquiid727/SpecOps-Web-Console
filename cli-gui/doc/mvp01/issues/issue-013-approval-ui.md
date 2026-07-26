# 审批 UI：approval 气泡 Allow / Deny + 兜底指引文案

## Description
在 ChatView 中渲染审批交互（B 段）：`approval_request` 事件呈现为带 Allow/Deny 按钮的醒目气泡，决策后按钮态更新；对不支持审批的 CLI 显示兜底指引文案。含 i18n 双语文案。

## Acceptance Criteria
- [x] `approval_request` 渲染为审批气泡：请求内容（命令/文件操作摘要）+ Allow / Deny 按钮（frontend-spec §5.4）
- [x] 点击后调 `POST /api/sessions/:id/approvals/:approvalId`，按钮进入 loading；`approval_response` 事件到达后气泡定格显示决策结果
- [x] 409 `APPROVAL_NOT_PENDING`（超时/已决策竞态）→ 气泡刷新为最终态，toast 提示已失效
- [x] 回放场景：已决策的审批对显示为静态记录（request + response 配对，approvalId 关联），无可点按钮
- [x] 悬挂审批（有 request 无 response 且轮次已结束）→ 显示为已过期
- [x] `supportsApproval=false` 时不出现审批 UI，相关输出按 pty_output 展示，composer 区域显示兜底提示（i18n key `chat.approvalFallbackHint`：建议切换 terminal 模式处理授权） <!-- 实现按 SPEC §5.4：指引文案附在失败轮次错误条目而非 composer 常驻，见 Notes N1 -->
- [x] i18n：全部新文案提供 en/zh 双语 key
- [x] 组件测试：待决/loading/定格/过期/回放五态 + 409 竞态

## Dependencies
Issue #7, Issue #12

## Type
frontend

## Priority
medium

## SPEC Reference
frontend-spec §5.4；api-spec §2.5；event-protocol-spec §3（approval 配对）；test-spec §3.7

## Notes
- N1（AC6 与 SPEC 冲突，以 SPEC 为准）：Issue 要求“composer 区域显示兜底提示”；frontend-spec §5.4 定义兜底为“轮次因权限失败时错误条目附指引文案（调整权限选择器或 Fork 为 terminal 会话）”+“挂起时 composer 提示等待审批”。实现按 SPEC：`supportsApproval === false` 且失败轮次错误事件（含 turnId）时附 `chat.approvalFallbackHint`；composer 仅在 `waiting_approval` 时显示「等待审批」提示，不常驻。
- N2（过期判定）：悬挂审批的“轮次已结束”复用 `deriveActiveTurnId` 的终态规则（同 turnId 的 error 或 lifecycle turn-* 事件），配对逻辑抽为纯函数 `buildApprovalStates`（client/transcript-display.ts）便于单测。
- N3（409 定格策略）：ChatView 对 `APPROVAL_NOT_PENDING` toast 后重抛，气泡本地定格为过期；权威最终态仍由 WS 推送的 `approval_response`（含 timeout）事件驱动配对替换。其他错误（网络等）不定格，按钮恢复可点。
- N4（approval_response 独立条目保留）：配对后未隐藏 response 条目，回放与实时同构且保持 issue-007 渲染全表断言兼容；request 气泡同时定格显示决定，信息冗余但无歧义。
- N5（只读/能力分流）：`onApprove` 仅在 chat 会话且 `supportsApproval === true` 且非只读时下发；capabilities 未加载（undefined）时既不开按钮也不显示兜底指引，避免闪烁误导。
- N6（键盘可达）：Allow/Deny 为原生 button（共用 ui/Button），Tab/Enter/Space 原生可达；气泡不自动抢焦点，不打断 composer 输入。
