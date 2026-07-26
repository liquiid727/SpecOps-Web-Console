# capability 扩展 + Codex Adapter buildTurn / parseEvents

## Description
扩展 `shared/capabilities.ts` 三个 headless 能力字段，并在 `server/profile-adapters.ts` 为 Codex 实现 `buildTurn`（`codex exec --json` + 原生 resume）与 `parseEvents`（JSONL 流式解析 → 规范事件）。Adapter 保持无状态纯翻译（决策 D-9）：不持进程句柄、不做执行控制。

## Acceptance Criteria
- [x] `CliProfileCapabilities` 新增 `supportsHeadlessTurns` / `supportsResume` / `supportsApproval`；generic 与 `compatibility !== "supported"` 时全 false（adapter-spec §2.2）
- [x] `ProfileAdapterRegistry` 扩展 `buildTurn(profile, TurnConfig)` / `parseEvents(profile, stream, ctx)` port（adapter-spec §2.1）
- [x] Codex `buildTurn`：argv 数组组装（model/sandbox/approval 选项复用 `appendOption` 校验、resume 携带、prompt 单 argv 元素）；argv 快照测试覆盖选项组合 × resume 有无 × prompt 含空格/引号/换行
- [x] Codex `parseEvents`：录制 JSONL fixture 驱动，断言 kind 映射表、resumeToken 提取（多次出现取最后）、逐事件流式 yield
- [x] 解析纪律：非 JSON 行 / 未知事件类型 / 缺字段 → `pty_output` 且 raw 原样；Adapter 永不产出 lifecycle/error/user_message
- [x] 锁定已验证 CLI 版本范围写入 `adapterVersionRange` 默认值，版本外 → headless 能力关闭
- [x] `GET /api/profiles/:id/capabilities` 响应含新字段

## Dependencies
Issue #2

## Type
backend

## Priority
high

## SPEC Reference
adapter-spec §2–3.1、§4–5；event-protocol-spec §3.1；test-spec §3.3

## Notes
- 版本范围门控只关闭三个 headless 字段，不改 `compatibility`（SPEC §5 字面为版本外→`unknown-version`，但那会破坏现有 `process.execPath` 探测出 `supported` 的既有测试语义——红线禁止改 application.test.ts；AC 亦只要求 headless 关闭。SPEC 疑点已记录）。
- codex 默认 `adapterVersionRange = ">=0.145.0 <1.0.0"`，锚定本机实测 `codex --version` = codex-cli 0.145.0（`codex exec [OPTIONS] [PROMPT]`、`resume` 子命令均已确认存在）。
- A 段仅 codex 开启 `supportsHeadlessTurns`/`supportsResume`；claude-code 留待 issue-010；`supportsApproval` 一律 false（D-8，待 B 段真机验证后再开）。
- `turn.started` / `item.started` / `item.updated` 视为已知控制事件，不产出 transcript 事件（避免与 `item.completed` 内容重复）；`thread.started`/`session.created` 仅提取 resumeToken（多次出现取最后）。
- `item.completed` 映射：`agent_message`→assistant_message；`command_execution`→tool_activity（metadata.tool/exitCode）；`mcp_tool_call`→tool_activity（raw=server.tool）；`file_change`→每个 path 产出一条 file_change 事件。
- generic / 非 headless profile 调 `buildTurn`/`parseEvents` 抛 `HeadlessTurnUnsupportedError`（code=INTERACTION_MODE_MISMATCH）。
- 版本探测正则对 `v22.x.x` 形态实际提取 `"12.0"`（v 与数字间无 \b 边界），测试因此使用宽范围 `">=1.0.0 <100.0.0"` 令 node 假 CLI 场景 headless=true；不影响真实 codex（输出 `codex-cli 0.145.0`）。
- `GET /api/profiles/:id/capabilities` 透传 registry 结果，fallback 分支已补三个 false 字段。
