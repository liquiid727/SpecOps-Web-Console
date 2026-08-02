# Implement RouteExecutionCoordinator and one safe automatic fallback

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-031
- Source Spec: `.features/CLI-GUI-031-execution-attempts-safe-fallback/spec.md`
- Source Version: 1.0
- Requirement IDs: US-006, US-007, FR-15..FR-23
- Depends On: issue-098, issue-099, issue-091

## Goal
在 Application/RuntimeOrchestrator 边界建立 Task runner，执行 primary Attempt，并在 clean 白名单技术故障时最多自动执行一个备用 Attempt。

## Scope
- `RouteExecutionCoordinator` candidate/Task policy。
- frozen ResolvedRoute → deployment launch resolver → AgentBackend invocation。
- primary/automatic-fallback Attempt lifecycle、usage/latency/error 持久化。
- fallback enabled、白名单、clean、next candidate、max one guards。
- existing no-route submitTurn compatibility adapter。

## Out of Scope
- awaiting-confirmation/cancel race API（issue-101）。
- history/transcript projection（issue-102）。
- GUI。

## Acceptance Criteria
- [ ] 每个 allowed clean failure 精确产生 primary + one automatic Attempt
- [ ] forbidden/no candidate/fallback disabled 精确产生 one Attempt
- [ ] ResolvedRoute 执行开始后不重新解析可变配置
- [ ] 每次真实 AgentBackend runTurn 前先持久化 Attempt
- [ ] transport fallback 不消耗 Model fallback 限额
- [ ] success/failure/exhaustion transitions 与 usage/latency 正确

## Inputs
- issues 091/098/099、RuntimeOrchestrator、AgentBackend registry

## Outputs
- coordinator、application/orchestrator wiring、fault-injection tests

## Owner
implementation-agent（backend-agent）

## Required Evidence
- per-error attempt count；candidate order；transport separation tests

## Gate Impact
- blocking
