# Claude Adapter（stream-json + resume）+ Generic 降级

## Description
按 Codex Adapter 相同的 port 为 Claude 实现 `buildTurn`（`claude -p --output-format stream-json`）与 `parseEvents`，并确认 Generic profile 的 terminal-only 降级路径完整（headless 能力全 false → 创建 chat 会话被服务端降级）。

## Acceptance Criteria
- [x] Claude `buildTurn`：`-p --output-format stream-json --verbose` 组装；`--permission-mode`/`--model` 复用现有 appendOption 校验；resume 走 `--resume <sessionId>`（adapter-spec §3.2）
- [x] Claude `parseEvents`：stream-json fixture 驱动，kind 映射（assistant/text→assistant_message、tool_use→tool_activity 等）、session_id 提取为 resumeToken
- [x] Claude capability：`supportsHeadlessTurns/supportsResume/supportsApproval` 按 adapter-spec §2.2 表生效，版本范围外自动关闭
- [x] Generic profile：三能力恒 false；创建 chat 会话 → 服务端降级 terminal + `interactionModeDowngraded: true` 全链路可用（API→UI 提示）
- [x] 解析纪律与 Codex 一致：未知输出 → `pty_output`，raw 保留
- [x] fake CLI 集成测试：Claude 多轮 + resume 场景；argv 快照测试
- [ ] 真实 Claude CLI 手工冒烟一次并记录版本（完整验证归 #17） <!-- BLOCKED: 本机未安装 claude CLI（claude --version 不存在），已记 PENDING-HUMAN，见 verification/a-gate.md 清单；自动化部分以 fake claude CLI 集成测试覆盖 -->

## Dependencies
Issue #5

## Type
backend

## Priority
medium

## SPEC Reference
adapter-spec §3.2–3.3；api-spec §2.6（降级）；test-spec §3.3

## Notes
- claude-code 默认已验证版本范围保守锁定为 `>=2.0.0 <3.0.0`（本机无 claude，无法实测真实版本；待真机冒烟后按需调整，PENDING-HUMAN）。
- stream-json `user` 帧（tool_result 回显）跳过不产事件——保守决策，对齐 codex 侧跳过 `item.started` 的先例，避免 transcript 重复回显用户/工具内容。
- claude 无 sandbox/mode 概念：`mode` 选项对 claude 传 `undefined` flag，值非空即抛 `UnsupportedCliOptionError`（claude capability 的 modes 列表为空，白名单校验自然拒绝）。
- `system` 帧仅提取 `session_id`（不产事件）；无 session_id 的 system 帧按解析纪律降级 `pty_output`；session_id 多帧取最后一次出现。
- UI 降级一次性提示实现在 `App.createSession`（feedback.warning + i18n key `sessionDowngradedToTerminal`）；issue-015 创建流内的事前能力提示为另一层，不冲突。
- fake claude CLI 集成测试使用真实 `createProfileAdapterRegistry()`（capabilities 探测 `node --version` 落入宽范围 `>=1.0.0 <100.0.0`），验证 API→adapter→orchestrator→transcript 全链路而非 mock。
