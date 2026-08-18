# Implement model sync and session configuration linkage

## Description
实现 session 的 activeModel 与 profile 可用模型列表的联动机制。切换 profile 时自动继承上次使用的 model 偏好，确保模型选择在 session 生命周期内保持一致且可预测。

## Current State
- Session 创建时 `launchConfig.model` 由 NewSessionDialog 选择，默认为 null（使用 CLI 默认模型）
- Chat 模式的 `session.chatContext.activeModel` 通过 PATCH 实时切换
- 切换 profile 或创建新 session 时不继承之前的 model 偏好

## Design

### Model Preference Memory
```typescript
interface ModelPreferences {
  // profileId → 上次使用的 model id
  lastUsedModel: Record<string, string>;
  // 全局默认 model（跨 profile）
  globalDefault?: string;
}
```

存储位置：localStorage preferences (前端) + 可选 server-side profile metadata

### Linkage Rules

1. **新建会话**:
   - 查找当前 profile 的 `lastUsedModel[profileId]`
   - 若存在且在当前可用列表中 → 作为 `launchConfig.model`
   - 否则 → null（CLI 默认）

2. **切换 activeModel（chat 模式）**:
   - PATCH 成功后更新 `lastUsedModel[profileId]`

3. **Profile 变更（settings）**:
   - 模型列表变更不影响已有 session
   - 新 session 读取最新列表

4. **Model Sync 完成（issue-053）**:
   - 检查所有 running session 的 activeModel 是否仍在可用列表
   - 若已从列表移除 → 不自动切换，仅 toast 提示

### API 变更
无新端点。利用现有 state poll 和 preferences localStorage。

## Acceptance Criteria
- [x] 新建会话时自动填入当前 profile 的上次使用模型
- [x] Chat 模式切换 model 后自动记住偏好
- [x] 记住的偏好按 profileId 隔离
- [x] Model sync 后若当前 model 失效，toast 提示但不强制切换
- [x] 首次使用（无历史偏好）时默认 null（CLI 自动选择）
- [x] Preferences 格式向后兼容（新字段缺失时 fallback）

## Affected Files
- `cli-gui/client/app/preferences.ts` (新增 modelPreferences 字段)
- `cli-gui/client/components/ChatView.tsx` (model 切换时记录偏好)
- `cli-gui/client/app/App.tsx` (创建 session 时读取偏好)
- `cli-gui/client/components/NewSessionDialog.tsx` (预填 model)

## Dependencies
- issue-053 (model sync API)

## Type
feature / frontend

## Priority
medium

## SPEC Reference
.features/cli-structured-tui-adaptation/spec.md §3.3
