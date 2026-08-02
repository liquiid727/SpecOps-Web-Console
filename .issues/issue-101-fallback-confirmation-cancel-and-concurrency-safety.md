# Add fallback confirmation, cancellation, and concurrency safety

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-031
- Source Spec: `.features/CLI-GUI-031-execution-attempts-safe-fallback/spec.md`
- Source Version: 1.0
- Requirement IDs: US-006, US-008, FR-19..FR-23
- Depends On: issue-100

## Goal
完成 possible/confirmed/unknown 副作用后的确认重试、取消优先和并发幂等，防止双确认或 failure/cancel 竞态创建额外 Attempt。

## Scope
- Task awaiting_confirmation transition 与 confirmation token/input hash。
- `POST /api/execution-tasks/:id/confirm-retry` expectedRevision 幂等。
- 现有 cancel endpoint 映射 active Task/Attempt。
- failure vs cancel、double confirm、WebSocket duplicate terminal races。
- ordered exhausted chain 和稳定 async errors。

## Out of Scope
- history/transcript UI（issues 102/106）。
- browser acceptance（issue-107）。

## Acceptance Criteria
- [ ] possible/confirmed/unknown 不自动 fallback，进入 awaiting_confirmation
- [ ] valid confirmation 创建一个 confirmed-retry Attempt
- [ ] double/expired/hash mismatch/revision conflict 不创建额外 Attempt
- [ ] cancel 获胜后永不启动备用或确认 Attempt
- [ ] exhaustion chain 按 ordinal、脱敏且 root cause 保留
- [ ] concurrency/fault/API tests 全绿

## Inputs
- issue-100 coordinator、ExecutionRepository、cancel/approval paths

## Outputs
- confirmation/cancel APIs、atomic transition guards、concurrency suite

## Owner
implementation-agent（backend-agent + concurrency-test-agent）

## Required Evidence
- deterministic race tests；attempt counts；idempotency assertions

## Gate Impact
- blocking
