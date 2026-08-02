# CLI-GUI-030 Priority Model Routes and Configuration Resolution

## Meta

- Spec ID: `CLI-GUI-030`
- Spec Version: `1.0`
- Title: Priority Model Routes and Configuration Resolution（优先级路由与配置解析）
- Epic: MVP02-B Model Management
- Status: approved
- Owner Agent: implementation-agent
- Source PRD: `.prd/prd-cli-gui-multi-provider-model-routing.md`
- Covered Requirements: `US-003..US-005`, `US-009`（Route 兼容部分）, `FR-1`, `FR-8..FR-14`, `FR-24`, `FR-27..FR-28`
- Depends On: `CLI-GUI-029`
- Prerequisites: Deployment summaries expose deterministic eligibility/exclusion reasons；Session/Workspace state remains server authoritative
- Risk Tier: `P0`
- Quality Profile: pure domain + API contracts + migration + compatibility
- Approval Evidence: 用户于 2026-08-02 确认父 PRD，并要求直接生成对应 SPEC 与 Issues

## Goal

提供有序 Deployment Route、全局/项目/Session/单次运行覆盖和可解释的纯 Route Resolver。发送前系统返回完整候选、排除原因、首选目标和字段级来源；固定 Deployment 不可执行时必须阻断，不能静默改选。

独立成片理由：本 SPEC 只决定“本次可以选择什么”，不启动 Agent、不创建 Attempt、不实现 fallback。

## Why This Exists

Provider 和 Deployment 解决“怎样连接”和“可执行目标是什么”，但仍缺少稳定的候选顺序与继承语义。若把解析散落到 Settings、Session 创建和 Composer 中，不同 UI 会得到不同默认模型，也无法解释覆盖来源。

## Out of Scope

- 不启动 AgentBackend 或创建 ExecutionAttempt。
- 不实现技术故障 fallback、质量重试、A/B、权重、成本或延迟策略。
- 不写入或修改 Workspace 内的配置文件。
- 不实现 Route/Composer GUI；GUI 由 `CLI-GUI-032` 交付。
- 不把 AgentBackend transport fallback 计入 Model Route。

## Deliverables

- `PriorityModelRoute`、`RouteBinding`、`ResolvedRoute` shared 合同。
- 纯 `resolveModelRoute()` 及全 precedence/exclusion 测试矩阵。
- AppState schema v7 → v8，保存 routes、global/workspace/session bindings。
- Route CRUD、resolve/preflight、Session binding 和 per-run override API。
- legacy no-route resolution 与恢复/继承合同。

## Domain

```ts
interface PriorityModelRoute {
  id: string;
  name: string;
  enabled: boolean;
  candidateDeploymentIds: string[];
  automaticTechnicalFallback: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

interface RouteBinding {
  routeId?: string;
  source: "system" | "global" | "project" | "session";
}

interface RunRouteOverride {
  fixedDeploymentId: string;
}

type RouteExclusionCode =
  | "route-disabled"
  | "deployment-missing"
  | "deployment-disabled"
  | "deployment-archived"
  | "provider-disabled"
  | "credential-missing"
  | "engine-incompatible"
  | "model-unverified";

interface ResolvedRouteCandidate {
  deploymentId: string;
  position: number;
  eligible: boolean;
  exclusionCodes: RouteExclusionCode[];
}

interface ResolvedRoute {
  kind: "route" | "legacy-profile-model";
  routeId?: string;
  resolvedAt: string;
  sourceTrace: Array<{ field: string; source: RouteBinding["source"] | "run"; value?: string }>;
  candidates: ResolvedRouteCandidate[];
  executableCandidates: ResolvedRouteCandidate[];
  selectedDeploymentId?: string;
  fixedDeploymentId?: string;
  canSend: boolean;
}
```

### Resolution Precedence

```text
system default < user global < project/workspace < session < per-run fixed deployment
```

- 每层只覆盖显式声明字段；`undefined` 表示继承，不表示清空。
- 项目层第一阶段是 AppState 中按 `workspaceId` 保存的 binding；它只能引用已存在的全局 Route ID。
- Session binding 只影响下一次尚未开始的运行，不修改正在执行的 resolved snapshot。
- per-run override 不持久化；发送完成、失败或取消后均清除客户端临时选择。
- fixed Deployment 必须属于最终 Route 且 eligible；否则 `canSend=false` 并返回稳定错误，绝不选其他候选。
- 没有 Route binding 的旧 Session 返回 `legacy-profile-model`，继续使用现有 Profile/model 链路。

### Route Invariants

- Route ID 创建后不可修改；candidate IDs 有序、去重、至少 1 个、最多 8 个。
- Route 可以保存包含当前不可执行候选的配置，但 resolve 必须保留顺序并返回排除原因。
- archived Route 只供历史 snapshot 读取，不可绑定新 Session。
- model catalog 明确 `model_not_found` 属配置错误；只有运行时稳定错误 `MODEL_TEMPORARILY_UNAVAILABLE` 才可能在 `CLI-GUI-031` fallback。
- 本阶段不持久化 Provider 健康状态或动态重排候选。

## Core Algorithm

`resolveModelRoute(input)` 必须是无 I/O 纯函数：

1. 逐层合并 system/global/project/session bindings，并记录字段 provenance。
2. 若没有 routeId，返回 legacy resolution。
3. 按 Route 原始顺序展开 Deployment summaries。
4. 为每个 candidate 计算全部 exclusion codes，不在首个错误处停止。
5. 生成 executableCandidates，保留原位置。
6. 若有 fixedDeploymentId，验证其属于 Route 且 eligible；失败返回不可发送结果。
7. 否则选择第一个 executable candidate。
8. 无 executable candidate 时返回 `ROUTE_NO_CANDIDATE` 所需详情。

Resolver 不访问 SecretStore、filesystem、state repository、CLI 或网络；调用方先提供 summaries。

## Application

- Settings/Session/API 调用同一个 resolver，禁止复制候选过滤逻辑。
- message send 在接受 202 前执行 resolve；不可发送时不创建 user message、不启动进程。
- 成功 preflight 的 ResolvedRoute 在 `CLI-GUI-031` 中被冻结为 Task snapshot；执行中不重新解析。
- Workspace binding 通过 GUI/API 写入 AppState，不读取不受信任项目文件。
- Route/Deployment archive 仅影响后续 resolve；运行中 Session 使用已冻结配置。

## Repository

- `shared/model-route.ts`: Route/binding/resolution/exclusion 合同。
- `server/model-route-resolver.ts`: pure resolver。
- `server/application.ts`: Route CRUD、binding、resolve/preflight。
- `server/store.ts`: v7 → v8 migration。
- `client/runtime/client-runtime.tsx`: 后续 GUI 可消费的 RoutingPort contract。
- `server/model-route*.test.ts`: precedence、过滤、API、migration、legacy。

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/model-routes` | 列出 Route summaries |
| `POST` | `/api/model-routes` | 创建有序 Route |
| `GET` | `/api/model-routes/:id` | 读取 Route |
| `PATCH` | `/api/model-routes/:id` | 更新名称、候选、fallback flag、enabled |
| `DELETE` | `/api/model-routes/:id` | archive Route |
| `PUT` | `/api/model-routing/global` | 设置/清除全局 binding |
| `PUT` | `/api/workspaces/:id/model-route` | 设置/清除项目 binding |
| `PATCH` | `/api/sessions/:id` | 扩展可选 `routeId` 与 expectedRevision |
| `POST` | `/api/sessions/:id/model-route/resolve` | 解析 Session，可选 fixedDeploymentId |

发送请求扩展：

```json
{
  "prompt": "Implement the approved issue",
  "clientMessageId": "client-message-1",
  "routeOverride": { "fixedDeploymentId": "deployment-codex-primary" }
}
```

旧客户端省略新字段时行为保持兼容。

## Error Semantics

| Code | HTTP | Meaning |
| --- | --- | --- |
| `MODEL_ROUTE_NOT_FOUND` | 404 | Route 不存在 |
| `MODEL_ROUTE_DUPLICATE` | 409 | Route ID 已存在 |
| `MODEL_ROUTE_INVALID` | 400 | 候选为空、重复或超过 8 个 |
| `MODEL_ROUTE_IN_USE` | 409 | archive 前仍有活动 binding |
| `ROUTE_NO_CANDIDATE` | 409 | 所有候选均被排除 |
| `ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE` | 409 | per-run 固定目标不属于 Route 或不可执行 |
| `ROUTE_BINDING_INVALID` | 400 | binding 指向不存在/archived Route |
| `ROUTE_UNSUPPORTED_ENGINE` | 409 | 当前 Session/Engine 不支持结构化 Route |

## Database Impact

无数据库。AppState schema v7 → v8：

- 新增 `modelRoutes: []`、可选 `globalModelRouteId`、`workspaceModelRouteBindings: []`。
- Session 新增可选 `modelRouteId`；缺省表示继承/legacy。
- 不迁移旧 model string 为 Route/Deployment ID。
- 迁移前创建 v7 backup；验证失败不写入且不启动 Agent。

## Test Plan

- **Resolver precedence**：system/global/project/session/run 所有覆盖组合及 sourceTrace。
- **Filtering**：每个 exclusion code、多原因候选、顺序稳定、8 候选边界。
- **Fixed**：eligible、非 Route 成员、disabled、missing、发送后不持久化。
- **API**：CRUD、bindings、revision conflict、readonly、resolve/preflight、不发送行为。
- **Legacy**：无 Route 的 launch/active/default model、terminal、不支持 Engine、resume/fork。
- **Migration**：v7 → v8、backup、重复迁移、坏引用、失败不启动。

## Definition of Done

- [ ] Route/binding/resolution 合同和 pure resolver 完成
- [ ] precedence、provenance 和全部 exclusion 测试通过
- [ ] Route CRUD、global/project/session binding、per-run preflight 完成
- [ ] v7 → v8 migration 和 legacy no-route 回归通过
- [ ] `npm --prefix cli-gui run test`、`npm --prefix cli-gui run build` 通过
- [ ] 实施记录写入 `implementation/CLI-GUI-030-*.md`
