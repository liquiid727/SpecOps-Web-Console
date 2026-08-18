# Build accessible priority Route editor

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-032
- Source Spec: `.features/CLI-GUI-032-model-routing-gui/spec.md`
- Source Version: 1.0
- Requirement IDs: US-003, US-004, FR-24..FR-26
- Depends On: issue-095, issue-096, issue-103

## Goal
完成 Settings Routes 列表/编辑器、候选排序、排除原因、引用影响和技术 fallback 开关。

## Scope
- Route list/create/edit/archive/enable。
- `@dnd-kit/sortable` pointer/keyboard ordering + up/down IconButton。
- aria-live 排序通知、稳定行尺寸、1-8 候选限制。
- exclusions、no-candidate、in-use、readonly 和 retry states。
- destructive confirm 与 focus restore。

## Out of Scope
- Session/Composer route control（issue-105）。
- fallback execution/Attempt UI。

## Acceptance Criteria
- [ ] pointer、keyboard sensor、up/down controls 产生同一顺序
- [ ] 每次排序后焦点稳定且 aria-live 宣告位置
- [ ] 不可执行候选保留并显示全部 exclusions
- [ ] 1/8 边界、重复、archive/in-use error 可操作
- [ ] EN/ZH 长名称不溢出或覆盖控件
- [ ] ui:check、component tests、build 通过

## Inputs
- issues 095/096/103、Tabs/ResourceRow/DialogActions、dnd-kit

## Outputs
- Route Settings/editor、sorting/a11y/i18n tests

## Owner
implementation-agent（cli-gui-agent + frontend-agent）

## Required Evidence
- keyboard/pointer ordering tests；focus/aria assertions；responsive screenshots

## Gate Impact
- blocking
