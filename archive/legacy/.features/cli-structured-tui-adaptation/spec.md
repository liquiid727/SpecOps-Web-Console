# CLI Structured TUI Adaptation

## ID
SPECOS-TUI-001

## Status
Draft

## Summary
将 Codex CLI 和 Claude CLI 的 JSONL 结构化输出解析为独立 UI 卡片组件，提供类似 Zcode 的结构化对话体验，同时增设 CLI 模式快捷切换、模型自动同步以及优化会话创建流程。

## Motivation
当前 CLI GUI 的 Transcript 面板对 CLI 输出的渲染过于原始：
- `tool_activity` 仅显示为折叠的纯文本 details
- `assistant_message` 的 Markdown 渲染缺乏卡片化视觉层次
- `pty_output` 大段文本缺乏语义分段
- 模型列表需要手动管理，缺乏自动同步
- 会话创建流程步骤过多，不够流畅

参考 Zcode 的 Agent Runtime UI 实现，将 CLI 输出解析为语义化卡片，提升信息密度和可读性。

## Design

### 1. 结构化卡片渲染系统

#### 1.1 卡片类型定义

| 卡片类型 | 数据来源 | 视觉特征 |
|---------|---------|---------|
| ThinkingCard | assistant_message (metadata.thinking=true) 或 stream_event text_delta | 折叠面板，灰色背景，斜体文本，展开可查看完整思考过程 |
| ToolUseCard | tool_activity | 工具名称标签 + 状态指示（running/success/error）+ 折叠输入输出 |
| CommandCard | tool_activity (metadata.tool="command_execution") | 终端样式背景 + 命令文本 + exit code badge |
| CodeBlockCard | assistant_message 内的 code fence | 语法高亮 + 语言标签 + 一键复制 + 行号（可选） |
| FileChangeCard | file_change | 文件路径 + 操作类型 badge（create/modify/delete）+ diff 预览入口 |
| MessageCard | assistant_message（非 code/thinking） | Markdown 渲染 + 头像 + 时间戳 |
| UserMessageCard | user_message | 右对齐气泡，纯文本 |

#### 1.2 解析管线

```
TranscriptEvent[] → CardParser → StructuredCard[] → CardRenderer
```

- **CardParser**: 根据 event.kind + metadata 分类，合并同 turnId 的连续事件
- **StructuredCard**: 统一接口，包含 type、turnId、timestamp、content、metadata
- **CardRenderer**: 按 type 分发到对应卡片组件

#### 1.3 组件结构

```
client/components/cards/
├── index.ts
├── CardParser.ts          # 事件 → 卡片转换逻辑
├── StructuredCard.tsx     # 卡片容器 + 分发
├── ThinkingCard.tsx
├── ToolUseCard.tsx
├── CommandCard.tsx
├── CodeBlockCard.tsx
├── FileChangeCard.tsx
├── MessageCard.tsx
└── UserMessageCard.tsx
```

### 2. CLI 模式设置与快捷键

#### 2.1 模式定义

- **codex-cli**: 使用 Codex CLI 的 `exec --json` 协议
- **claude-cli**: 使用 Claude Code 的 `-p --output-format stream-json` 协议

模式决定：
- 默认 profile 选择
- composer 展示的 capability 选项
- 结构化卡片的解析策略差异

#### 2.2 快捷键

| 快捷键 | 动作 | 条件 |
|--------|------|------|
| Mod+Shift+C | 切换到 Codex CLI 模式 | 存在 codex adapter profile |
| Mod+Shift+L | 切换到 Claude CLI 模式 | 存在 claude-code adapter profile |

#### 2.3 Settings 面板增设

SettingsView 新增 "CLI Mode" section：
- 当前活跃模式指示
- Profile 关联配置
- 默认模型设置

### 3. 模型列表自动同步

#### 3.1 同步流程

```
Profile 创建/变更 → 触发 capability detection
→ CLI --version 成功 → 尝试 model list 探测
→ 解析 model ids → 写入 profile.syncedModels
→ 前端 capability 返回包含最新 models 列表
```

#### 3.2 API 端点

```
POST /api/profiles/:id/sync-models
→ 200 { models: string[], syncedAt: string }
→ 409 { code: "SYNC_IN_PROGRESS" }
→ 502 { code: "CLI_UNAVAILABLE" }
```

#### 3.3 前端联动

- Capability 探测返回时自动更新 model Select 选项
- Session 的 activeModel 从 profile 可用列表中选择
- Profile 切换时继承上次 model 偏好（存 localStorage）

### 4. 会话创建流程优化

#### 4.1 快速创建模式

QuestHome 升级为 "Quick Start" 体验：
- 输入框直接创建：输入内容 → 自动选取最近 workspace + 默认 profile → 创建会话
- Profile 快速切换：composer 旁小 chip 显示当前 profile，点击弹出轻量选择器
- Workspace 快速选择：显示最近使用的 3 个 workspace 快速入口

#### 4.2 模板系统（预留）

未来支持创建时选择 prompt 模板（code review / debug / implement 等），当前阶段仅预留接口。

## Dependencies
- issue-046 ~ issue-050（A 层 UI 修复先行）
- 现有 profile-adapters.ts 的 parseCodexEvents / parseClaudeEvents

## Acceptance Criteria
- [ ] Transcript 面板在 chat 模式下以结构化卡片展示 assistant_message、tool_activity、file_change
- [ ] 卡片支持折叠/展开、一键复制、语法高亮
- [ ] Settings 增加 CLI 模式选择，快捷键可切换
- [ ] Model 列表创建会话时自动从 CLI 同步
- [ ] 会话创建从 QuestHome 可一键完成
- [ ] 所有交互支持中英文 i18n
- [ ] 新增组件覆盖单元测试
