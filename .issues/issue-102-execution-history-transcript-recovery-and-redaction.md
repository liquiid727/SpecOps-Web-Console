# Integrate execution history, Transcript recovery, and redaction

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-031
- Source Spec: `.features/CLI-GUI-031-execution-attempts-safe-fallback/spec.md`
- Source Version: 1.0
- Requirement IDs: US-007, US-008, US-009, FR-24, FR-29
- Depends On: issue-101, issue-094

## Goal
提供 Task/Attempt history API 和非秘密 Transcript summary，使 restart、resume、fork 后可恢复执行历史且不从临时帧推断事实。

## Scope
- list/get execution Task APIs 与 cursor pagination。
- Transcript structured attempt status component/metadata。
- restart fold、resume、fork、archive、delete lifecycle wiring。
- deployment/provider deleted 后使用 frozen snapshots。
- state/API/log/Transcript/execution canary redaction suite。

## Out of Scope
- Attempt UI（issue-106）。
- E2E browser acceptance（issue-107）。

## Acceptance Criteria
- [ ] ExecutionRepository 是恢复事实源，WebSocket 帧不是事实源
- [ ] refresh/restart 后 Task/Attempt order/state 一致且无重复终态
- [ ] fork 不复制父 execution file，旧上下文仍可读
- [ ] archived/complete 保留；delete 移除对应 execution records
- [ ] deleted config 不破坏 snapshot history
- [ ] canary 在全部持久/API/log surface 为 0 命中

## Inputs
- issues 094/098-101、Transcript store/cards contracts

## Outputs
- history APIs、Transcript projection、lifecycle/recovery/security tests

## Owner
implementation-agent（backend-agent）

## Required Evidence
- restart/fork/resume fixtures；redaction scan；history API snapshots

## Gate Impact
- blocking
