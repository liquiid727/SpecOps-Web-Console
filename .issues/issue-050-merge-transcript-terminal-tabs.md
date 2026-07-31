# Merge transcript/terminal tabs into unified view toggle

## Description
将 ChatView header 中的"会话记录"和"终端"两个 Tab 合并为一个更紧凑的视图切换控件（segmented toggle button 或 icon-only toggle），减少 header 的视觉占用。

## Problem
从截图可见，header 右侧的 `<Tabs>` 组件包含"会话记录"和"终端"两个标签页，与旁边的状态 Badge、恢复/停止按钮一起显得拥挤。这两个选项本质是一个二态切换，不需要完整的 Tabs 组件。

## Current Implementation
`ChatView.tsx` L171:
```tsx
<Tabs className="view-tabs" ariaLabel={t("centerView")} value={centerView} onChange={onCenterViewChange}
  items={[
    { id: "transcript", label: <><Icon name="panel" />{t("transcript")}</> },
    { id: "terminal", label: <><Icon name="terminal" />{t("terminal")}</> }
  ]}
/>
```

## Proposed Fix

替换为 icon-only segmented toggle button：

```tsx
<div className="center-view-toggle" role="radiogroup" aria-label={t("centerView")}>
  <button
    type="button"
    role="radio"
    aria-checked={centerView === "transcript"}
    className={`toggle-item${centerView === "transcript" ? " active" : ""}`}
    onClick={() => onCenterViewChange("transcript")}
    title={t("transcript")}
  >
    <Icon name="panel" />
  </button>
  <button
    type="button"
    role="radio"
    aria-checked={centerView === "terminal"}
    className={`toggle-item${centerView === "terminal" ? " active" : ""}`}
    onClick={() => onCenterViewChange("terminal")}
    title={t("terminal")}
  >
    <Icon name="terminal" />
  </button>
</div>
```

配套 CSS：
```css
.center-view-toggle {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.center-view-toggle .toggle-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.center-view-toggle .toggle-item:hover { background: var(--surface-hover); }
.center-view-toggle .toggle-item.active {
  background: var(--bg-subtle);
  color: var(--text);
}
.center-view-toggle .toggle-item svg { width: 16px; height: 16px; }
```

## Acceptance Criteria
- [x] 两个 tab 合并为紧凑的 icon-only segmented toggle
- [x] Toggle 保持无障碍属性（role="radiogroup"、aria-checked）
- [x] 视觉上占用空间显著减少（从文字标签到纯图标）
- [x] 切换行为与现有 Tabs 完全一致
- [x] 支持键盘导航（ArrowLeft/Right 切换）

## Affected Files
- `cli-gui/client/components/ChatView.tsx`
- `cli-gui/client/styles/qoder.css`

## Dependencies
None

## Type
ui / enhancement

## Priority
medium

## SPEC Reference
Frontend-spec §2
