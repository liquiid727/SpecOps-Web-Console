# Change Select dropdowns to upward-opening (上拉框) in Composer

## Description
Composer 底部的所有 Select 下拉菜单（权限、模型、工作模式）应改为向上展开（上拉框），因为 Composer 位于视口底部，向下展开会超出显示区域被裁切。

## Problem
从截图可见，Composer 控件栏里的 Select 组件向下展开时会超出页面底部可视区域，用户无法看到完整的选项列表。

当前情况：
- `composer-toolbar`（chat 模式）已有 `.composer-toolbar .custom-select-menu { top: auto; bottom: calc(100% + 6px); }` 向上展开
- 但非 chat 模式的 `.composer-controls` 中的 Select 没有这个覆盖，仍然向下展开
- `WorkModeSelector` 的 `.work-mode-menu` 已有 `bottom: calc(100% + 4px)` 但 CSS 一致性不够

## Proposed Fix

### 方案：Composer 内所有 Select 统一向上展开

在 `qoder.css` 中为 `.qoder-composer` 范围内的所有 `.custom-select-menu` 设置向上展开：

```css
/* 所有 composer 内的 Select 均向上展开，避免被视口底部裁切 */
.qoder-composer .custom-select-menu {
  top: auto;
  bottom: calc(100% + 4px);
  transform-origin: bottom;
}
```

这覆盖了：
1. 非 chat 模式的 `.composer-controls` 中的 CapabilitySelector
2. chat 模式的 `.composer-toolbar` 中的 CapabilitySelector（已有，保持不变）
3. 任何未来新增到 composer 内的 Select

## Acceptance Criteria
- [x] 非 chat 模式的 Composer 控件栏（权限/模型选择器）菜单向上展开
- [x] Chat 模式的 Composer toolbar 中的选择器菜单向上展开（保持现有行为）
- [x] WorkModeSelector 菜单向上展开（已有，验证保持）
- [x] 选项列表不超出视口底部
- [x] 键盘导航（ArrowUp/Down）方向感知不受影响

## Affected Files
- `cli-gui/client/styles/qoder.css`

## Dependencies
None

## Type
bug-fix / ui

## Priority
high

## SPEC Reference
Frontend-spec §5.1
