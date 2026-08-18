# Preserve legacy model resolution and Deployment history compatibility

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-029
- Source Spec: `.features/CLI-GUI-029-model-deployment-registry/spec.md`
- Source Version: 1.0
- Requirement IDs: US-002, US-009, FR-27..FR-29
- Depends On: issue-093

## Goal
保证旧 Session 在没有 Route/Deployment 时继续按 Profile/model 执行，并确保 Deployment archive/delete 不破坏 resume、fork 或历史展示。

## Scope
- 实现 `LegacyModelResolution`：activeModel > launchConfig.model > profile default。
- 禁止把 model string 或拼接值伪装成 Deployment ID。
- no-route terminal/chat、resume、fork、restart 回归。
- archive/tombstone 与历史 snapshot 读取；不存在 Provider/Profile 时给稳定错误。
- 删除/归档引用检查与兼容错误映射。

## Out of Scope
- Route resolver（issues 095-097）。
- Attempt history（issue-102）。
- GUI。

## Acceptance Criteria
- [ ] 无 Route Session 的 argv/env/activeModel 行为与当前实现一致
- [ ] resume/fork 保留 BackendSessionRef 与 model source
- [ ] 旧 Session 不被批量生成伪 Deployment
- [ ] archive 后未来选择不可用，历史 snapshot 仍可读
- [ ] missing Profile/Provider/model 使用稳定可操作错误
- [ ] legacy/restart/fork regression tests 通过

## Inputs
- issue-093、现有 state/session/chat/profile adapter tests

## Outputs
- legacy resolver、history compatibility、regression suite

## Owner
implementation-agent（backend-agent）

## Required Evidence
- no-route before/after fixture；resume/fork integration tests

## Gate Impact
- blocking
