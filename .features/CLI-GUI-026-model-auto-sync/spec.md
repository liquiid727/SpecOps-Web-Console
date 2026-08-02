# CLI-GUI-026 Model Auto-Sync

## Meta

- Spec ID: `CLI-GUI-026`
- Spec Version: `1.0`
- Title: Model Auto-Sync（模型自动检测与配置解析增强）
- Epic: MVP02 — Model Management（PRD: 模型自动同步与会话级模型供应商）
- Status: approved
- Owner Agent: implementation-agent
- Source PRD: `.prd/prd-mvp02-model-auto-sync-and-session-providers.md`
- Covered Requirements: `US-001`, `US-002`, `FR-1`, `FR-2`
- Depends On: none
- Prerequisites: console-gaps SPEC §2.5 三层模型来源合并（builtin > synced > custom）已上线；schema v4 `profile.syncedModels` 字段已存在
- Risk Tier: `P1`
- Quality Profile: server 单测 + application 集成测试
- Approval Evidence: 用户于 2026-07-31 会话中确认按 PRD→Spec→Issues 链路成型（决策：两方案都做，方案一先行）

## Goal

新建会话或 profile 变更触发 capability 探测时，系统自动从本机 CLI 配置文件读取可用模型并汇入模型列表，使 composer 模型选择器在不进 Settings 手动 Sync 的情况下与本机 CLI 实际配置保持一致。

独立成片理由：只扩展现有 synced 层的触发时机与解析深度，不引入新 schema、新 API、新 UI 结构，可独立发布并立即产生用户价值。

## Why This Exists

synced 层目前仅由 Settings 页手动 Sync 按钮触发，多数用户从不进入该页面，导致左下角模型选择器长期只展示 builtin 目录，与本机 CLI 真实配置脱节。同时两个解析器覆盖形态过窄（codex 只读 `model =` 键、claude 只读顶层 `model`），且 kimi/glm 复用 `~/.claude/settings.json` 会把 claude 模型误挂到 fork 供应商。

## Out of Scope

- Model Provider 配置与会话级供应商选择（`CLI-GUI-027`）。
- 主动执行 CLI 子进程的模型发现（`discoverModels`，issue-053 已交付，仍仅由手动 Sync 触发）。
- 模型选择偏好联动（issue-055 已交付，不改动）。
- Settings > Models UI 结构调整（仅允许增加非阻断同步失败提示）。

## Deliverables

- `server/model-catalog.ts`：解析器增强 + 自动同步 TTL 门控函数。
- `server/application.ts`：capability 探测路径挂接自动被动同步。
- `server/model-catalog.test.ts` / `application.test.ts`：新增解析与自动同步用例。
- Settings > Models 同步失败非阻断提示（沿用现有 feedback 机制）。

## Domain

- **自动同步只读不变式**：自动路径仅允许读文件（`readSyncedModels`），禁止 spawn 子进程；`discoverModels` 保持手动专属。
- **TTL 门控**：同一 profile 的自动同步在 TTL（默认 5 分钟，常量可配）内最多执行一次；手动 Sync 不受 TTL 限制并重置计时。
- **失败降级**：文件缺失/解析失败时保留 `profile.syncedModels` 原值（不清空、不报错），仅记录结构化日志；Settings 页展示非阻断提示。
- **kimi/glm 归属规则**：读取 `~/.claude/settings.json` 时，`env.ANTHROPIC_BASE_URL` 命中对应供应商域名（kimi: `moonshot`；glm: `bigmodel`）才将模型纳入该 adapter 的 synced 层；claude-code 自身不受此限制。
- **解析扩展**：
  - codex：在既有顶层 `model` 与 `[profiles.*].model` 基础上，识别 `[model_providers.*]` 段内 `model` 键。
  - claude 家族：在既有顶层 `model` 基础上，识别 `env.ANTHROPIC_MODEL`、`env.ANTHROPIC_SMALL_FAST_MODEL`（字符串、非空、trim 后纳入）。
- 合并优先级、去重、`default` 首位规则不变（`mergeModelSources`）。

## Application

- capability 探测入口（`resolveCapabilities` 前置）先执行 `maybeAutoSync(profile)`：TTL 内跳过；否则读文件并回写 `profile.syncedModels` + `stateRepository.save`。
- syncedModels 变更自然改变 capability 缓存键（既有机制），无需手动失效缓存。
- 自动同步与手动 Sync 写同一字段，互为幂等。

## Repository

- `profile.syncedModels` 持久化沿用 schema v4，无迁移。
- 新增运行时内存态：`Map<profileId, lastAutoSyncAt>`（不持久化，进程重启即重新同步一次）。

## API

none —— 不新增端点；既有 `POST /api/profiles/:id/models/sync` 语义不变。同步失败提示复用现有 state poll / capabilities 响应，不扩展响应结构。

## Database Impact

none —— 无数据库；AppState JSON 结构不变。

## Test Plan

- **US-002 解析（单测，happy/edge）**：codex `[model_providers.*].model` 命中；claude `env.ANTHROPIC_MODEL` / `ANTHROPIC_SMALL_FAST_MODEL` 命中；坏 TOML / 坏 JSON / 空文件 → `[]`；kimi/glm 域名归属命中与不命中两分支。
- **US-001 自动同步（集成，happy/error/limit）**：capability 探测触发同步并回写 state；TTL 内二次探测不重复读文件（mock reader 调用计数）；读文件抛错时 syncedModels 保持原值且探测不失败；手动 Sync 忽略 TTL。
- **回归**：三层合并顺序、default 首位、capability 缓存键联动既有用例全部通过。
- 阻断优先级：解析与自动同步用例为 blocking；提示 UI 为 warning。

## Definition of Done

- [ ] 上述 Deliverables 全部落地且命名与现有代码风格一致
- [ ] 新增/修改行为均有单测或集成测试覆盖，`cli-gui` 内 vitest 全绿
- [ ] Typecheck/lint 通过
- [ ] 未配置任何 CLI 配置文件的环境下行为与现状一致（回归验证）
- [ ] 实施 handoff 记录至 `implementation/CLI-GUI-026-*.md`
