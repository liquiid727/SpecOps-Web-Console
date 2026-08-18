# Implement ModelDeployment registry, CRUD, and compatibility validation

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-029
- Source Spec: `.features/CLI-GUI-029-model-deployment-registry/spec.md`
- Source Version: 1.0
- Requirement IDs: US-002, FR-2, FR-3, FR-8, FR-10
- Depends On: issue-091, issue-092, issue-085

## Goal
提供 Deployment registry 与 CRUD，并根据 Provider、Profile、model catalog、capability 和 Secret status 计算可执行性。

## Scope
- `deployment-registry.ts` domain validator/service。
- `GET/POST/PATCH/DELETE /api/model-deployments`。
- protocol/profile family、model catalog、Secret、enabled/archive 校验。
- summary 返回全部 exclusions；archive 前检查 Route/Session 引用。
- capability probe 失败时保存为 unknown/disabled，不能启用。

## Out of Scope
- legacy Session behavior（issue-094）。
- Route。
- Settings UI（issue-103）。

## Acceptance Criteria
- [ ] CRUD/readonly/in-use/duplicate/not-found 合同符合 SPEC
- [ ] 每类 incompatibility 产生稳定 exclusion code
- [ ] API summary 不包含 credentialRef 或 Secret
- [ ] model 不在 verified catalog 时启用被拒绝
- [ ] capability 暂不可用不删除已有 Deployment
- [ ] unit/API/integration tests 和 build 通过

## Inputs
- issues 085/091/092；Provider summaries、Profile capabilities

## Outputs
- Deployment registry/API、validation matrix、contract tests

## Owner
implementation-agent（backend-agent + openapi-agent）

## Required Evidence
- compatibility matrix tests；API request/response fixtures

## Gate Impact
- blocking
