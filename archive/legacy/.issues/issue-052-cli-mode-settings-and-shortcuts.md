# Add Codex CLI and Claude CLI mode settings with shortcuts

## Description
在 Settings 面板中增设 CLI 模式选择器（codex-cli / claude-cli），并提供快捷键支持快速切换。模式决定默认 profile 选择和 UI 行为差异。

## Design

### CLI 模式定义
- **codex-cli**: 优先使用 adapterId === "codex" 的 profile，Codex 特有的 `--sandbox` 模式选项可见
- **claude-cli**: 优先使用 adapterId === "claude-code" 的 profile，Claude 特有的 `--permission-mode` 选项可见

### 快捷键
| 快捷键 | 动作 |
|--------|------|
| Mod+Shift+C | 切换到 Codex CLI 模式 |
| Mod+Shift+L | 切换到 Claude CLI 模式 |

### 状态管理
- 新增 preference 字段：`cliMode: "codex-cli" | "claude-cli" | "auto"`
- `auto` 模式根据当前活跃 session 的 profile adapterId 自动判断
- 模式切换影响新建会话的默认 profile 选择

### Settings UI
SettingsView 新增 "CLI Mode" section：
```tsx
<SettingsSection title={t("cliModeTitle")} description={t("cliModeDescription")}>
  <Select value={preferences.cliMode} options={[
    { value: "auto", label: t("cliModeAuto") },
    { value: "codex-cli", label: "Codex CLI" },
    { value: "claude-cli", label: "Claude CLI" }
  ]} onChange={...} />
</SettingsSection>
```

## Acceptance Criteria
- [x] Settings 面板包含 CLI Mode 选择区域
- [x] 支持 auto / codex-cli / claude-cli 三种模式
- [x] 快捷键 Mod+Shift+C 切换到 Codex，Mod+Shift+L 切换到 Claude
- [x] 模式选择持久化到 localStorage preferences
- [x] 新建会话时根据 CLI 模式预选对应 profile
- [x] 快捷键定义加入 shortcuts.ts 清单
- [x] 中英文 i18n 支持

## Affected Files
- `cli-gui/client/app/preferences.ts` (新增 cliMode 字段)
- `cli-gui/client/app/shortcuts.ts` (新增两条快捷键)
- `cli-gui/client/app/App.tsx` (快捷键监听)
- `cli-gui/client/components/SettingsView.tsx` (UI)
- `cli-gui/client/i18n.tsx` (翻译 key)

## Dependencies
None

## Type
feature / frontend

## Priority
medium

## SPEC Reference
.features/cli-structured-tui-adaptation/spec.md §2
