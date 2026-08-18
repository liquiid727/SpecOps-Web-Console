# Inject session provider env into CLI launch and merge provider models

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-027
- Source Spec: `.features/CLI-GUI-027-session-model-providers/spec.md`
- Source Version: 1.0
- Requirement IDs: US-004, US-005, FR-4, FR-6, FR-7, FR-8
- Depends On: issue-086, issue-085

## Goal
会话创建时按 `session.providerId` 解析供应商，通过环境变量（claude 家族）或 `-c` 参数（codex）注入 CLI 进程；provider 声明的模型汇入三层合并列表 synced 层；未选 provider 的会话行为与现状完全一致。

## Scope
- `server/ports.ts` / `profile-adapters.ts`：`resolveLaunch` / `buildTurn` 返回值扩展可选 `env?: Record<string, string>`。
- 会话启动组装点（`application.ts` + PTY/headless spawn 链路）：
  - 读取 `session.providerId` → 校验协议与 profile adapter 匹配（anthropic-compatible↔claude 家族；openai-compatible↔codex）→ 校验宿主 env 存在 `credentialRef` 变量。
  - anthropic-compatible：注入 `ANTHROPIC_BASE_URL=<baseUrl>`、`ANTHROPIC_AUTH_TOKEN=<env[credentialRef]>`。
  - openai-compatible（codex）：以 `-c model_provider=<id>` 及 base_url/env_key 的 `-c` 覆盖参数透传，不写配置文件。
  - spawn env 组装：`{...sanitizeCliEnvironment(process.env), ...env}`。
- 会话创建 API：请求体扩展可选 `providerId`；协议不匹配 400 `VALIDATION_FAILED`；凭证 env 缺失 400 `PROVIDER_CREDENTIAL_MISSING`（message 含变量名）；restart/resume 沿用既有 `providerId`。
- 模型汇入：会话上下文的模型列表把选定 provider 的 `models` 并入 `mergeModelSources` synced 入参（不新增第四层）；`appendOption` 模型校验接受 provider 模型。
- 测试：mock spawn 断言 env 注入；并行两个不同 provider 会话 env 互不污染；凭证缺失阻断；无 providerId 会话 env 与现状逐字段一致（回归）；日志与持久化不含 token 值。

## Out of Scope
- provider CRUD 与 schema（issue-086）。
- UI（issue-088）。
- generic adapter 注入；kimi/glm adapter 硬编码移除。

## Acceptance Criteria
- [ ] anthropic provider 会话 spawn env 含 `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`，值正确
- [ ] codex provider 会话 launch args 含 `-c model_provider=<id>` 覆盖，不改写任何用户配置文件
- [ ] 协议与 adapter 不匹配、凭证 env 缺失分别返回规定错误码，后者 message 含变量名
- [ ] 两个不同 provider 的并行会话 env 互不污染；resume/restart 沿用 providerId
- [ ] 无 providerId 会话的 spawn env 与 args 与现状逐字段一致（回归断言）
- [ ] provider models 出现在该会话模型列表（source=synced），重名按既有优先级去重
- [ ] 持久化文件与日志中 grep 不到注入的 token 值
- [ ] Typecheck/lint 通过

## Inputs
- `cli-gui/server/profile-adapters.ts`、`server/ports.ts`、`server/application.ts`、PTY/headless spawn 模块及对应测试
- `cli-gui/server/model-catalog.ts` `mergeModelSources`
- CLI-GUI-027 spec §Domain / §Application

## Outputs
- env/参数注入链路、模型汇入、集成测试

## Owner
implementation-agent（backend-agent 执行）

## Required Evidence
- `npx vitest run`（cli-gui server 套件）全绿输出
- 无 token 泄漏 grep 断言用例

## Gate Impact
- blocking
