# QA-CHAT: Chat 流式渲染、Agent 控制与结构化卡片验证

## Description

验证 Chat 模式下的流式消息渲染、结构化事件卡片、轮次控制（Stop/Retry/Approval）、
滚动行为、Terminal 切换和 native resume 在产品级使用中行为正确。

## Acceptance Criteria

- [x] Composer 的 Enter 发送、Shift+Enter 换行、发送中禁用态和草稿保留符合预期。
- [x] 流式 Assistant 消息即时出现；delta 不逐 token 更新全局状态。
- [x] Tool、Command、File Change、Progress、Approval、Lifecycle、Error 事件按语义卡片渲染。
- [x] 结构化卡片支持展开/折叠、复制、代码阅读和文件变化到 Diff 的跳转。
- [x] 原始/工具详情默认折叠，不干扰主对话流。
- [x] Stop 运行中轮次幂等；无重复执行。
- [ ] Retry 失败轮次不重复用户消息；明确重试语义。 → P2 (retry UI present but no real-engine evidence of failed turn to retry)
- [x] Approval Allow/Deny 只生效一次；过期/已决策卡片冻结。
- [x] 用户手动滚动时不自动跳回；提供 “Back to latest” 按钮。
- [x] Chat ↔ Terminal 视图切换不创建重复 PTY 或 Session。
- [x] Terminal Fallback 明确说明打开原因并可返回 Chat。

## Verification Evidence (2026-07-30)

- E2E: multi-turn + cancel-turn + Terminal tab + reload-replay all PASS in B-gate smoke chain.
- L4: `issue082-stop-retry-smoke.mjs` codex cancel PASS; claude cancel PASS (race on immediate re-send documented as P2).
- L3: browser DOM confirmed user_message/assistant_message/usage-footnote structure, structured cards with data-card-type attributes.
- Approval: tested via chat-api.test.ts approval path (unit, not real-engine trigger).
- [x] Native resume 成功时显示继续原上下文；失败时保留历史并提供新上下文路径。
- [x] 完成、失败、审批等待状态有明显状态入口或通知。

## Verification Method

- L1: 自动化回归（unit tests）
- L2: E2E scripts（结构化事件回放）
- L3: 人工走查 + 截图/录屏
- L4: 真实引擎 smoke（codex + claude chat turn）

## Checklist IDs

QA-CHAT-01, QA-CHAT-02, QA-CHAT-03, QA-CHAT-04, QA-CHAT-05, QA-CHAT-06, QA-CHAT-07, QA-CHAT-08

## SPEC Reference

spec-experience-verification.md §3.3

## PRD Mapping

QA-US-03, QA-US-04 → FR-QA-4, FR-QA-5, FR-QA-6

## Dependencies

Issues #062, #067, #068, #070

## Type

qa

## Priority

high
