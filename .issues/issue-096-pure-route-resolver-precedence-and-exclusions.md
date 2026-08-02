# Implement pure Route resolver with precedence and exclusions

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-030
- Source Spec: `.features/CLI-GUI-030-priority-model-routes/spec.md`
- Source Version: 1.0
- Requirement IDs: US-003, US-004, FR-10..FR-14
- Depends On: issue-095, issue-093

## Goal
实现无 I/O 的 Route Resolver，严格解析 system/global/project/session/run 覆盖并返回字段来源、完整候选与排除原因。

## Scope
- `resolveModelRoute(input)` pure function。
- precedence 与字段级 sourceTrace。
- 候选过滤：route/deployment/provider/secret/engine/model exclusions。
- fixedDeploymentId 必须属于最终 Route 且 eligible。
- no-route 返回 legacy resolution；无候选返回不可发送详情。
- exhaustive table-driven tests。

## Out of Scope
- HTTP/session wiring（issue-097）。
- Agent execution/fallback。
- UI。

## Acceptance Criteria
- [ ] Resolver 不导入 filesystem、repository、CLI、network 或 UI
- [ ] 全 precedence 组合产生稳定 sourceTrace
- [ ] 每个 candidate 保留原位置并返回全部 exclusion codes
- [ ] fixed invalid 不静默改选
- [ ] no-route 与 no-candidate 语义严格区分
- [ ] pure unit matrix 全绿

## Inputs
- issue-095 contracts、issue-093 summaries、issue-094 legacy resolver

## Outputs
- pure resolver、deterministic fixtures、coverage mapping

## Owner
implementation-agent（backend-agent + unit-test-agent）

## Required Evidence
- table-driven resolver test matrix；dependency boundary check

## Gate Impact
- blocking
