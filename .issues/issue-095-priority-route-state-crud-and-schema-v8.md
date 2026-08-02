# Add priority Route state, CRUD, and schema v8 migration

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-030
- Source Spec: `.features/CLI-GUI-030-priority-model-routes/spec.md`
- Source Version: 1.0
- Requirement IDs: US-003, FR-1, FR-9, FR-28
- Depends On: issue-093

## Goal
引入有序 PriorityModelRoute、binding state 和 schema v7 → v8，并提供不含执行策略的 Route CRUD。

## Scope
- 定义 Route、binding、candidate/exclusion/resolution shared contracts。
- AppState 新增 routes、global binding、workspace bindings 和 Session modelRouteId。
- v7 → v8 backup/migration/validation。
- Route CRUD：候选去重、1-8 个、archive/in-use、readonly。
- automaticTechnicalFallback 只保存配置，不执行 fallback。

## Out of Scope
- Resolver（issue-096）。
- Session/preflight API（issue-097）。
- GUI/Attempt。

## Acceptance Criteria
- [ ] Route candidate IDs 有序、去重、1-8 个
- [ ] schema v8 backup、重复迁移、坏 binding 和失败不写入通过
- [ ] archived/in-use Route 合同稳定
- [ ] CRUD API 不访问 Secret 或启动 Agent
- [ ] shared/store/API tests 与 build 通过

## Inputs
- issue-093 Deployment registry、AppState v7

## Outputs
- Route contracts、schema v8、CRUD/migration tests

## Owner
implementation-agent（backend-agent + db-migration-agent）

## Required Evidence
- Route validation matrix；v7/v8 migration fixtures

## Gate Impact
- blocking
