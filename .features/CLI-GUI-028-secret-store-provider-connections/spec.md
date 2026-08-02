# CLI-GUI-028 Secret Store and Provider Connections

## Meta

- Spec ID: `CLI-GUI-028`
- Spec Version: `1.0`
- Title: Secret Store and Provider Connections（系统凭证与供应商连接）
- Epic: MVP02-B Model Management
- Status: approved
- Owner Agent: implementation-agent
- Source PRD: `.prd/prd-cli-gui-multi-provider-model-routing.md`
- Covered Requirements: `US-001`, `US-009`（凭证兼容部分）, `FR-2..FR-7`, `FR-28`
- Depends On: `CLI-GUI-027`
- Prerequisites: `CLI-GUI-027` 提供 Provider CRUD、CLI 注入和 schema v5；现有本地回环授权与 readonly 写保护可复用
- Risk Tier: `P0`
- Quality Profile: security + migration + server integration + packaged-host acceptance
- Approval Evidence: 用户于 2026-08-02 确认父 PRD，并要求直接生成对应 SPEC 与 Issues

## Goal

将 `CLI-GUI-027` 的“环境变量名型 credentialRef”升级为系统凭证服务默认写入模型。真实供应商密钥只存在 OS Keychain、Windows Credential Manager 或 Linux Secret Service 中；AppState、项目配置、API 响应、日志和 Transcript 只持有不透明 `secretRef` 和可用状态。既有环境变量引用继续作为只读兼容来源，不允许回退到明文磁盘存储。

独立成片理由：SecretStore 是 Provider、Deployment 和 Route 执行的安全前置条件，拥有独立端口、平台适配、schema 迁移和 P0 泄漏门禁。

## Why This Exists

`CLI-GUI-027` 为快速接入供应商，把 `credentialRef` 定义为环境变量名。该方式要求用户离开 GUI 配置宿主环境，也无法满足父 PRD 的系统凭证存储和 GUI 密钥管理目标。若不先收敛 SecretStore，后续 Route 会把错误的凭证语义扩散到 Deployment、Attempt 和项目覆盖中。

## Out of Scope

- 不新增供应商 HTTP/SDK API Executor。
- 不让 Provider 成为 Agent Backend、CLI Profile 或 Transport。
- 不实现余额、配额、计费或供应商账户同步。
- 不向前端、日志、错误 details 或导出文件返回真实密钥。
- 不提供明文 JSON、浏览器 localStorage 或普通文件兜底。
- 不实现 Model Deployment、Route 或 Attempt。

## Deliverables

- `SecretStore` server port 与 `SecretRef`/`SecretStatus` shared 合同。
- 生产系统凭证适配器、`env:` 只读兼容适配器和测试用内存适配器。
- Provider 配置由环境变量名升级为不透明 `credentialRef`，并增加凭证状态摘要。
- Provider credential 写入、替换、删除 API；所有读取 API 只返回状态。
- schema v5 → v6 非破坏迁移与一次性备份。
- 凭证泄漏扫描、平台不可用、readonly 和并发替换测试。

## Domain

### Secret References

```ts
type SecretRef = `keychain:${string}` | `env:${string}`;

type SecretStatus =
  | "configured"
  | "missing"
  | "legacy-environment"
  | "store-unavailable";

interface SecretStore {
  put(scope: { providerId: string }, secret: string): Promise<SecretRef>;
  resolve(ref: SecretRef): Promise<string>;
  remove(ref: SecretRef): Promise<void>;
  status(ref: SecretRef): Promise<SecretStatus>;
}
```

- 新建或替换凭证只能生成 `keychain:` 引用。
- `env:NAME` 仅允许解析现有宿主环境变量，不允许通过 API 写入或修改环境变量。
- 旧的裸环境变量名在迁移时规范为 `env:<NAME>`；其他不合法值使对应 Provider 进入 `missing`，不删除 Provider。
- `resolve()` 只允许在服务端执行组装点调用；返回值不得进入可序列化 domain 对象。
- Provider、Deployment、Route 和 Session 只保存引用，不拥有 Secret 生命周期。

### Provider Boundary

```ts
interface ProviderConnectionConfig {
  id: string;
  name: string;
  protocol: "openai-compatible" | "anthropic-compatible";
  baseUrl: string;
  credentialRef?: SecretRef;
  supportedEngineIds: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProviderConnectionSummary extends Omit<ProviderConnectionConfig, "credentialRef"> {
  credentialStatus: SecretStatus;
  hasCredential: boolean;
}
```

- `supportedEngineIds` 表示 Provider 可注入的 CLI Engine/Profile family，不是 Agent Backend ID。
- HTTPS 是默认要求；仅 `localhost` 与 `127.0.0.1` 可显式使用 HTTP。
- 停用 Provider 不删除 Secret；删除 Provider 时，仅在没有其他引用后删除其 `keychain:` Secret。
- 运行中进程已获得的环境副本不回收；后续启动和 Attempt 必须重新解析 Secret 状态。

## Application

- `ApplicationDependencies` 新增 `secretStore: SecretStore`，由生产 bootstrap 注入；测试必须显式注入内存实现。
- `resolveLaunch`、spawn chat、persistent chat 三条执行路径在启动前通过统一 Provider launch resolver 获取临时 env 增量；任何路径不得自行读取 Keychain。
- Secret 解析后只存在于调用栈局部变量和最终 spawn env；logger context、API error details、Attempt snapshot 与 Transcript metadata 必须经过 redaction。
- Web/开发模式没有生产系统凭证适配器时，创建/替换凭证返回 `SECRET_STORE_UNAVAILABLE`；已有 `env:` 引用仍可只读使用。
- readonly 模式拒绝 Provider 与凭证写操作，但允许状态查询和已有 Session 历史读取。

## Repository

- `shared/model-provider.ts`: Provider/SecretRef/summary 合同的唯一来源。
- `server/ports.ts`: `SecretStore` port。
- `server/secret-store.ts`: composite、environment 和测试实现；平台生产实现通过 bootstrap 组装。
- `server/application.ts`: credential API、Provider summary 装饰与 launch 解析调用。
- `server/store.ts`: v5 → v6 迁移、备份和宽容读取。
- `server/*test.ts`: SecretStore、API、迁移、redaction 和并发覆盖。
- `src-tauri/`: 打包桌面的系统凭证适配能力及最小权限声明；若引入依赖必须更新 lockfile 并记录原因。

## API

### Provider Metadata

- `GET /api/providers`：返回 Provider summaries，不含 `credentialRef` 或 Secret。
- `POST /api/providers`：创建无凭证 Provider；Provider ID 重复或字段非法返回 400 `VALIDATION_FAILED`。
- `PATCH /api/providers/:id`：只更新非秘密字段；不存在返回 404 `PROVIDER_NOT_FOUND`。
- `DELETE /api/providers/:id`：引用检查通过后删除；冲突返回 409 `PROVIDER_IN_USE`。

### Provider Credential

- `PUT /api/providers/:id/credential`

```json
{ "secret": "<write-only value>" }
```

成功返回：

```json
{ "providerId": "provider-1", "credentialStatus": "configured" }
```

- `DELETE /api/providers/:id/credential`：删除 `keychain:` Secret 并清除引用；`env:` 兼容引用只清除 Provider 关联，不修改环境。
- credential 请求体不得由通用 request logger、错误序列化或测试快照记录。
- mutation 端点沿用 loopback authorization、CSRF capability 和 readonly 保护。

## Error Semantics

| Code | HTTP | Retryable | Meaning |
| --- | --- | --- | --- |
| `SECRET_STORE_UNAVAILABLE` | 503 | yes | 当前平台没有可用系统凭证服务 |
| `PROVIDER_SECRET_MISSING` | 409 | no | Provider 没有可解析凭证 |
| `PROVIDER_NOT_FOUND` | 404 | no | Provider ID 不存在 |
| `PROVIDER_IN_USE` | 409 | no | Provider 仍被 Deployment/Session 引用 |
| `PROVIDER_ENDPOINT_INVALID` | 400 | no | Endpoint 不满足 TLS/localhost 规则 |
| `SECRET_WRITE_FAILED` | 503 | yes | 系统凭证服务拒绝或未完成写入 |
| `SECRET_DELETE_FAILED` | 503 | yes | 删除未完成，Provider 引用保持原状 |

错误 message 可包含 Provider 名称和 Secret 状态，不得包含 Secret、认证头或完整 spawn env。

## Database Impact

无数据库。AppState schema v5 → v6：

1. 写入前复制 `state.json.v5.bak`，已存在时不覆盖。
2. 合法环境变量名规范为 `env:<NAME>`。
3. 不合法旧引用清除为 undefined，同时 Provider 保留并显示 `missing`。
4. 新增 `supportedEngineIds`、`enabled` 和时间字段采用宽容默认值。
5. 完成全量验证后原子写入 v6；失败保留原文件且不启动 Agent。

Secret 本体不参与迁移，也不能从环境变量复制进 Keychain。

## Security

- Secret 写入路由使用独立的 body size 上限，并禁止 access/body logging。
- SecretStore 错误 cause 在跨 API 边界前脱敏。
- `credentialRef` 是不透明定位符，不可作为授权凭据。
- Provider Endpoint 不允许内嵌 username/password；非 loopback HTTP 被拒绝。
- 自动化扫描至少覆盖 state JSON、Provider API fixture、logger sink、Transcript JSONL 和错误响应。

## Test Plan

- **SecretStore unit**：put/resolve/remove/status；环境引用只读；替换失败保持旧引用；并发替换只有一个最终引用。
- **Provider API**：metadata CRUD、credential 写入/删除、readonly、CSRF、body 上限、Provider in-use。
- **Migration**：v5 裸 env 名 → `env:`；坏引用 → missing；备份一次；重复迁移；失败不写入。
- **Execution integration**：terminal、spawn chat、persistent chat 都通过同一 resolver 获取 env；缺 Secret 均在 spawn 前失败。
- **Security**：向 API 写入唯一 canary，断言 state、API、日志、Transcript、Attempt fixture 均不含 canary。
- **Platform**：macOS Keychain、Windows Credential Manager、Linux Secret Service 的可用/不可用路径；未验证平台不得声明 accepted。

## Definition of Done

- [ ] SecretStore port、生产/兼容/测试适配器和 Provider 合同交付
- [ ] v5 → v6 迁移、备份和失败保护通过
- [ ] 三条 CLI 执行路径不泄漏 Secret 且共享同一解析入口
- [ ] Provider 与 credential API 满足稳定错误和 readonly/CSRF 合同
- [ ] `npm --prefix cli-gui run test`、`npm --prefix cli-gui run build` 通过
- [ ] 平台凭证可用性证据归档；未执行的平台明确列为 release blocker
- [ ] 实施记录写入 `implementation/CLI-GUI-028-*.md`
