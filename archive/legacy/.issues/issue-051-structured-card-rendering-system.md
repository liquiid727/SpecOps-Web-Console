# Implement structured card rendering system for Transcript

## Description
实现 Transcript 面板的结构化卡片渲染系统，将 CLI 输出的不同事件类型（tool_activity、file_change、assistant_message、pty_output）解析为独立的 UI 卡片组件，提供类似 Zcode 的结构化对话体验。

## Motivation
当前 TranscriptPanel 对所有事件类型使用简单的 `<details>` + `<pre>` 渲染，信息密度低且缺乏视觉层次。结构化卡片可以：
- 明确区分 thinking / tool use / code output / message 的视觉层级
- 提供折叠/展开的信息密度控制
- 为 code block 提供语法高亮和一键复制
- 为 tool activity 提供状态指示（running/success/error）

## Design

### 卡片类型
1. **ThinkingCard** - 折叠面板，灰色背景，展开查看完整思考过程
2. **ToolUseCard** - 工具名称标签 + 状态指示 + 折叠输入输出
3. **CommandCard** - 终端风格背景 + 命令文本 + exit code badge
4. **CodeBlockCard** - 语法高亮 + 语言标签 + 一键复制
5. **FileChangeCard** - 文件路径 + 操作类型 badge + diff 入口
6. **MessageCard** - Markdown 渲染 + 时间戳
7. **UserMessageCard** - 右对齐纯文本气泡

### 组件结构
```
client/components/cards/
├── index.ts
├── CardParser.ts
├── StructuredCard.tsx
├── ThinkingCard.tsx
├── ToolUseCard.tsx
├── CommandCard.tsx
├── CodeBlockCard.tsx
├── FileChangeCard.tsx
├── MessageCard.tsx
└── UserMessageCard.tsx
```

### 解析管线
```
TranscriptEvent[] → CardParser.parse() → StructuredCard[] → CardRenderer
```

CardParser 根据 event.kind + metadata 分类：
- `tool_activity` + `metadata.tool === "command_execution"` → CommandCard
- `tool_activity` (其他) → ToolUseCard
- `assistant_message` + code fence → CodeBlockCard (内嵌到 MessageCard)
- `file_change` → FileChangeCard
- `user_message` → UserMessageCard
- 默认 → MessageCard

## Acceptance Criteria
- [x] 新建 `client/components/cards/` 目录，含所有卡片组件
- [x] CardParser 正确将 TranscriptEvent 分类为对应卡片类型
- [x] TranscriptPanel 在 chat 模式下使用新的卡片系统渲染
- [x] 每种卡片支持折叠/展开交互
- [x] CodeBlockCard 支持语法高亮（至少 JS/TS/Python/Shell）
- [x] 所有卡片支持一键复制内容
- [x] ToolUseCard 显示状态指示（来自 metadata.exitCode）
- [x] 保持向后兼容：非 chat 模式仍使用现有渲染
- [x] 单元测试覆盖 CardParser 逻辑
- [x] 中英文 i18n 支持

## Affected Files
- `cli-gui/client/components/cards/` (新建目录)
- `cli-gui/client/components/TranscriptPanel.tsx` (集成)
- `cli-gui/client/styles/qoder.css` (卡片样式)

## Dependencies
Issues #046-050 (A 层 UI 修复先行)

## Type
feature / frontend

## Priority
high

## SPEC Reference
.features/cli-structured-tui-adaptation/spec.md §1
