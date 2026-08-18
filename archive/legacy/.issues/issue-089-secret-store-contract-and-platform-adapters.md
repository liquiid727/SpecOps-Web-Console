# Add SecretStore contract and platform credential adapters

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-028
- Source Spec: `.features/CLI-GUI-028-secret-store-provider-connections/spec.md`
- Source Version: 1.0
- Requirement IDs: US-001, FR-2, FR-5, FR-6
- Depends On: issue-086

## Goal
建立服务端 `SecretStore` port、`SecretRef` 合同及生产/兼容/测试适配器，使真实供应商密钥不进入 AppState 或 API 读响应。

## Scope
- 定义 `keychain:`、`env:` SecretRef 和 SecretStatus。
- 新增 `SecretStore.put/resolve/remove/status` port。
- 实现系统凭证适配入口、只读 Environment adapter、Memory test adapter 和 composite routing。
- 生产 bootstrap 注入 SecretStore；不可用平台返回稳定错误。
- 引入平台依赖时更新 lockfile 并记录采用理由和打包影响。

## Out of Scope
- Provider schema/API migration（issue-090）。
- CLI launch 注入（issue-091）。
- Deployment/Route/GUI。

## Acceptance Criteria
- [ ] 新凭证只生成 `keychain:` 引用；`env:` 仅可读取
- [ ] SecretStore unavailable、missing、write/delete failure 使用稳定 typed error
- [ ] Memory adapter 覆盖并发替换、删除和 status
- [ ] 任何 public summary/type 不包含 Secret 值
- [ ] 平台实现和不可用路径有测试或明确的环境阻断证据
- [ ] `npm --prefix cli-gui run test` 与 `npm --prefix cli-gui run build` 通过

## Inputs
- `shared/model-provider.ts`, `server/ports.ts`, production bootstrap, `src-tauri/`

## Outputs
- SecretStore shared/server contracts、platform adapters、测试与依赖记录

## Owner
implementation-agent（backend-agent + implementation-editor）

## Required Evidence
- SecretStore unit results；平台 credential store smoke 或 release blocker 记录

## Gate Impact
- blocking
