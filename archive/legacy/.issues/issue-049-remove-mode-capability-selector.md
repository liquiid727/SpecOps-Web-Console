# Remove mode CapabilitySelector from Composer controls

## Description
移除 Composer 控件栏中的"模式"（Mode）选择器。当前 Codex CLI 和 Claude CLI 适配下，modes 列表通常为空或无实际效果，该选择器占用空间却不提供价值。

## Problem
从截图可见，Composer 控件栏显示了四个选择器：工作模式、权限、模式、模型。其中"模式"选择器：
- Codex 的 modes 为 `["default", "read-only", "workspace-write", "danger-full-access"]`，实质是 `--sandbox` 参数，与"权限"语义重叠
- Claude Code 的 modes 为空数组 `[]`，选择器始终不可用
- 占用了宝贵的水平空间

## Root Cause
`PromptComposer.tsx` L222 无条件渲染 mode 的 CapabilitySelector：
```tsx
<CapabilitySelector label={t("mode")} defaultLabel={t("modeDefault")} ... value={launchConfig?.mode} options={capabilities?.modes} ... />
```

## Proposed Fix

从 `PromptComposer.tsx` 的 `!chatMode` 分支中移除 mode CapabilitySelector：

```tsx
{!chatMode && <div className="composer-controls" aria-label={t("launchControls")}>
  <WorkModeSelector mode={workMode} onChange={(mode) => onWorkModeChange?.(mode)} label={t("workModeLabel")} labels={workModeLabels} />
  <CapabilitySelector label={t("permission")} ... />
  {/* mode selector removed - modes overlap with permissions semantically */}
  <CapabilitySelector label={t("model")} ... />
</div>}
```

同时在 `PromptComposerProps` 中保留 `launchConfig.mode` 字段（不删除类型），以保持后端 API 兼容性。如果后续需要恢复，只需重新添加 UI。

## Acceptance Criteria
- [x] Composer 控件栏不再显示"模式"选择器
- [x] 保留的工作模式、权限、模型三个选择器正常工作
- [x] `SessionLaunchConfig.mode` 类型和 API 字段保持不变（向后兼容）
- [x] 已有的 mode 值在 launchConfig 中不受影响（只是 UI 不再展示/修改）

## Affected Files
- `cli-gui/client/components/PromptComposer.tsx`

## Dependencies
None

## Type
ui / simplification

## Priority
medium

## SPEC Reference
Console-gaps SPEC §2
