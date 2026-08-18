# Implement automatic model list sync mechanism

## Description
实现模型列表自动同步机制。当前 profile 的可用模型由 `syncedModels` 和 `customModels` 静态维护，缺乏自动探测和更新能力。新增 sync-models API 端点，从 CLI 自动探测可用模型并更新列表。

## Current State
- `profile.syncedModels`: 最近一次同步发现的模型（缓存展示用）
- `profile.customModels`: 用户手动导入的自定义模型
- `model-catalog.ts` 的 `builtinModelIds()` 提供内置模型目录
- `mergeModelSources()` 合并三个来源（builtin + synced + custom）去重

## Design

### Backend: Sync API

新增端点 `POST /api/profiles/:id/sync-models`:
```typescript
// server/application.ts
async syncModels(profileId: string): Promise<{ models: string[]; syncedAt: string }> {
  const profile = await this.store.getProfile(profileId);
  // 尝试执行 CLI 探测命令获取模型列表
  const models = await this.adapters.discoverModels(profile);
  // 更新 profile.syncedModels
  await this.store.updateProfile(profileId, { syncedModels: models });
  return { models, syncedAt: new Date().toISOString() };
}
```

### Model Discovery per Adapter
- **Codex**: `codex models` 或 `codex exec --list-models`（待确认 CLI 支持）
- **Claude Code**: `claude --list-models`（待确认，可能需 fallback 到内置目录）
- **Fallback**: 若 CLI 不支持 list-models 命令，返回 builtinModelIds 作为 syncedModels

### Frontend: Auto-sync Trigger
- Profile capability 探测成功后，自动触发一次 sync（若距上次 sync > 1h）
- Settings 中提供手动 "Sync Models" 按钮
- Sync 结果刷新后，Composer 的 model Select 自动更新选项列表

### Data Flow
```
capability detection success
→ check lastSyncedAt (stored in profile metadata)
→ if stale (>1h): POST /api/profiles/:id/sync-models
→ response updates profile.syncedModels
→ next state poll picks up new models
→ Composer model Select reflects updated options
```

## Acceptance Criteria
- [x] 新增 `POST /api/profiles/:id/sync-models` API 端点
- [x] Adapter registry 新增 `discoverModels(profile)` 方法
- [x] Codex adapter 尝试 `codex models` 命令探测
- [x] Claude adapter 尝试 `claude --list-models` 命令探测
- [x] 探测失败时 fallback 到 builtinModelIds
- [x] 前端 capability 探测后自动触发 sync（节流 1h）
- [x] Settings 提供手动 Sync 按钮
- [x] Composer model 列表实时反映 sync 结果
- [x] 并发 sync 请求幂等处理（409 SYNC_IN_PROGRESS）

## Affected Files
- `cli-gui/server/application.ts` (新增 syncModels 方法)
- `cli-gui/server/http-server.ts` (新增路由)
- `cli-gui/server/profile-adapters.ts` (新增 discoverModels)
- `cli-gui/server/ports.ts` (接口定义)
- `cli-gui/client/api.ts` (新增 syncModels 调用)
- `cli-gui/client/components/ChatView.tsx` (触发 sync)
- `cli-gui/shared/types.ts` (API response 类型)

## Dependencies
None (独立于 A 层)

## Type
feature / backend + frontend

## Priority
medium

## SPEC Reference
.features/cli-structured-tui-adaptation/spec.md §3
