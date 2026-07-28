# SPEC: Agent Console MVP01 — 存储与迁移（storage-spec）

> 派生自：`Agent_Console_MVP01_PRD.md` v0.3 §4.1.4、§6
> 上游：[architecture-spec.md](./architecture-spec.md)（决策 D-2、D-3）、[domain-spec.md](./domain-spec.md) §2
> 现状：`server/store.ts`（envelope + `migrateAndValidate`，`CURRENT_SCHEMA_VERSION = 2`）、
> `server/transcript-store.ts`（JSONL append-only + retention + clientMessageId 幂等）

## 1. Summary

存储层两块：`state.json`（实体元数据，schema envelope 版本化）与
`transcripts/<sessionId>.jsonl`（append-only 事件流）。本 SPEC 定义
v2 → v3 迁移、chat 字段校验、transcript 读侧 legacy kind 规范化。
文件布局、原子写、恢复备份等机制现有实现已满足，作为冻结项列出。

---

## 2. 存储布局（现状冻结）

```
$SPECOS_DATA_DIRECTORY/          （默认 cli-gui/data/）
├── state.json                    # envelope: { schemaVersion, state }
├── state.json.v1.bak             # 首次迁移时的恢复备份（已存在机制）
├── state.json.v2.bak             # NEW: v2→v3 迁移时按同一机制生成
└── transcripts/
    └── <sessionId>.jsonl         # 每行一个 TranscriptEvent，append-only
```

冻结的现有语义（v3 不变更）：

- **原子写**：临时文件 + rename；同路径写入串行队列（`writeQueues`）。
- **损坏保护**：JSON 解析失败 → `STATE_CORRUPT`，**源文件不动**；
  迁移失败 → `STATE_MIGRATION_FAILED`，源文件不动。
- **readonly 模式**：一切写入拒绝（`READONLY_MODE`），迁移结果只在内存生效。
- **transcript**：append-only、fsync 批量落盘、retention 截断带
  `retention_marker`、`clientMessageId` 幂等去重、fork 边界
  `retentionFloor` 保护（均已存在）。

---

## 3. state schema v2 → v3 迁移（决策 D-2）

### 3.1 版本与触发

- `shared/state.ts`：`CURRENT_SCHEMA_VERSION` 2 → **3**；
  envelope 类型 `AppStateEnvelopeV3`。
- `migrateAndValidate` 接受三种输入：v1 裸对象（无 envelope）、
  v2 envelope、v3 envelope，统一迁移到 v3。链式迁移：v1 → v2 逻辑
  完全保留（现有代码不动），再叠加 v2 → v3 步骤。
- 迁移发生在 `load()`，写回前生成 `state.json.v2.bak`（复用现有
  `createRecoveryBackup`，备份名按源版本命名）。

### 3.2 v2 → v3 字段迁移规则

| 实体 | 字段 | 迁移规则 |
|---|---|---|
| Session | `interactionMode` | 缺失 → `"terminal"`（历史会话全部是 PTY 会话，domain-spec §6） |
| Session | `chatContext` | 缺失 → `undefined`；若 `interactionMode === "terminal"` 却存在 → **剥除**（强制不变式 I-3） |
| Session | `launchConfig.branch` | 缺失 → `undefined`（可选字段，无需回填） |
| Workspace | `kind` | 缺失 → `"local-folder"`（MVP01 唯一合法运行值） |
| Profile | （无新增） | v3 不改 Profile 字段（MVP03 兼容要求：不移除/重命名，domain-spec §2.3） |

### 3.3 v3 校验规则（`migrateAndValidate` 新增断言）

在现有校验（引用完整性、重复 ID、时间戳类型、fork 血缘等，全部保持）
基础上追加：

- `interactionMode ∈ {"chat", "terminal"}`，否则迁移失败。
- `chatContext` 若存在：必须是对象；`resumeToken`/`activeModel`/
  `lastTurnCompletedAt` 均为可选 string；`interactionMode` 必须为
  `"chat"`（I-3）。
- `workspace.kind ∈ {"local-folder", "managed-workspace", "ssh-remote"}`；
  MVP01 加载到非 `local-folder` 值 → 迁移失败（预留值不允许伪造数据）。
- `runtimeStatus` 强制 `"stopped"` 的现有规则保持（重启后无存活进程假设），
  chat 会话同样适用；`chatContext.resumeToken` **保留**（resume 凭据
  跨重启有效，由下一轮 CLI 自行判定是否过期）。

### 3.4 前滚/回滚约定

- 旧版本代码读 v3 envelope：现有 `isEnvelope` 检查版本号不匹配 →
  `unsupported state schema version` → `STATE_MIGRATION_FAILED`，
  源文件不动（不静默丢字段）。回滚代码需同时回滚数据（用 `.v2.bak`）。
- v3 之后的演进：新增可选字段不升版本；改语义/必填才升 v4。

---

## 4. transcript 读侧 legacy kind 规范化（决策 D-3）

落位：`server/transcript-store.ts` 的读取出口（`list` / `latest` /
回放游标读取），在反序列化后、返回前应用
`LEGACY_KIND_ALIASES`（定义在 `shared/transcript.ts`，
event-protocol-spec §4）：

```ts
function normalizeEvent(event: TranscriptEvent): TranscriptEvent {
  const canonical = LEGACY_KIND_ALIASES[event.kind];
  return canonical ? { ...event, kind: canonical } : event;
}
```

约束：

- **文件永不重写**：磁盘上的 `user_input`/`markdown`/`permission_request`
  行保持原样（append-only 审计资产）；映射只在内存返回值上做。
- 写入口新增断言：`appendEvent` 收到 legacy kind 直接抛错
  （开发期缺陷保险丝，写侧一律规范 kind）。
- 未知 kind 原样透传（event-protocol-spec §4 前向兼容）。
- WS 实时推送路径不经过 list/latest：publish 前事件本就由新代码产出
  （规范 kind），无需二次映射；测试需覆盖「回放与实时推送 kind 一致」。

## 5. chat 字段的持久化时机

| 写入 | 触发 | 落位 |
|---|---|---|
| `chatContext.resumeToken` | 轮次成功完成，Orchestrator 经 `onRuntimeStatus` 回报 | application 更新 Session → `save()` |
| `chatContext.activeModel` | 用户在 composer 切换模型（api-spec 会话更新端点） | 乐观锁（revision）更新 |
| `chatContext.lastTurnCompletedAt` | 同 resumeToken，同一次 save | 同上 |
| `lastActiveAt` | 每轮 submitTurn 成功受理 | 现有语义复用 |

- 轮次事件本身走 transcript（含 `metadata.turnId`），state.json
  不存轮次（D-10）；崩溃后两者不一致的最坏情形 = resumeToken 落后一轮，
  下一轮 CLI resume 仍指向旧上下文——可接受（PRD 不要求崩溃精确一次）。

## 6. Edge Cases

| 场景 | 处理 |
|---|---|
| v2 数据含未知多余字段 | 现有行为保持：白名单重建，未知字段丢弃（迁移即净化） |
| `.v2.bak` 已存在（重复迁移） | `COPYFILE_EXCL` + EEXIST 忽略（现有机制），不覆盖首次备份 |
| readonly 模式下加载 v2 数据 | 内存迁移生效、不写回、不建备份（现有 `migrationPending` 语义保持） |
| transcript 文件含 legacy 与规范 kind 混存 | 逐事件映射，天然支持（迁移期正常形态） |
| chat 会话 transcript 丢失（文件被删） | 现有语义：回放为空、会话元数据仍在；resumeToken 仍可续（CLI 侧上下文独立于本地 transcript） |

## 7. Testing（详见 test-spec §3.4）

- 迁移矩阵：v1 裸对象 / v2 envelope / v3 envelope / 各字段缺失组合 →
  断言 §3.2 规则；terminal+chatContext 剥除；非法 interactionMode 失败。
- 备份：v2→v3 首次迁移生成 `.v2.bak` 且内容等于迁移前源文件。
- kind 规范化：写入 legacy kind fixture 文件 → list/latest 返回规范
  kind、磁盘文件字节不变；append legacy kind 抛错。

## 8. PRD 映射

| PRD | 本 SPEC |
|---|---|
| §4.1.4 持久化与恢复 | §2、§3.3（runtimeStatus=stopped）、§5 |
| §6 数据模型（版本化 schema + 迁移路径） | §3 |
| §8 「schema 版本化 + 迁移框架 A 段一次到位」 | §3.1 链式迁移框架 |
| §4.2.2 append-only / 回放 | §2 冻结项、§4 |
