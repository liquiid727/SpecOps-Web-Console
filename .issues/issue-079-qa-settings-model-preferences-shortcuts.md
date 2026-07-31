# QA-SET: 设置、模型偏好与快捷键验证

## Description

验证 Settings、语言/主题切换、Profile/模型偏好记忆、快捷键一致性和未实现能力的
disabled 处理在产品级使用中行为正确且持久。

## Acceptance Criteria

- [x] Settings 的 Appearance、语言、主题偏好在刷新/重启后保持一致。
- [x] 切换语言后当前视图状态不重置（Session 选中、滚动位置等）。
- [x] 快捷键清单与实际行为一致；Sidebar/RightPanel/新建/视图切换可键盘完成。
- [x] Codex/Claude Profile 选择和权限设置不静默影响已有 Session。
- [x] 新建 Session 的默认 Profile/模型/权限值可解释且一致。
- [x] 模型同步成功/失败/超时/fallback 有状态反馈。
- [x] Composer 模型列表与可用 Profile 保持一致。
- [x] 模型偏好按 Profile 正确记忆；失效模型不静默切换，显示修复提示。
- [x] 未实现能力隐藏入口或显示 disabled reason；无假开关。

## Verification Evidence (2026-07-30)

- E2E: theme persistence across reload PASS; Settings tabs all accessible.
- L3: browser confirmed 4 settings tabs (环境/外观/运行时/关于), language switch (EN/中文), theme options (Qoder/Neo/Classic), model list in Composer matches profile capabilities.
- CHAT_ENABLED=true — no fake toggle; terminal-only profiles show explicit disabled reason.
- [x] 所有可见设置控件确实生效。

## Verification Method

- L1: 自动化回归
- L3: 人工走查（切换/重启/验证持久性）

## Checklist IDs

QA-SET-01, QA-SET-02, QA-SET-03, QA-SET-04, QA-SET-05, QA-SET-06

## SPEC Reference

spec-experience-verification.md §3.4

## PRD Mapping

QA-US-05 → FR-QA-7, FR-QA-8

## Dependencies

Issues #073 (i18n/a11y)

## Type

qa

## Priority

medium
