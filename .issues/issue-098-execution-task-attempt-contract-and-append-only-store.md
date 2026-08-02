# Add ExecutionTask/Attempt contract and append-only store

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-031
- Source Spec: `.features/CLI-GUI-031-execution-attempts-safe-fallback/spec.md`
- Source Version: 1.0
- Requirement IDs: US-007, US-009, FR-1, FR-15, FR-16, FR-29
- Depends On: issue-097

## Goal
建立 immutable Task/Attempt snapshots、带 revision transitions 和版本化 per-session JSONL ExecutionRepository。

## Scope
- shared Task/Attempt/state/trigger/snapshot contracts。
- `ExecutionRepository` append/fold/list/get/delete/drain。
- `executions/<sessionId>.jsonl` format v1、write queues、incomplete tail/corrupt middle。
- input 只保存 Transcript event ref + sha256。
- transition legality、终态不可改、redaction boundary。

## Out of Scope
- failure/effect classification（issue-099）。
- coordinator/fallback（issues 100-101）。
- UI。

## Acceptance Criteria
- [ ] Task/Attempt immutable 字段不能被 transition 改写
- [ ] revision conflict 和非法 transition 被拒绝
- [ ] incomplete tail 可恢复，corrupt middle 明确失败
- [ ] old Session 无 execution file 返回空，不生成伪记录
- [ ] delete/archive/fork 按 SPEC 保留或删除正确文件
- [ ] repository/state-machine/security tests 通过

## Inputs
- TranscriptRepository patterns、issue-097 resolved snapshot

## Outputs
- execution shared contract、JSONL repository、fold/recovery tests

## Owner
implementation-agent（backend-agent）

## Required Evidence
- JSONL fixtures；transition matrix；restart recovery results

## Gate Impact
- blocking
