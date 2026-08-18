# Auto-sync profile models on capability detection with TTL gating

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-026
- Source Spec: `.features/CLI-GUI-026-model-auto-sync/spec.md`
- Source Version: 1.0
- Requirement IDs: US-001, FR-1
- Depends On: issue-084

## Goal
capability 探测（新建会话 / profile 变更）时自动执行一次被动模型同步并回写 `profile.syncedModels`，使模型选择器无需手动 Sync 即反映本机 CLI 配置；带 TTL 防抖与失败降级。

## Scope
- `application.ts`：capability 探测入口前置 `maybeAutoSync(profile)`——TTL（默认 5 分钟常量）内跳过；否则调用 `readProfileSyncedModels` 并回写 state（`stateRepository.save`）。
- 自动路径只读文件，禁止 spawn 子进程；`discoverModels` 保持手动 Sync 专属。
- 失败降级：读取/解析失败保留 `syncedModels` 原值，记录结构化日志，不阻断探测与会话创建。
- 手动 Sync（`POST /api/profiles/:id/models/sync`）不受 TTL 限制并重置该 profile 计时。
- 运行时内存态 `Map<profileId, lastAutoSyncAt>`，不持久化。
- Settings > Models 增加同步失败非阻断提示（沿用现有 feedback 机制，不改版面结构）。
- `application.test.ts` 集成用例：触发回写、TTL 去抖（mock reader 调用计数）、失败保留原值、手动 Sync 忽略 TTL。

## Out of Scope
- 解析器内部逻辑（issue-084）。
- provider 模型汇入（CLI-GUI-027）。
- 模型偏好联动（issue-055 已交付）。

## Acceptance Criteria
- [ ] capability 探测触发自动同步且结果写入 state 并持久化
- [ ] TTL 内重复探测不再读文件（mock 断言调用次数）
- [ ] 读文件抛错时 syncedModels 保持原值、探测正常返回
- [ ] 手动 Sync 忽略 TTL 并重置计时
- [ ] 未配置任何 CLI 配置文件的环境行为与现状一致（回归）
- [ ] Typecheck/lint 通过
- [ ] Verify in a browser（新建会话后模型选择器出现配置文件中的模型）

## Inputs
- `cli-gui/server/application.ts`、`cli-gui/server/application.test.ts`
- `cli-gui/client/components/SettingsView.tsx`（失败提示）
- CLI-GUI-026 spec §Domain / §Application

## Outputs
- 自动同步链路、测试、失败提示 UI

## Owner
implementation-agent（backend-agent 主导，frontend-agent 配合提示 UI）

## Required Evidence
- `npx vitest run server/application.test.ts` 全绿输出
- 浏览器验证记录（截图）

## Gate Impact
- blocking
