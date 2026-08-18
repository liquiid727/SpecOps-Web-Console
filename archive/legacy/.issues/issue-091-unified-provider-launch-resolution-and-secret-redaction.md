# Unify provider launch resolution and secret redaction

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-028
- Source Spec: `.features/CLI-GUI-028-secret-store-provider-connections/spec.md`
- Source Version: 1.0
- Requirement IDs: US-001, FR-2..FR-6
- Depends On: issue-089, issue-090, issue-087

## Goal
让 terminal、spawn chat 和 persistent chat 在启动前通过同一 Provider resolver 获取临时凭证，并保证任何持久化/日志路径不泄漏 Secret。

## Scope
- 新增 server-only Provider launch resolver，输入 Provider/Profile，输出 PreparedLaunch env 增量。
- 接入 terminal resolveLaunch、spawn buildTurn、persistent runtime 三条路径。
- AgentBackend/ProfileAdapter 不直接读取 Keychain，也不拥有 Provider ID。
- 统一 redactor 覆盖 logger、API error details、Transcript/fixture 和后续 Attempt snapshots。
- 缺失/不可用 Secret 在 spawn 之前失败，且不创建 Agent 进程。

## Out of Scope
- Model Deployment 与 Route。
- 自动 fallback。
- GUI。

## Acceptance Criteria
- [ ] 三条执行路径均只调用同一个 Provider resolver
- [ ] env 只存在于服务端局部组装与 spawn options
- [ ] `PROVIDER_SECRET_MISSING`/`SECRET_STORE_UNAVAILABLE` 在 spawn 前返回
- [ ] provider/engine protocol mismatch 不执行进程
- [ ] canary 不出现在 state、logs、Transcript、API、test snapshots
- [ ] 无 Provider Session 与现状逐字段兼容

## Inputs
- issues 087/089/090、`application.ts`, `profile-adapters.ts`, persistent runtime, AgentBackend

## Outputs
- unified launch resolver、三路径 wiring、redaction suite

## Owner
implementation-agent（backend-agent）

## Required Evidence
- terminal/spawn/persistent integration tests；process spawn call-count 断言；canary scan

## Gate Impact
- blocking
