# Normalize backend failures and side-effect observations

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-031
- Source Spec: `.features/CLI-GUI-031-execution-attempts-safe-fallback/spec.md`
- Source Version: 1.0
- Requirement IDs: US-006, FR-17..FR-20
- Depends On: issue-098

## Goal
让 AgentBackend 输出稳定 RoutingFailureClass 和显式 effect evidence，使 fallback 不依赖自然语言错误或缺失事件的乐观推断。

## Scope
- 扩展 AgentTurnError stable class/code；vendor adapters 显式映射。
- AgentEvent tool/command/file_change 增加 effect none/read/write/external/unknown。
- effect fold 为 clean/possible/confirmed/unknown。
- stream gap、parse failure、unsupported Backend → unknown。
- transport fallback 继续标记 fallbackAttempted，但不创建 Model Attempt。

## Out of Scope
- Route candidate policy/coordinator（issue-100）。
- confirmation/cancel API（issue-101）。
- UI。

## Acceptance Criteria
- [ ] 白名单/禁止类均由 machine code 映射，不解析 message
- [ ] model_not_found=configuration；temporary capacity 才是 model-temporarily-unavailable
- [ ] write/external/unknown/stream gap 均禁止自动判定 clean
- [ ] read-only effect 可保持 clean，且有 Backend fixture 证明
- [ ] persistent→spawn 不额外产生 Attempt classification
- [ ] backend/orchestrator contract tests 通过

## Inputs
- AgentBackend、profile adapters、orchestrator parsed events、issue-098 contracts

## Outputs
- failure/effect contracts、vendor mappings、fault fixtures

## Owner
implementation-agent（backend-agent + unit-test-agent）

## Required Evidence
- classifier table；effect fold cases；transport separation regression

## Gate Impact
- blocking
