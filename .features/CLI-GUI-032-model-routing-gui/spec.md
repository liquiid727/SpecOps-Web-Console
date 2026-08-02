# CLI-GUI-032 Model Routing GUI and Recovery UX

## Meta

- Spec ID: `CLI-GUI-032`
- Spec Version: `1.0`
- Title: Model Routing GUI and Recovery UX（模型路由配置与恢复交互）
- Epic: MVP02-B Model Management
- Status: approved
- Owner Agent: implementation-agent
- Source PRD: `.prd/prd-cli-gui-multi-provider-model-routing.md`
- Covered Requirements: `US-001..US-005`, `US-008`, `FR-24..FR-26`
- Depends On: `CLI-GUI-028`, `CLI-GUI-029`, `CLI-GUI-030`, `CLI-GUI-031`
- Prerequisites: Provider/Deployment/Route/Task APIs and errors are stable；ClientRuntime remains the only business UI transport boundary
- Risk Tier: `P1`
- Quality Profile: component + state + accessibility + responsive + browser E2E
- Approval Evidence: 用户于 2026-08-02 确认父 PRD，并要求直接生成对应 SPEC 与 Issues

## Goal

在现有 Settings、New Session、Composer 和 Transcript 工作流中交付完整的 Provider、Deployment、Route 和 Attempt 体验。用户在发送前看到 resolved Route、首选模型与来源；运行后看到每个 Attempt、fallback 原因和可执行恢复操作。UI 不复制路由算法，也不伪造 Backend 尚未提供的能力。

独立成片理由：本 SPEC 只消费 `028-031` 的稳定合同，集中处理信息架构、状态、i18n、键盘、响应式和浏览器证据。

## Why This Exists

已有 Settings Models 只展示 Profile 模型目录，新建 Session/Composer 只选择模型字符串。即使后端存在 Route，没有一致 GUI 仍会导致用户无法理解配置来源、固定候选和自动降级，也无法安全确认副作用后的重试。

## Out of Scope

- 不在前端实现 Route filtering、fallback decision 或 Secret 解析。
- 不新增直接 API Provider、A/B、Pipeline、Agent Slot 或质量评分界面。
- 不为 terminal/不支持 Engine 展示可用但无行为的 Route 控件。
- 不引入新全局状态库、视觉体系或硬编码文案/颜色。
- 不在业务组件中使用原生 button/input/select/textarea。

## Deliverables

- Settings > Models 下 `Providers / Deployments / Routes` 三个子视图。
- write-only Provider credential 表单、Deployment CRUD 和 Route 有序编辑器。
- NewSession Route 继承/覆盖与 Composer resolved Route/per-run fixed candidate。
- Attempt timeline/cards、fallback 状态、候选耗尽与副作用确认 Dialog。
- ClientRuntime RoutingPort/ExecutionPort、Mock fixtures 与稳定 DOM contracts。
- EN/ZH、键盘、焦点、响应式和 Chrome E2E 证据。

## Domain

- 前端只消费 ProviderSummary、ModelDeploymentSummary、ResolvedRoute、ExecutionTask/Attempt summary 和稳定 error code。
- resolved Route、candidate eligibility、fallback decision、Attempt 终态和 Secret 状态均由服务端提供，客户端不得重新计算。
- per-run fixed Deployment 是 Composer 瞬态输入；它不进入 Session/AppState，并在一次 send 结束后清除。
- Machine code、domain ID 和用户可见翻译分离；删除/归档后仍使用 snapshot 名称展示历史 Attempt。

## UI Information Architecture

### Settings > Models

使用现有 `SettingsView` 的 Models 主入口，内部使用 `Tabs`：

1. `Providers`：复用 `CLI-GUI-027/028` Provider CRUD，显示 protocol、Endpoint、适用 Engine、启停和 credential status。Secret 只提供设置/替换/删除动作，永不回显。
2. `Deployments`：列表显示名称、Provider、Profile/Engine、modelId、eligibility 和 exclusions；编辑表单只引用现有资源。
3. `Routes`：列表和编辑器显示有序 Deployment candidates、技术故障自动降级 toggle 和当前引用范围。

每个视图覆盖：

- loading：保留已加载稳定内容，局部显示 pending。
- empty：说明下一步并提供一个明确主操作。
- success：列表、状态和引用范围可扫描。
- failure：显示机器错误映射后的说明与 retry/settings action。
- readonly：所有 mutation 禁用并说明原因，读取状态仍可用。

### Route Ordering

- 使用现有 `@dnd-kit/sortable`，同时提供上移/下移 IconButton。
- 键盘排序后通过 aria-live 宣告新位置；候选行保持稳定高度。
- 不可执行候选保留在配置中并显示全部 exclusion reasons，不自动移除。
- 最多 8 个候选；达到上限时 Add action 禁用并说明。

### New Session

- Chat Session 提供“继承项目 Route”与“显式 Route”选择。
- 选择后显示首选 Deployment/模型、来源和不可执行候选提示。
- terminal 或 unsupported Engine 隐藏 Route selector，并显示结构化路由不可用原因。
- 无可执行候选时 Create/Send 阻断，并提供打开 Settings > Routes 的动作。

### Composer

- 只提供一个 Route control 入口，不并列多个 Provider/model dropdown。
- 入口摘要展示 resolved Route、实际首选模型和来源层级。
- 菜单区分：查看继承、修改 Session Route、仅本次固定 Deployment。
- per-run fixed selection 在 send success/failure/cancel 后清除；第二次发送恢复继承。
- fixed target 不可用时禁用发送并显示明确原因，不自动选择其他模型。

### Attempt And Recovery

- Attempt 用结构化 card/timeline 展示 ordinal、trigger、Provider、model、state、duration 和 error code。
- primary 失败后保留原卡；automatic fallback 新建下一张卡并显示原因。
- awaiting_confirmation 使用 `Overlay` Dialog，展示输入引用、第一 Attempt、已观察 effect、下一候选和 Confirm/Cancel。
- 候选耗尽显示 ordered redacted chain，并提供编辑 Route、修复凭证、固定候选或重新运行中适用的动作。
- 刷新/重连后从 ExecutionRepository API/Transcript projection 恢复，不依赖临时 WebSocket 帧。

## Component Contracts

- 复用 `Tabs`、`Select`、`TextField`、`Button`、`IconButton`、`Badge`、`Feedback`、`EmptyState`、`Overlay`。
- 复用 `AsyncState`、`ResourceRow`、`SettingsSection`、`DialogActions`。
- 可新增业务组件：`ProviderConnectionsSettings`、`ModelDeploymentsSettings`、`ModelRoutesSettings`、`RouteCandidateList`、`ResolvedRouteControl`、`AttemptTimeline`、`FallbackConfirmationDialog`。
- 业务样式放 `qoder.css`；可复用组件状态放 `components.css`；全部使用 semantic tokens。
- 若视觉合同变化，同步 `cli-gui/DESIGN.md` 和所有 theme mappings。

## Client Runtime

```ts
type RoutingPort = Pick<ApiFacade,
  | "providers"
  | "setProviderCredential"
  | "deleteProviderCredential"
  | "modelDeployments"
  | "createModelDeployment"
  | "updateModelDeployment"
  | "deleteModelDeployment"
  | "modelRoutes"
  | "createModelRoute"
  | "updateModelRoute"
  | "deleteModelRoute"
  | "resolveSessionModelRoute"
>;

type ExecutionPort = Pick<ApiFacade,
  | "executionTasks"
  | "executionTask"
  | "confirmExecutionRetry"
>;
```

- `SessionPort` 扩展 update Session Route；sendMessage 接收可选 one-shot routeOverride。
- MockClientRuntime 提供 deterministic Provider/Deployment/Route/Attempt fixtures 和错误场景。
- Zustand 只镜像 server state；Route 算法和 Attempt 终态不进入客户端推断逻辑。

## Stable UI States And DOM

- `data-model-routing-view="providers|deployments|routes"`
- `data-provider-id`、`data-deployment-id`、`data-route-id`
- `data-route-source="system|global|project|session|run"`
- `data-attempt-id`、`data-attempt-state`、`data-attempt-trigger`
- `data-fallback-confirmation` 只在 Task awaiting_confirmation 时存在。

这些属性用于测试选择器，不承载可见文案或业务决策。

## Application

- `SettingsView` 通过 RoutingPort 加载/修改 Provider、Deployment 和 Route；每个 mutation 使用 pending guard 和 Feedback。
- `NewSessionDialog` 与 `PromptComposer` 调用服务端 resolve/preflight，禁止从本地数组推断首选候选。
- sendMessage 仅在用户选择 one-shot target 时附带 routeOverride；请求结束后清除瞬态值。
- `TranscriptPanel` 合并持久化 Task/Attempt summaries 和 live frames，以持久化 revision/ID 去重。
- refresh/reconnect 先恢复 server facts，再接收增量；加载失败保留已有稳定内容并提供 retry。

## Error Presentation

- `PROVIDER_SECRET_MISSING` → 打开 Provider credential action。
- `MODEL_DEPLOYMENT_INCOMPATIBLE` → 打开 Deployment edit action。
- `ROUTE_NO_CANDIDATE` → 打开 Route edit action。
- `ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE` → 清除 per-run fixed 或选择其他 eligible candidate。
- `ROUTE_REPLAY_CONFIRMATION_REQUIRED` → 打开 confirmation Dialog。
- `ROUTE_FALLBACK_EXHAUSTED` → 展示 ordered Attempt chain。
- `TASK_CANCELLED` → 保留历史并允许用户主动重新运行。

机器 code 与用户文案分离；动态名称通过 `{{name}}` 参数化。

## Accessibility And Responsive Behavior

- Tabs、Menu、Dialog 延续现有 roving focus、Escape、outside dismiss 和 focus restore 合同。
- Route 排序具备键盘等价操作和 aria-live 顺序通知。
- credential field 使用 password input 语义，不提供 reveal/copy 已保存 Secret。
- 状态不能只依赖颜色；Badge 同时提供文本/图标。
- 1280px 保持工作台密度；900px 使用 drawer；640px Dialog/Settings 全屏且无水平滚动。
- 长 Provider/model/Route 名称与错误码换行或截断并提供 title，不覆盖相邻控件。
- reduced motion 下移除装饰动画，保留状态变化可见性。

## Repository

- `client/components/SettingsView.tsx` 及新的 routing settings 业务组件。
- `client/components/NewSessionDialog.tsx`、`PromptComposer.tsx`、`TranscriptPanel.tsx`/cards。
- `client/runtime/client-runtime.tsx`、mock runtime、`client/api.ts`。
- `client/i18n.tsx`：全部 en/zh keys。
- `client/styles/qoder.css`、`components.css`、themes（仅必要变化）。
- component tests、`e2e/workbench.spec.ts` 或独立 routing E2E spec。

## API

UI 只消费 `CLI-GUI-028..031` API。Mutation 使用现有 Feedback/error mapping；重复提交在 pending 时禁用。Secret request body 不写入 client store、localStorage、analytics 或 test snapshots。

## Database Impact

无数据库和服务端 schema 变更。本 SPEC 只消费 `CLI-GUI-028..031` 已定义的持久化合同；UI preferences 不保存 Provider、Deployment、Route、Secret 或 Attempt 事实，只保留现有纯展示偏好。

## Test Plan

- **Components**：三子视图、CRUD、readonly、empty/loading/success/failure、长名称。
- **Route editor**：drag、keyboard up/down、8 候选限制、excluded reasons、focus restore。
- **Session/composer**：inherit/explicit/fixed、fixed 清除、第二次发送、unsupported Engine、send blocking。
- **Attempts**：primary/fallback/confirmation/exhausted/cancel/completed、refresh recovery、无重复终态。
- **i18n/a11y**：EN/ZH keys、accessible names、aria-live、Dialog focus trap、Escape/focus return。
- **Responsive**：1280、900、640 viewport；无横向滚动/重叠/溢出。
- **Browser E2E**：Provider credential → Deployment → Route → Session → primary failure → automatic fallback；side-effect → confirmation；cancel 不 fallback；刷新历史仍在。

## Definition of Done

- [ ] Providers/Deployments/Routes Settings 完整状态和 CRUD 交付
- [ ] Session/Composer resolved Route、来源和 per-run fixed 交付
- [ ] Attempt timeline、confirmation 和 exhaustion recovery 交付
- [ ] 所有新增 copy en/zh；业务组件只使用内部 primitives/patterns
- [ ] `npm --prefix cli-gui run ui:check`、`test`、`build`、`test:e2e` 通过
- [ ] Google Chrome 中 EN/ZH、1280/900/640 和第二次交互证据归档
- [ ] 实施记录写入 `implementation/CLI-GUI-032-*.md`
