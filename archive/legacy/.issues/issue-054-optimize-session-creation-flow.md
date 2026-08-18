# Optimize session creation and conversation opening flow

## Description
优化会话创建与开启对话流程，参考 Zcode 的快速启动体验：一键创建 + 自动聚焦输入 + 简化操作步骤。当前 QuestHome 和 NewSessionDialog 的创建流程步骤过多，需要精简为 inline 快速创建模式。

## Current Pain Points
1. 创建新会话需要打开 Dialog → 选择 workspace → 选择 profile → 命名 → 确认
2. QuestHome 的快速创建虽存在但不够突出
3. 没有最近 workspace/profile 快速入口
4. 创建后不自动聚焦到 composer 输入框

## Design

### Quick Create Mode
QuestHome 升级为 "Quick Start" 体验：

1. **Primary Action**: 一个大输入框，输入内容直接创建会话
   - 自动使用最近的 workspace + 默认 profile
   - Enter 即创建并发送首条消息

2. **Context Bar**: 输入框上方显示当前选择的 workspace/profile
   - 点击 workspace chip → 弹出最近 3 个 workspace 快速选择
   - 点击 profile chip → 弹出可用 profile 快速选择
   - 一切在 inline 完成，不弹 dialog

3. **Auto Focus**: 创建成功后自动切换到 chat view 并聚焦 composer

### Simplified Dialog (保留为高级入口)
NewSessionDialog 降级为"高级创建"入口：
- 从 QuestHome 的"更多选项"链接打开
- 保留完整的配置能力（命名、分支选择等）

### 快捷键增强
- `Mod+N`: 聚焦 QuestHome 输入框（如已在 QuestHome）或打开快速创建
- `Enter`: 在 QuestHome 输入框中直接创建并发送

## Acceptance Criteria
- [x] QuestHome 以大输入框为主视觉，直接输入即可创建会话
- [x] 输入框上方显示当前 workspace/profile 选择 chips
- [x] Chips 点击弹出 inline popover 快速切换（不是 dialog）
- [x] 最近使用的 workspace 优先展示（最多 3 个）
- [x] 创建成功自动切换到 chat view 并聚焦 composer
- [x] Mod+N 在任何视图都能快速进入创建流程
- [x] 保留"高级创建"入口通往完整 NewSessionDialog
- [x] 空状态（无 workspace/profile）引导用户先配置

## Affected Files
- `cli-gui/client/components/QuestHome.tsx` (重构)
- `cli-gui/client/components/NewSessionDialog.tsx` (降级为高级入口)
- `cli-gui/client/app/App.tsx` (快捷键调整)
- `cli-gui/client/styles/qoder.css` (Quick Start 样式)

## Dependencies
None

## Type
feature / frontend

## Priority
high

## SPEC Reference
.features/cli-structured-tui-adaptation/spec.md §4
