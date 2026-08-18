# Add schema v5 provider storage and provider CRUD API

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-027
- Source Spec: `.features/CLI-GUI-027-session-model-providers/spec.md`
- Source Version: 1.0
- Requirement IDs: US-003, FR-3, FR-5
- Depends On: none（可与 CLI-GUI-026 并行开工）

## Goal
落地 Model Provider 的持久化与 REST CRUD：AppState schema v4→v5 迁移新增 `providers: ModelProviderConfig[]` 与 `session.providerId?`，提供带校验的 provider 管理端点，凭证只以环境变量名引用存储。

## Scope
- `shared/state.ts`：`CURRENT_SCHEMA_VERSION` 4→5；AppState 增 `providers`；session 增可选 `providerId`。
- `server/store.ts`：v4→v5 迁移（补 `providers: []`）；provider 条目宽容清洗（形状不符丢弃条目不拒载整份 state）；v5 被旧代码宽容读取的兼容验证。
- `server/application.ts` 新端点：
  - `GET /api/providers` → `ModelProviderSummary[]`（`configured` = 宿主 env 存在 credentialRef 变量；不含凭证值）
  - `POST /api/providers`（201；重复 id / 校验失败 400 `VALIDATION_FAILED` 含 field）
  - `PATCH /api/providers/:id`（200；不存在 404）
  - `DELETE /api/providers/:id`（200）
- 校验规则：`protocol ∈ anthropic-compatible|openai-compatible`；`baseUrl` 必须 `https://`（`http://localhost`、`http://127.0.0.1` 例外）；`credentialRef` 匹配 `^[A-Z][A-Z0-9_]*$`；readonly 模式拒绝写端点。
- 集成测试：CRUD happy/error、响应不含凭证值、迁移正反向、readonly 拒绝。

## Out of Scope
- 启动链路 env 注入与会话创建校验（issue-087）。
- Settings / composer UI（issue-088）。
- provider 模型汇入合并列表（issue-087）。

## Acceptance Criteria
- [ ] v4 state 加载后自动升级 v5 且 `providers` 默认 `[]`；坏 provider 条目被丢弃不拒载
- [ ] CRUD 四端点行为与错误语义符合 spec §API
- [ ] `GET /api/providers` 响应与持久化文件中均无凭证值（grep 断言）
- [ ] baseUrl / credentialRef / protocol 非法输入均 400 且含 field
- [ ] readonly 模式下写端点返回既有 readonly 错误
- [ ] Typecheck/lint 通过

## Inputs
- `cli-gui/shared/state.ts`、`cli-gui/shared/model-provider.ts`（唯一类型来源）
- `cli-gui/server/store.ts`、`cli-gui/server/application.ts` 及对应测试
- CLI-GUI-027 spec §Repository / §API

## Outputs
- schema v5 迁移、provider CRUD API、测试

## Owner
implementation-agent（backend-agent 执行）

## Required Evidence
- `npx vitest run server/store.test.ts server/application.test.ts` 全绿输出
- 持久化文件无凭证值的测试断言

## Gate Impact
- blocking
