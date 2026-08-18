# Add ModelDeployment state and schema v7 migration

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-029
- Source Spec: `.features/CLI-GUI-029-model-deployment-registry/spec.md`
- Source Version: 1.0
- Requirement IDs: US-002, US-009, FR-1, FR-8, FR-28, FR-29
- Depends On: issue-090

## Goal
引入稳定 ModelDeployment 配置、summary/snapshot 类型及 schema v6 → v7 非破坏迁移。

## Scope
- 定义 Deployment config、capability snapshot、eligibility 和 exclusion codes。
- AppState 新增 `modelDeployments`，完成 v6 → v7 backup/migration/validation。
- ID 不可变、archive/tombstone 和时间字段规范化。
- `shared/types.ts` 稳定导出，坏记录处理与旧代码宽容读取。

## Out of Scope
- CRUD/compatibility validator（issue-093）。
- legacy resolution（issue-094）。
- Route/GUI。

## Acceptance Criteria
- [ ] Deployment 精确引用 providerId/profileId/modelId，ID 不与其他域复用
- [ ] schema v7 空默认、backup、重复迁移和失败不写入通过
- [ ] archived Deployment 保持历史可读且不可重新启用
- [ ] capability unknown 不伪报 eligible
- [ ] shared type tests 和 store migration tests 通过
- [ ] build 通过

## Inputs
- schema v6、Provider/Profile/model contracts

## Outputs
- shared deployment contract、schema v7、migration tests

## Owner
implementation-agent（backend-agent + db-migration-agent）

## Required Evidence
- v6/v7 fixture diff；backup 和 failure-protection tests

## Gate Impact
- blocking
