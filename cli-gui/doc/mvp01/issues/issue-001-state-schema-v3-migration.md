# state schema v3 + 迁移框架（interactionMode / chatContext / workspace.kind）

## Description
将 state schema 从 v2 升级到 v3：Session 新增 `interactionMode` 与 `chatContext`，Workspace 新增 `kind` 预留位，`launchConfig` 增加可选 `branch`。建立 v1→v2→v3 链式迁移，保持「迁移失败源文件不动」与恢复备份机制。这是 A 段地基，必须一次到位（PRD §8）。

## Acceptance Criteria
- [x] `shared/state.ts`：`CURRENT_SCHEMA_VERSION = 3`，`SessionV3` / `WorkspaceV3` / `AppStateEnvelopeV3` 类型落地（domain-spec §2）
- [x] `migrateAndValidate` 接受 v1 裸对象 / v2 envelope / v3 envelope，链式迁移到 v3；v1→v2 现有逻辑零改动
- [x] 迁移默认值：session 缺 `interactionMode` → `"terminal"`；workspace 缺 `kind` → `"local-folder"`（storage-spec §3.2）
- [x] 不变式 I-3 强制：`terminal` 会话的 `chatContext` 迁移时剥除；非法 `interactionMode` / 伪造 `workspace.kind` → `STATE_MIGRATION_FAILED` 且源文件不动
- [x] v2→v3 首次迁移生成 `state.json.v2.bak`（COPYFILE_EXCL，重复迁移不覆盖）
- [x] readonly 模式：迁移仅内存生效、零写盘
- [x] 零丢失门禁 fixture：真实结构 v2 state 迁移后实体计数与字段值逐项相等（test-spec §3.4）

## Dependencies
None

## Type
backend

## Priority
high

## SPEC Reference
storage-spec §3；domain-spec §2、§4（I-1/I-3）；test-spec §3.4、§5

## Notes
- 命名策略：`shared/state.ts` 的规范接口保持 `Session`/`Workspace`/`CliProfile` 名称（即 v3 形态），`shared/types.ts` 以 `SessionV3`/`WorkspaceV3`/`AppStateV3`/`AppStateEnvelopeV3` 别名导出；legacy v2 形态（`SessionV2 = Omit<Session, "interactionMode"|"chatContext">` 等）仅供迁移输入与旧客户端类型引用。
- 备份命名按源版本：`createRecoveryBackup(sourcePath, sourceVersion)` 生成 `.v{N}.bak`；v1 裸对象源 → `.v1.bak`（与存量行为一致），v2 envelope 源 → `.v2.bak`，COPYFILE_EXCL 不覆盖。
- 保守决策：MVP01 加载到 `workspace.kind` 为任何非 `"local-folder"` 值（含预留值 `managed-workspace`/`ssh-remote`）均拒绝（storage-spec §3.3 “预留值不允许伪造数据”）。
- 保守决策：现有创建路径（POST /api/sessions）在本卡默认写入 `interactionMode: "terminal"`；chat 创建接线属于 issue-006。Fork 子会话继承父 `interactionMode` 但重置 `chatContext`（resume 凭据属于父会话的 CLI 原生会话，不可继承）。
- `application.test.ts` 仅做 schema 追加性更新（fixture 补 `kind`/`interactionMode`、类型名 `AppStateV2`→`AppStateV3`），无用例删除与断言语义修改。
- 验证：`npm run test` 31 files / 118 tests 全绿；`tsc -p tsconfig.server.json --noEmit` 无错误。
