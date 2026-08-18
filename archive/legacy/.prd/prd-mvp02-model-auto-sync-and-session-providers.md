# PRD: 模型自动同步与会话级模型供应商

## Introduction

CLI GUI 当前的模型列表依赖三层来源合并（builtin > synced > custom，见 `cli-gui/server/model-catalog.ts`），但 synced 层只能通过 Settings 页手动点击 Sync 触发，且 kimi/glm 等 Claude 兼容供应商以硬编码 adapter 形式存在。本 PRD 覆盖两个递进的产品能力：

1. **模型自动检测（方案一）**：系统在会话创建 / capability 探测时自动从本机 CLI 配置（`~/.codex/config.toml`、`~/.claude/settings.json`）读取可用模型，使 composer 左下角的模型选择器无需手动同步即保持准确。
2. **会话级模型供应商（方案二）**：引入 Model Provider（凭证/API 目录，非可运行引擎，契约见 `cli-gui/shared/model-provider.ts`），每个会话可独立选择供应商与模型；供应商通过启动时环境变量注入生效，绝不改写用户全局 CLI 配置文件。

## Goals

- composer 模型选择器展示的列表与本机 CLI 实际可用模型保持一致，无需用户手动同步。
- 每个会话可独立指定 provider + model，互不影响，会话生命周期内稳定。
- 收敛 kimi/glm 硬编码：Claude 兼容供应商由 provider 配置表达，而非新增 `CliAdapterId`。
- 凭证只以引用（`credentialRef`）形式存储，AppState 与磁盘持久化中不出现明文密钥。
- 保持现有三层模型来源合并架构（builtin > synced > custom）不变，provider 模型汇入 synced 层。

## User Stories

### US-001: 会话创建时自动同步模型列表
**Description:** As a 用户, I want 新建会话时系统自动读取本机 CLI 配置里的模型 so that composer 模型选择器无需手动 Sync 即列出真实可用模型。

**Acceptance Criteria:**
- [ ] capability 探测（新建会话 / profile 变更触发）时自动执行一次被动同步（`readSyncedModels`），结果写入 `profile.syncedModels`
- [ ] 自动同步只走文件读取路径，不执行 CLI 子进程（`discoverModels` 仍仅由手动 Sync 触发）
- [ ] 同步失败（文件缺失/解析失败）静默回退为原 synced 列表，不阻断会话创建，Settings 页可见非阻断提示
- [ ] 自动同步结果带 TTL（默认 5 分钟内不重复读取）
- [ ] Typecheck/lint 通过

### US-002: 增强 CLI 配置解析覆盖
**Description:** As a 用户, I want 系统能识别更多配置形态里的模型 so that 我在 CLI 配置里声明的模型不会被遗漏。

**Acceptance Criteria:**
- [ ] `parseCodexConfigModels` 额外识别 `[model_providers.*]` 段下的 `model` 键
- [ ] `parseClaudeSettingsModels` 额外识别 `env.ANTHROPIC_MODEL` 与 `env.ANTHROPIC_SMALL_FAST_MODEL`
- [ ] kimi/glm profile 读取 `~/.claude/settings.json` 时，仅当 `env.ANTHROPIC_BASE_URL` 指向对应供应商域名时才纳入其模型（避免 claude 模型误挂到 kimi/glm）
- [ ] 坏 TOML/JSON 输入均容错返回 `[]`，单测覆盖
- [ ] Typecheck/lint 通过

### US-003: 配置模型供应商
**Description:** As a 用户, I want 在 Settings 中管理模型供应商（名称、协议、baseUrl、凭证引用、模型列表） so that 我可以接入 kimi、glm、minimax 等 Claude/OpenAI 兼容端点。

**Acceptance Criteria:**
- [ ] Settings > Models 新增 Providers 区块：列表、新增、编辑、删除供应商
- [ ] 供应商字段遵循 `ModelProviderConfig`：`id`、`name`、`protocol`（`anthropic-compatible` | `openai-compatible`）、`baseUrl`、`credentialRef`、`models`
- [ ] 凭证输入只接受环境变量名引用（如 `KIMI_API_KEY`），UI 明确提示密钥本身不落盘；持久化状态中无明文密钥
- [ ] `baseUrl` 校验为 `https://` URL（`http://localhost` / `http://127.0.0.1` 例外），非法输入阻断保存并提示
- [ ] 删除被运行中会话引用的供应商时给出确认警告；删除后该会话保持原 env 直至结束
- [ ] 空状态（无供应商）、加载中、保存失败三种状态均有 UI 呈现
- [ ] Typecheck/lint 通过
- [ ] Verify in a browser（`run` skill）

### US-004: 会话级供应商与模型选择
**Description:** As a 用户, I want 新建会话时（及 composer 内）为该会话选择供应商与模型 so that 不同会话可同时使用不同供应商，互不干扰。

**Acceptance Criteria:**
- [ ] 新建会话对话框与 composer 模型选择器支持按供应商分组展示模型（无供应商时展示形态与现状一致）
- [ ] 会话选定 provider 后，启动 CLI 进程时按协议注入环境变量：anthropic-compatible → `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`（值取自 credentialRef 指向的环境变量）；openai-compatible → codex 以 `-c model_provider=<id>` 等 CLI 参数传递
- [ ] 供应商设置持久化在 session 状态（`session.providerId`），会话重启/resume 时沿用
- [ ] 不改写 `~/.claude/settings.json`、`~/.codex/config.toml` 等用户全局配置文件
- [ ] credentialRef 指向的环境变量在宿主进程缺失时，会话创建被阻断并提示具体缺失的变量名
- [ ] 未选择供应商的会话行为与现状完全一致（回归保障）
- [ ] Typecheck/lint 通过
- [ ] Verify in a browser（`run` skill）

### US-005: 供应商模型汇入统一模型列表
**Description:** As a 用户, I want 供应商声明的模型出现在模型选择器 so that 我不需要重复手工导入。

**Acceptance Criteria:**
- [ ] provider 的 `models` 作为 synced 层来源汇入 `mergeModelSources`，不新增第四层、UI Badge 语义不变
- [ ] 会话选定 provider 时，模型选择器优先展示该 provider 的模型
- [ ] provider 模型与 builtin/custom 重名时按现有去重优先级处理（builtin > synced > custom）
- [ ] Typecheck/lint 通过

## Functional Requirements

- FR-1: 系统必须在 capability 探测时自动执行被动模型同步并合并进模型列表（带 TTL 防抖）。
- FR-2: 系统必须支持从 codex `[model_providers.*]` 段与 claude `env.*` 字段解析模型。
- FR-3: 系统必须提供 Model Provider 的 CRUD 持久化（schema 迁移含向后兼容）。
- FR-4: 系统必须在会话粒度记录 `providerId` 并在 CLI 进程启动时注入对应环境变量。
- FR-5: 系统必须以 `credentialRef`（环境变量名）间接引用凭证，持久化状态中禁止出现明文密钥。
- FR-6: 系统必须将 provider 模型汇入现有三层合并逻辑的 synced 层。
- FR-7: 系统必须保证未配置 provider 时所有现有行为不变（含 kimi/glm 既有 adapter 路径）。
- FR-8: 系统必须在 provider 凭证环境变量缺失时阻断会话创建并给出可操作错误。

## Non-Goals (Out of Scope)

- 不做全局（cc-switch 式）供应商切换；粒度仅为会话级。
- 不改写用户全局 CLI 配置文件（`~/.claude/settings.json`、`~/.codex/config.toml`）。
- 不实现密钥托管/加密存储（keychain 集成留待后续 PRD）。
- 不在本期移除 kimi/glm adapter 硬编码（仅保证 provider 路径可替代它，移除属后续清理）。
- 不做 provider 端点连通性探测 / 余额查询。
- generic adapter 不参与 provider 注入。

## Technical Considerations

- 现有契约 `cli-gui/shared/model-provider.ts` 已定义 `ModelProviderConfig` / `ModelProviderSummary`，直接消费，不另起类型。
- Provider 存储进入 AppState，需要 schema v4 → v5 迁移（`providers: []` 默认值，旧 state 宽容升级）。
- env 注入落点：`resolveLaunch` / `buildTurn` 返回值需扩展 `env?: Record<string, string>`，由 PTY/headless 启动链路透传。
- capability 缓存键（`profile-adapters.ts`）已包含 syncedModels，自动同步后的列表变更会自然触发重探测。
- 会话恢复（resume）路径必须复用会话既有 `providerId`，否则跨供应商 resume 会话上下文不可用。

## Success Metrics

- 新装环境下，新建会话即可在模型选择器看到本机 CLI 配置中的模型，无需进 Settings 手动 Sync。
- 两个并行会话可分别使用不同供应商完成一轮对话，transcript 无串扰。
- 全量持久化状态文件（AppState JSON）中 grep 不到任何 API key 形态字符串。

## Open Questions

- openai-compatible provider 对 codex 的注入方式最终采用 `-c model_provider=...` 还是要求用户预先在 `config.toml` 声明 provider 段？（`[Assumption]` 本期采用 `-c` CLI 参数透传，避免写配置文件；若 codex CLI 版本不支持则该 provider 在 codex profile 上标记不可用。）
- `[Assumption]` 自动同步 TTL 取 5 分钟；手动 Sync 按钮不受 TTL 限制。
- `[Assumption]` provider 作用域为全局配置（所有 workspace 共享），按会话引用。

## Scope Classification

- Classification: `epic`
- Rationale: 包含两个可独立评审、独立发布的成果（模型自动同步；会话级供应商机制），存在明确依赖顺序（方案二的模型汇入依赖方案一的 synced 层链路），且涉及 schema 迁移与启动链路扩展两个不同的验收边界。
