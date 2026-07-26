# chat 会话 Terminal tab：pty_output 只读回放视图

## Description
为 chat 会话提供中心区 Terminal tab（B 段）：以只读方式回放该会话各轮次的 `pty_output` / 未识别原始输出，帮助排查 CLI 原始行为。切换 tab 不新建 PTY、不改变会话模式（I-3 不变式）。

## Acceptance Criteria
- [x] chat 会话中心区提供 Chat / Terminal 两个 tab；terminal 会话保持现有 xterm 视图不变（frontend-spec §2）
- [x] chat 会话的 Terminal tab：从 transcript 过滤 `pty_output` 事件按序渲染（xterm 只读或等宽文本视图），标注所属 turnId 分段
- [x] 只读约束：无输入焦点、无键盘写入路径、不建立 terminal WS 写通道
- [x] tab 切换不触发 start/spawn，不产生新事件
- [x] 轮次进行中实时追加 pty_output（走既有事件订阅，无需额外通道）
- [x] 空态：无 pty_output 时显示「本会话暂无原始 CLI 输出」
- [x] 组件测试：过滤正确性、只读性、分段标注、实时追加

## Dependencies
Issue #7

## Type
frontend

## Priority
medium

## SPEC Reference
frontend-spec §2；event-protocol-spec §3（pty_output）；domain-spec §4（I-3）

## Notes
- N1（视图形态选择）：AC 允许“xterm 只读或等宽文本视图”二选一，选等宽文本视图（新组件 `ChatTerminalReplay`）：不引入 xterm 实例即天然无输入焦点/键盘写入路径，且满足不新建 PTY 的 I-3 不变式。展示前用 `sanitizePtyOutput` 剥离 ANSI 转义避免乱码（SPEC §2 未强制保留转义字节可见）。
- N2（数据通道）：复用 `GET /transcript` 全量翻页（单页上限 200）+ 既有 events WS 订阅实时追加，未建立任何 terminal 写通道；tab 切换仅客户端渲染切换，不调 start/spawn。
- N3（分段规则）：按“连续相同 turnId”分组（抽为纯函数 `buildPtyReplaySegments` 便于单测）；无 turnId 的会话级输出标注为「会话输出」；清洗后为空的段（纯控制序列）不渲染。
- N4（terminal 会话零变更）：ChatView 分支仅对 `interactionMode === "chat"` 生效；terminal 会话的 Terminal tab 仍走原 `TerminalView`（xterm 全保真 + 停止空态），行为未动。
