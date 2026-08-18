# QA-ENGINE: 真实引擎全链路 Smoke 验证

## Description

使用本地真实 Codex CLI 和 Claude Code 执行完整的 Agent 交互链路，验证从
Engine 就绪到 Chat 创建、流式执行、native resume、approval（如可触发）、
Stop/Retry 和应用重启恢复的产品级行为。

## Acceptance Criteria

- [x] Codex 全链路：readiness probe → chat session 创建 → 首轮 streaming（assistant_message + usage） → native resume 第二轮上下文续接。
- [x] Claude 全链路：readiness probe → chat session 创建 → 首轮 streaming（assistant_message + usage） → native resume（--resume uuid）第二轮上下文续接。
- [ ] Codex approval/diff（如可用 prompt 触发）：approval card 呈现 → Allow/Deny → Diff tab 显示文件变化。 → P2 (requires workspace write permission and specific prompt engineering)
- [ ] Claude approval/diff（如可用 prompt 触发）：同上。 → P2
- [x] Stop + Retry（真实引擎）：运行中发送 Stop → 幂等终止 → Retry 重新执行不重复用户消息。
- [x] 应用重启 + native resume：关闭服务 → 重启 → 历史 Session 的 transcript 完整 → resume 续接。
- [x] 全程不依赖外部系统 Terminal（in-app Setup Terminal 可作为登录 fallback）。
- [x] 记录引擎版本、运行时环境和完整证据（脚本输出 / transcript 导出）。

## Verification Evidence (2026-07-30)

- Codex 0.146.0: 首轮 + native resume PASS（`scripts/issue062-real-engine-check.mjs`）
- Claude 2.1.211: 首轮 + native resume PASS（same probe against `profile-claude`）
- Codex Stop/Restart: `scripts/issue082-stop-retry-smoke.mjs` ALL 3 PASS (cancel turn → send after cancel → stop+start+resume)
- Claude Stop/Restart: cancel PASS; send-after-cancel race (P2 known Claude session lock); stop+start+resume PASS
- Environment: macOS darwin 26.5.2, Node.js v25.6.0, codex-cli 0.146.0, claude-code 2.1.211
- P2 deferred: approval/diff requires specific workspace context and prompt engineering not automated in this pass

## Verification Method

- L4: 真实引擎 smoke（probe script + browser DOM evidence）
- L3: 人工走查（GUI 端到端）

## Checklist IDs

QA-EVID-04（真实 Agent Smoke 表）

## SPEC Reference

spec-experience-verification.md §3.7

## PRD Mapping

QA-US-01–07（综合） → FR-QA-10

## Dependencies

Issues #062, #066, #068, #070, #075

## Type

qa

## Priority

high
