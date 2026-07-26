# ChatView 结构化渲染：kind→渲染全表 + sanitize Markdown + 四态

## Description
将 `client/components/ChatView.tsx` 升级为按事件 kind 结构化渲染的对话视图：用户/助手气泡、工具活动折叠卡、错误卡、生命周期分隔线，助手消息经 sanitize 后渲染 Markdown。本 Issue 只做展示层（回放数据即可驱动），composer 交互在 #8。

## Acceptance Criteria
- [x] kind→渲染映射全表落地，含未知 kind 的中性兜底条目（frontend-spec §3.1）
- [x] 同 turnId 连续 `assistant_message` 合并为单气泡流式追加；`tool_activity` 默认折叠可展开原始输出
- [x] `lifecycle(turn-failed/cancelled/timeout)` 与对应 `error` 事件呈现为可辨识的中断态（含 error code 文案）
- [x] Markdown sanitize 策略：不渲染任何原始 HTML；链接协议白名单 http/https/mailto；不加载远程图片；代码块支持复制原文（frontend-spec §4）
- [x] XSS fixture 用例：`<script>`、`javascript:` 链接、事件属性、远程 img 全部中和（test-spec §3.7）
- [x] 四态齐备：空态引导 / 回放加载态 / 正常流式 / 错误态（frontend-spec §3.3）
- [x] 滚动策略：贴底自动跟随，用户上滚后停止跟随并显示「回到最新」
- [x] 组件测试基于规范 kind fixture（与 #2 对齐，无 legacy kind）

## Dependencies
Issue #2

## Type
frontend

## Priority
high

## SPEC Reference
frontend-spec §3–4；event-protocol-spec §3、§6（轮次事件顺序）；test-spec §3.7

## Notes
- 卡片写 MODIFY ChatView.tsx，但实际结构化渲染层位于 `TranscriptPanel.tsx` + `transcript-display.ts` 投影层；ChatView 仅为壳（header + Tabs + 懒加载 TranscriptPanel + PromptComposer），保持不动，在既有渲染文件内实现全部 AC。
- 同 turnId 连续 assistant_message 合并在投影层 `projectTranscriptEvents` 实现（沿用 pty 合并先例）；仅当两侧 `metadata.turnId` 均为 string 且相等才合并。
- sanitize 未新增依赖（红线）：react-markdown `skipHtml` + `urlTransform`（http/https/mailto 白名单）已有，本卡补 `img` 组件替换——图片一律不产生 `<img>` 元素，外链渲染为 `rel="noreferrer noopener"` 的链接文本，其余渲染为纯文本。
- 代码块复制取 `pre.textContent`（复制原文 raw，不受高亮/转义影响）。
- 滚动贴底阈值 32px，抽为 `isNearBottom` 纯函数单测（jsdom 无法真实滚动布局）；「回到最新」按钮 sticky 悬浮于列表底部。
- lifecycle 中断态判定集合为 `turn-failed`/`turn-cancelled`（event-protocol-spec §3 的 lifecycle status 枚举无独立 timeout 状态；超时表现为 error TURN_TIMEOUT + lifecycle turn-failed，error code 以 `metadata.code` 文案呈现）。
- 四态中 loading/empty/error/reconnecting 为既有 AsyncState 实现，本卡逐项验收无缺失。
- frontend-spec §3.2 的 turn-status spinner 属进行中状态交互，划归 #8（Composer chat 交互）处理。
- theme-tokens 测试禁止 components.css 出现 hex 颜色；中断态颜色使用 `var(--danger)`（全部主题均已定义），不带 hex fallback。
