# Add routing client ports and Provider/Deployment Settings

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-032
- Source Spec: `.features/CLI-GUI-032-model-routing-gui/spec.md`
- Source Version: 1.0
- Requirement IDs: US-001, US-002, FR-24..FR-26
- Depends On: issue-090, issue-093, issue-088

## Goal
扩展 ClientRuntime RoutingPort，并在 Settings > Models 提供安全 Provider credential 与 Deployment 管理视图。

## Scope
- RoutingPort/API facade/MockClientRuntime deterministic fixtures。
- Models 内 `Providers / Deployments / Routes` Tabs 框架；本卡完成前两个视图。
- 复用 issue-088 Provider CRUD，升级为 write-only Keychain credential status/actions。
- Deployment CRUD、eligibility/exclusions、unknown/disabled/archive 状态。
- loading/empty/success/failure/readonly、EN/ZH、错误恢复。

## Out of Scope
- Route editor（issue-104）。
- Session/Composer（issue-105）。
- Attempt UI（issue-106）。

## Acceptance Criteria
- [ ] RoutingPort 不把业务 API 塞回组件直接 fetch
- [ ] Secret 从不进入 Zustand/localStorage/DOM value/test snapshot
- [ ] Provider/Deployment CRUD 与所有状态可见且可恢复
- [ ] exclusions 显示稳定文案和相应修复入口
- [ ] 只使用内部 primitives/patterns 与 semantic tokens
- [ ] ui:check、component tests、build 通过

## Inputs
- issues 088/090/093、SettingsView、ClientRuntime、i18n/design system

## Outputs
- RoutingPort、Mock fixtures、Provider/Deployment Settings、i18n/tests

## Owner
implementation-agent（cli-gui-agent + frontend-agent）

## Required Evidence
- EN/ZH component snapshots；Secret DOM/state negative assertions；ui:check

## Gate Impact
- blocking
