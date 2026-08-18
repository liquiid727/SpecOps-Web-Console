# QA-UI: 响应式布局、无障碍与国际化验证

## Description

验证桌面三栏/窄屏单栏布局、键盘无障碍、中文 IME 安全、长文本溢出处理、
ARIA role/label 和 reduced-motion 在产品级使用中表现正确。

## Acceptance Criteria

- [x] 桌面保持三栏工作台（Sidebar / Center / RightPanel）协调布局。
- [x] 窄屏 390×844 使用单栏 drill-in（Session → Chat → Monitor），无横向滚动。
- [x] 英文/中文文案完整、无截断、无溢出、无硬编码 key 泄露。
- [x] 切换语言后当前视图不重置。
- [x] Dialog / Menu / Tabs / Select / drawer 有正确 role、键盘路径、焦点圈定和焦点归还。
- [x] 中文 IME 组合输入不因 keydown 提前提交 Composer。
- [x] reduced-motion 设置后动画遵守偏好（transition 使用 prefers-reduced-motion）。
- [x] 长标题、长路径、长模型名、长错误信息在窄视口下不覆盖相邻控件。
- [x] 破坏性操作按钮使用 destructive 色调和 aria 标记。
- [x] 状态不仅依赖颜色（colorblind-safe：辅以图标或文字）。

## Verification Evidence (2026-07-30)

- E2E: mobile 390x844 + 320x568 viewports verified (no horizontal scroll, drill-in navigation, drawer focus). 11/11 PASS.
- L3: browser DOM confirmed i18nKeyLeaks=[], IME composing safe (isComposing guard), 3 prefers-reduced-motion CSS rules.
- Context menu with role="menu"/role="menuitem", Select with role="listbox"/role="option", Dialog with role="dialog" all verified via E2E and snapshot.

## Verification Method

- L1: 自动化回归（snapshot / a11y lint）
- L3: Chrome 桌面 + Chrome 390×844 窄屏人工走查
- L5: Tauri packaged build（如可用）

## Checklist IDs

QA-UI-01, QA-UI-02, QA-UI-03, QA-UI-04, QA-UI-05, QA-UI-06

## SPEC Reference

spec-experience-verification.md §3.5

## PRD Mapping

QA-US-07 → FR-QA-7, FR-QA-8, FR-QA-9

## Dependencies

Issues #073

## Type

qa

## Priority

medium
