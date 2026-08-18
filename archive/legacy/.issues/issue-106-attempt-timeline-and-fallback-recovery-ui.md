# Build Attempt timeline and fallback recovery UI

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-032
- Source Spec: `.features/CLI-GUI-032-model-routing-gui/spec.md`
- Source Version: 1.0
- Requirement IDs: US-006, US-007, US-008, FR-24..FR-26
- Depends On: issue-102, issue-105

## Goal
在 Transcript 中展示 immutable Attempt 链、automatic fallback、候选耗尽和副作用后的确认重试，并保持刷新恢复和单一终态。

## Scope
- ExecutionPort/history fetch 与 transcript/WebSocket merge。
- AttemptTimeline/cards：ordinal、trigger、actual Provider/model、state、duration、error。
- primary failure + fallback 独立展示；ordered exhausted chain。
- FallbackConfirmationDialog：effect evidence、next candidate、confirm/cancel pending state。
- refresh/reconnect 恢复、duplicate terminal suppression、error recovery。

## Out of Scope
- Backend state/fallback（issues 098-102）。
- 跨页面新监控中心。
- 最终多 viewport E2E（issue-107）。

## Acceptance Criteria
- [ ] primary/automatic/confirmed Attempts 使用稳定 data attributes 并保持顺序
- [ ] awaiting confirmation 不自动触发 API，确认 pending 时防重复
- [ ] cancel/exhausted/success/failed 状态可辨且不只依赖颜色
- [ ] refresh/reconnect 后不重复卡片或终态
- [ ] Dialog trap/Escape/focus return/long text 合同通过
- [ ] component/integration/ui:check/build 通过

## Inputs
- issue-102 history/events、issue-105 composer、TranscriptPanel/cards/Overlay

## Outputs
- ExecutionPort、Attempt UI、confirmation dialog、recovery/i18n/tests

## Owner
implementation-agent（cli-gui-agent + frontend-agent）

## Required Evidence
- refresh/duplicate tests；Dialog a11y；state matrix screenshots

## Gate Impact
- blocking
