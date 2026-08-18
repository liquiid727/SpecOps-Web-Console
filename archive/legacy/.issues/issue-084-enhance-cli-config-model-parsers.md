# Enhance CLI config model parsers for codex providers and claude env models

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-026
- Source Spec: `.features/CLI-GUI-026-model-auto-sync/spec.md`
- Source Version: 1.0
- Requirement IDs: US-002, FR-2
- Depends On: none

## Goal
扩展 `model-catalog.ts` 两个解析器的覆盖形态，使 codex `[model_providers.*]` 段与 claude `env.*` 模型字段能进入 synced 层，并修正 kimi/glm 从 `~/.claude/settings.json` 误纳 claude 模型的问题。

## Scope
- `parseCodexConfigModels`：在既有顶层 `model` 与 `[profiles.*].model` 基础上，识别 `[model_providers.*]` 段内的 `model` 键（沿用现行行级容错解析，不引入 TOML 依赖）。
- `parseClaudeSettingsModels`：额外识别 `env.ANTHROPIC_MODEL` 与 `env.ANTHROPIC_SMALL_FAST_MODEL`（字符串、非空、trim 后纳入，去重）。
- `readSyncedModels`：kimi/glm 读取 `~/.claude/settings.json` 时，仅当 `env.ANTHROPIC_BASE_URL` 命中对应供应商域名（kimi: `moonshot`；glm: `bigmodel`）才纳入模型；claude-code 不受此限制。
- `model-catalog.test.ts` 补齐上述分支单测。

## Out of Scope
- 自动同步触发时机与 TTL（issue-085）。
- `discoverModels` CLI 命令发现路径。
- 合并优先级 / `mergeModelSources` 逻辑。

## Acceptance Criteria
- [ ] codex 配置含 `[model_providers.kimi]` 段 `model` 键时解析结果包含该模型
- [ ] claude settings 含 `env.ANTHROPIC_MODEL` / `env.ANTHROPIC_SMALL_FAST_MODEL` 时解析结果包含对应模型
- [ ] kimi profile 在 `env.ANTHROPIC_BASE_URL` 非 moonshot 域名时同步结果为 `[]`；命中时纳入
- [ ] 坏 TOML / 坏 JSON / 空文件均容错返回 `[]`
- [ ] 既有解析用例全部保持通过；typecheck/lint 通过

## Inputs
- `cli-gui/server/model-catalog.ts`、`cli-gui/server/model-catalog.test.ts`
- CLI-GUI-026 spec §Domain 解析扩展与 kimi/glm 归属规则

## Outputs
- 更新后的解析器与单测

## Owner
implementation-agent（backend-agent 执行）

## Required Evidence
- `npx vitest run server/model-catalog.test.ts` 全绿输出
- typecheck 通过记录

## Gate Impact
- blocking
