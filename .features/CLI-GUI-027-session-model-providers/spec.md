# CLI-GUI-027 Session Model Providers

## Meta

- Spec ID: `CLI-GUI-027`
- Spec Version: `1.0`
- Title: Session Model Providers（会话级模型供应商配置与注入）
- Epic: MVP02 — Model Management（PRD: 模型自动同步与会话级模型供应商）
- Status: approved
- Owner Agent: implementation-agent
- Source PRD: `.prd/prd-mvp02-model-auto-sync-and-session-providers.md`
- Covered Requirements: `US-003`, `US-004`, `US-005`, `FR-3..FR-8`
- Depends On: `CLI-GUI-026`（synced 层自动同步链路；provider 模型汇入依赖同一合并入口）
- Prerequisites: `shared/model-provider.ts` 的 `ModelProviderConfig` / `ModelProviderSummary` 契约（已存在、未消费）；schema v4 state 仓库与迁移框架
- Risk Tier: `P0`（涉及凭证引用与进程启动链路）
- Quality Profile: server 单测 + application 集成测试 + 浏览器验证
- Approval Evidence: 用户于 2026-07-31 会话中确认（决策：供应商与模型按会话粒度设置；env 注入、不改写用户全局 CLI 配置）

## Goal

用户可在 Settings 配置模型供应商（协议 + baseUrl + 凭证引用 + 模型列表），并在每个会话独立选择供应商与模型；供应商通过 CLI 进程启动时的环境变量 / CLI 参数注入生效，两个并行会话可同时使用不同供应商互不干扰。

独立成片理由：拥有独立的 schema 迁移（v4→v5）、独立的 API 面（provider CRUD）、独立的验收边界（并行会话隔离），且未配置 provider 时对现有行为零影响，可独立评审与发布。

## Why This Exists

kimi/glm 等 Claude 兼容供应商目前以硬编码 `CliAdapterId` 存在，每接入一家新供应商都要改 union type、内置目录与版本区间表；且用户无法在同一 adapter 下按会话切换端点。`ModelProviderConfig` 契约已预留（"credential/API catalogs, never runnable Agent Engines"），本 spec 是其首个消费实现。

## Out of Scope

- 全局（cc-switch 式）供应商切换；粒度仅会话级。
- 改写 `~/.claude/settings.json`、`~/.codex/config.toml` 等用户全局配置。
- 密钥托管/加密存储（keychain）；本期只存环境变量名引用。
- 移除 kimi/glm adapter 硬编码（后续清理 spec）。
- provider 端点连通性探测、余额/配额查询。
- generic adapter 的 provider 注入。

## Deliverables

- schema v5：AppState 新增 `providers: ModelProviderConfig[]`，session 新增 `providerId?: string`；v4→v5 迁移。
- provider CRUD API + 校验（baseUrl、credentialRef、协议枚举）。
- 启动链路 env/参数注入：`resolveLaunch` / `buildTurn` 扩展 `env` 透传至 PTY 与 headless 进程。
- Settings > Models 的 Providers 管理区块（列表/新增/编辑/删除，空/加载/失败状态）。
- 新建会话对话框与 composer 的按供应商分组模型选择。
- 单测 + 集成测试 + 浏览器验证记录。

## Domain

- **Provider 定义**：`ModelProviderConfig`（id、name、protocol ∈ `anthropic-compatible | openai-compatible`、baseUrl、credentialRef、models）。provider 是凭证/API 目录，不是可运行引擎，不进入 `CliAdapterId`。
- **协议适配不变式**：
  - `anthropic-compatible` 仅可绑定 claude 家族 profile 的会话，注入 `ANTHROPIC_BASE_URL=<baseUrl>`、`ANTHROPIC_AUTH_TOKEN=<宿主进程 env[credentialRef] 的值>`。
  - `openai-compatible` 仅可绑定 codex profile 的会话，经 `-c model_provider=<id>`（含 base_url/api key env 键的 `-c` 覆盖）参数透传，不写配置文件。
  - 协议与 profile adapter 不匹配时该 provider 在选择器中不可选。
- **凭证不变式**：`credentialRef` 只存环境变量名（`^[A-Z][A-Z0-9_]*$`）；持久化状态、日志、API 响应中禁止出现凭证值；会话创建时宿主 env 缺失该变量 → 阻断并返回含变量名的可操作错误（FR-8）。
- **会话隔离不变式**：`session.providerId` 在会话创建时冻结，restart/resume 沿用；运行中会话不受 provider 编辑/删除影响（进程 env 已注入）；删除被运行中会话引用的 provider 需确认警告。
- **baseUrl 校验**：必须为 `https://` URL；`http://localhost` 与 `http://127.0.0.1` 例外；非法输入 400 `VALIDATION_FAILED`。
- **模型汇入**：provider `models` 作为 synced 层来源进入 `mergeModelSources`（不新增第四层）；会话选定 provider 时选择器优先展示该 provider 模型；重名按 builtin > synced > custom 去重。
- **回归不变式**：`providerId` 缺省的会话走现有链路，行为与现状完全一致（FR-7）。

## Application

- provider 解析发生在会话启动组装点：读取 `session.providerId` → 校验协议匹配与凭证存在 → 生成 env 增量/`-c` 参数 → 并入 `resolveLaunch` / `buildTurn` 结果。
- `ProfileAdapterRegistry` 返回值扩展 `env?: Record<string, string>`；PTY 启动与 headless spawn 均以 `{...sanitizeCliEnvironment(process.env), ...env}` 组装。
- capability 探测不受 provider 影响（探测仍针对 profile 本体）。
- 前端通过 `ModelProviderSummary`（`configured` = 宿主 env 存在 credentialRef 变量）展示可用性，不回传凭证值。

## Repository

- `CURRENT_SCHEMA_VERSION` 4 → 5；迁移：v4 state 补 `providers: []`，session 无 `providerId` 保持 undefined。
- provider 条目宽容清洗（形状不符丢弃条目而非拒绝整份 state，沿用 store.ts 现有风格）。

## API

- `GET /api/providers` → `{ providers: ModelProviderSummary[] }`（不含凭证值）。
- `POST /api/providers` → 201；重复 id / 校验失败 → 400 `VALIDATION_FAILED`（含 field）。
- `PATCH /api/providers/:id` → 200；不存在 → 404。
- `DELETE /api/providers/:id` → 200；被运行中会话引用时仍允许删除（前端负责确认警告）。
- 会话创建请求体扩展可选 `providerId`；协议不匹配 → 400 `VALIDATION_FAILED`；凭证 env 缺失 → 400 `PROVIDER_CREDENTIAL_MISSING`（message 含变量名）。
- readonly 模式下全部写端点返回既有 readonly 错误语义。
- 兼容性：所有新字段可选；旧客户端不受影响；无鉴权变化（沿用现有本地回环授权）。

## Database Impact

none（无数据库）—— 但含 AppState schema v4→v5 迁移；回滚策略：v5 state 被 v4 代码读取时 providers 字段被忽略（宽容读取），session.providerId 丢弃后会话按默认链路启动。

## Test Plan

- **US-003 CRUD（集成，happy/error）**：创建/编辑/删除 provider；baseUrl 非法、credentialRef 非法、协议非法 → 400；GET 响应不含凭证值；readonly 拒绝写入。
- **US-004 注入（集成，happy/error/并发）**：anthropic provider 会话 spawn env 含 `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`（mock spawn 断言）；codex provider 生成 `-c` 参数；凭证 env 缺失阻断且错误含变量名；两个不同 provider 会话并行 spawn env 互不污染；resume 沿用 providerId；无 providerId 会话 env 与现状逐字段一致（回归）。
- **US-005 汇入（单测）**：provider models 进入合并列表 source=synced；重名去重优先级；选定 provider 时选择器排序。
- **迁移（单测）**：v4→v5 升级补默认值；坏 provider 条目被丢弃不拒载；v5 被旧代码宽容读取。
- **安全**：持久化文件与日志快照 grep 断言不含注入的 token 值（blocking）。
- **浏览器验证**：Providers 区块空/加载/失败状态、新建会话选 provider 分组、composer 分组展示。
- 阻断优先级：注入隔离、凭证不落盘、回归一致性为 blocking；UI 分组展示为 warning。

## Definition of Done

- [ ] 上述 Deliverables 全部落地，`shared/model-provider.ts` 为唯一类型来源
- [ ] schema v5 迁移含正反向兼容测试
- [ ] 注入、隔离、凭证、回归用例全绿，`cli-gui` 内 vitest 全绿
- [ ] Typecheck/lint 通过
- [ ] 浏览器验证证据（截图/记录）归档
- [ ] i18n：新增 UI 文案提供 zh/en 双语（cli-gui 既有 i18n 要求）
- [ ] 实施 handoff 记录至 `implementation/CLI-GUI-027-*.md`
