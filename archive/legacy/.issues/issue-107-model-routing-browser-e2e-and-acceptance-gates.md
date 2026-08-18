# Add model routing browser E2E and acceptance gates

## Traceability
- Track: verification-preparation
- Spec ID: CLI-GUI-032
- Source Spec: `.features/CLI-GUI-032-model-routing-gui/spec.md`
- Source Version: 1.0
- Requirement IDs: US-001..US-009, FR-24..FR-29
- Depends On: issue-091, issue-094, issue-097, issue-102, issue-103, issue-104, issue-105, issue-106, approved Test Specs for CLI-GUI-028..032

## Goal
使用 deterministic fake Backend 和真实浏览器完成整个 Provider → Deployment → Route → Session → Attempt/fallback/recovery 用户旅程，并收口 i18n、响应式、性能和回归门禁。

本 Issue 只准备公共浏览器夹具与已知主旅程；独立 verification 的最终场景、断言和结果必须由 `CLI-GUI-028..032/test-spec.md` 派生，不能从实现细节反推。

## Scope
- Playwright/Chrome fixture：成功、allowed fallback、forbidden auth、side-effect confirmation、cancel、exhausted、restart。
- Provider Secret canary 与浏览器/API/persistence/log negative scan。
- EN/ZH；1280px、900px、640px；键盘排序、Dialog focus、长模型名。
- 第二次发送恢复继承；refresh/reconnect history；legacy no-route Session。
- 运行全量 ui:check/test/build/test:e2e 并记录残余 warning/environment gap。

## Out of Scope
- 真实供应商付费调用作为自动阻断测试。
- 远程 Web/App、A/B、API Executor、质量路由。
- 修复与本 Epic 无关的历史告警。

## Acceptance Criteria
- [ ] 两个候选 primary failure → exactly one fallback → success 完整可见
- [ ] auth/config/cancel 不产生 fallback；side-effect 必须确认
- [ ] fixed once 第二次发送恢复 Route inheritance
- [ ] refresh/restart history 与 legacy no-route behavior 正确
- [ ] EN/ZH 和 1280/900/640 无重叠、横向滚动或焦点丢失
- [ ] Secret canary 全表面 0 命中
- [ ] ui:check/test/build/test:e2e 结果归档；跳过项有明确 blocker

## Inputs
- issues 089-106、MockClientRuntime/fake AgentBackend、E2E harness

## Outputs
- browser E2E、acceptance evidence、release blocker summary

## Owner
testing-agent（playwright-test-agent + e2e-test-agent；implementation-agent 修复发现的问题）

## Required Evidence
- Chrome screenshots/traces；command outputs；canary scan；viewport assertions

## Gate Impact
- blocking
