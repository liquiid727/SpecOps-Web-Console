# Migrate provider credentials and add write-only secret API

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-028
- Source Spec: `.features/CLI-GUI-028-secret-store-provider-connections/spec.md`
- Source Version: 1.0
- Requirement IDs: US-001, US-009, FR-5..FR-7, FR-28
- Depends On: issue-089, issue-086

## Goal
将 CLI-GUI-027 Provider 凭证语义升级为 opaque secretRef，并提供不会返回明文的 credential 写入/删除 API。

## Scope
- AppState schema v5 → v6，裸 env 名迁移为 `env:<NAME>`，坏引用保留 Provider 并标 missing。
- 扩展 Provider config/summary：supportedEngineIds、enabled、credentialStatus、时间字段。
- `PUT/DELETE /api/providers/:id/credential`；metadata CRUD 不接受/返回 Secret。
- Provider in-use、Endpoint TLS/localhost、readonly、CSRF 和 body-size 校验。
- v5 backup、原子写入、重复迁移与失败不启动保护。

## Out of Scope
- SecretStore adapter 实现（issue-089）。
- 三条执行路径注入（issue-091）。
- Provider Settings UI（issue-103）。

## Acceptance Criteria
- [ ] v5 → v6 迁移生成一次备份并可重复执行
- [ ] credential API response/logger/state 不包含提交的 canary Secret
- [ ] 替换/删除失败保持原 credentialRef 和 Provider 状态
- [ ] in-use、readonly、CSRF、invalid endpoint 返回 SPEC 错误
- [ ] 旧 `env:` Provider 可继续只读执行，新 credential 默认 Keychain
- [ ] Store/API/security tests 与 build 通过

## Inputs
- issue-086 Provider CRUD、issue-089 SecretStore、`server/store.ts`, `application.ts`

## Outputs
- schema v6、Provider contracts、write-only credential API、migration/security tests

## Owner
implementation-agent（backend-agent + db-migration-agent）

## Required Evidence
- migration fixture；Secret canary scan；API contract tests

## Gate Impact
- blocking
