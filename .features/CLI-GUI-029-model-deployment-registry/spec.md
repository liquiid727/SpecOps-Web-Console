# CLI-GUI-029 Model Deployment Registry

## Meta

- Spec ID: `CLI-GUI-029`
- Spec Version: `1.0`
- Title: Model Deployment Registry（模型部署目录）
- Epic: MVP02-B Model Management
- Status: approved
- Owner Agent: implementation-agent
- Source PRD: `.prd/prd-cli-gui-multi-provider-model-routing.md`
- Covered Requirements: `US-002`, `US-009`, `FR-1..FR-3`, `FR-8`, `FR-10`, `FR-27..FR-29`
- Depends On: `CLI-GUI-026`, `CLI-GUI-028`
- Prerequisites: Provider summaries expose protocol, engine compatibility and Secret status；Profile capabilities/models remain authoritative
- Risk Tier: `P0`
- Quality Profile: domain + API + migration + compatibility
- Approval Evidence: 用户于 2026-08-02 确认父 PRD，并要求直接生成对应 SPEC 与 Issues

## Goal

引入稳定的 `ModelDeployment`，把 Provider、CLI Profile/Engine 和模型 ID 组合成可校验、可引用、可归档的执行目标。Route 只能引用 Deployment ID，不得继续使用裸 `providerId + model string`，也不得把 Profile、Provider 或 Agent Backend 的 ID 相互替代。

独立成片理由：Deployment 是模型目录与 Route 之间的稳定边界，拥有独立 CRUD、capability 校验、legacy 兼容和 schema 迁移。

## Why This Exists

现有 `launchConfig.model` 和 `activeModel` 只能表达某个 Profile 下的模型名，无法区分同模型经不同供应商、端点或凭证执行的情况。Provider 则只描述连接方式，不能直接作为 Route 候选。Deployment 为后续优先级路由提供稳定且可验证的引用。

## Out of Scope

- 不实现 Route、配置覆盖、自动降级或 Attempt。
- 不执行 Provider 健康探测、余额查询或动态质量统计。
- 不直接调用供应商 API。
- 不批量伪造 legacy Deployment 以替代所有旧模型字符串。
- 不提供 Deployment GUI；GUI 由 `CLI-GUI-032` 交付。

## Deliverables

- `ModelDeploymentConfig`、`ModelDeploymentSummary`、capability snapshot 合同。
- AppState schema v6 → v7 迁移及部署目录持久化。
- Deployment CRUD 与引用保护 API。
- Provider/Profile/模型/capability 兼容性校验器。
- legacy Profile/model resolution，保持旧 Session 无 Route 行为。
- 归档/tombstone 与历史引用测试。

## Domain

```ts
interface ModelDeploymentConfig {
  id: string;
  name: string;
  providerId: string;
  profileId: string;
  modelId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

interface DeploymentCapabilitySnapshot {
  source: "profile-probe" | "configured";
  observedAt: string;
  modelPresent: boolean;
  nativeSession: boolean | "unknown";
  toolCalling: boolean | "unknown";
  codeEditing: boolean | "unknown";
  contextWindow?: number;
}

interface ModelDeploymentSummary extends ModelDeploymentConfig {
  providerName?: string;
  profileName?: string;
  credentialStatus: SecretStatus;
  capability: DeploymentCapabilitySnapshot;
  eligibility: "eligible" | "disabled" | "archived" | "invalid" | "unknown";
  exclusionCodes: DeploymentExclusionCode[];
}
```

### Invariants

- `id` 创建后不可修改；name 可修改但不参与身份解析。
- 一个 Deployment 精确引用一个 `providerId + profileId + modelId`。
- Provider protocol 必须与 Profile adapter family 兼容。
- `modelId` 必须出现在 Profile capability 的 merged model catalog；目录暂时不可读时 summary 为 `unknown`，不得伪报 eligible。
- Secret 缺失、Provider/Profile/模型缺失、对象停用或 archived 均生成明确 exclusion code。
- 删除语义为 archive；被 Route 或历史引用的 Deployment 不物理移除。
- capability snapshot 是可解释的最近观测，不是供应商健康状态，也不是自动路由评分。

### Legacy Resolution

无 Route 的旧 Session 继续以以下只读结构执行：

```ts
interface LegacyModelResolution {
  kind: "legacy-profile-model";
  profileId: string;
  modelId: string | null;
  source: "launch-config" | "active-model" | "profile-default";
}
```

- 不将 `modelId` 或拼接字符串伪装成 Deployment ID。
- 只有用户创建 Route 或显式转换时才创建真实 Deployment。
- 旧 resume/fork 保留原 `profileId`、`BackendSessionRef` 和模型语义。

## Application

- Deployment validator 消费 Provider summary、Profile、capability/model catalog，不访问进程或 Secret 本体。
- 创建和更新先执行结构校验，再执行引用与兼容性校验；capability 暂不可用时允许保存为 disabled/unknown，但不能启用。
- Session 无 Route 时调用 legacy resolver；有 Route 时后续由 `CLI-GUI-030` 解析 Deployment。
- archive 前返回活动 Route/Session 引用；强制 archive 只能使未来解析不可用，不能修改运行中进程或历史记录。
- `resolveLaunch` 仍由 ProfileAdapter/AgentBackend 执行；Deployment 只提供冻结的配置输入。

## Repository

- `shared/model-deployment.ts`: config、summary、snapshot、exclusion codes。
- `shared/types.ts`: 稳定 re-export。
- `server/deployment-registry.ts`: validator 与 registry domain service。
- `server/application.ts`: CRUD 路由及 summary 装饰。
- `server/store.ts`: v6 → v7 migration。
- `server/model-deployment*.test.ts`: domain/API/migration/legacy 覆盖。

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/model-deployments` | 返回包含 eligibility/exclusions 的 summaries |
| `POST` | `/api/model-deployments` | 创建 Deployment |
| `GET` | `/api/model-deployments/:id` | 返回单个 summary |
| `PATCH` | `/api/model-deployments/:id` | 修改 name、引用或 enabled；ID 不可改 |
| `DELETE` | `/api/model-deployments/:id` | archive Deployment |

创建请求示例：

```json
{
  "id": "deployment-codex-primary",
  "name": "Codex Primary",
  "providerId": "provider-openai-compatible",
  "profileId": "profile-codex",
  "modelId": "gpt-5.6",
  "enabled": true
}
```

API 不返回 Secret 或注入 env。readonly 模式拒绝 mutation。

## Error Semantics

| Code | HTTP | Meaning |
| --- | --- | --- |
| `MODEL_DEPLOYMENT_NOT_FOUND` | 404 | ID 不存在 |
| `MODEL_DEPLOYMENT_DUPLICATE` | 409 | ID 已存在 |
| `MODEL_DEPLOYMENT_IN_USE` | 409 | archive 前仍有活动引用 |
| `MODEL_DEPLOYMENT_INCOMPATIBLE` | 400 | Provider/Profile 协议不匹配 |
| `MODEL_DEPLOYMENT_MODEL_UNKNOWN` | 400 | 启用时模型不在已验证目录 |
| `MODEL_DEPLOYMENT_CREDENTIAL_MISSING` | 409 | 启用时 Provider Secret 不可用 |
| `MODEL_DEPLOYMENT_ARCHIVED` | 409 | archived 对象不可再次启用 |

## Database Impact

无数据库。AppState schema v6 → v7：

- 新增 `modelDeployments: []`。
- 旧 Session 保持原字段，不自动创建 Deployment。
- 迁移前创建 `state.json.v6.bak`，验证成功后原子写入。
- 旧代码宽容忽略新数组；回滚后 Route 功能不可用，但旧 Session 仍可按 Profile/model 启动。

## Test Plan

- **Domain**：ID/引用不变式、协议矩阵、catalog 命中、unknown/disabled/archived、重复组合。
- **API**：CRUD、readonly、in-use、summary 不含 Secret、capability 失败降级。
- **Migration**：v6 → v7、重复迁移、坏 Deployment、备份、失败不写入。
- **Legacy**：launch model、active model、profile default、resume、fork、删除 Profile/Provider 后错误。
- **History**：archive 不影响冻结 snapshot；不存在活跃引用时保持 tombstone 可读。

## Definition of Done

- [ ] Deployment shared contract、registry、CRUD 和 exclusions 完成
- [ ] v6 → v7 迁移与备份通过
- [ ] legacy Session/模型行为无回归
- [ ] Provider/Profile/模型兼容性和 Secret 状态校验覆盖
- [ ] `npm --prefix cli-gui run test`、`npm --prefix cli-gui run build` 通过
- [ ] 实施记录写入 `implementation/CLI-GUI-029-*.md`
