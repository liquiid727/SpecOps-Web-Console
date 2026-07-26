# 事件协议规范 kind 全集 + legacy 别名读侧映射

## Description
在 `shared/transcript.ts` 落地 10 个规范 kind（含 `approval_request`/`approval_response` 预留与新增 `file_change`），对历史 transcript 的 legacy kind（`user_input`/`markdown`/`permission_request`）做读侧规范化别名映射——**磁盘文件永不重写**（决策 D-3）。写侧加保险丝拒绝 legacy kind。事件协议是 A 段地基：A 段一次到位，B 段只加数据不改协议。

## Acceptance Criteria
- [x] `TranscriptEventKind` 更新为 10 个规范 kind；`LEGACY_KIND_ALIASES` 映射表定义在 `shared/transcript.ts`（event-protocol-spec §3、§4）
- [x] metadata 保留键约定（turnId/status/exitCode/code/approvalId/decision/path/tool）以类型注释固化（event-protocol-spec §2.1）
- [x] `transcript-store.ts` 读取出口（list / latest / 回放游标）应用别名映射；磁盘文件字节不变（fixture 断言）
- [x] `appendEvent` 收到 legacy kind 抛错（写侧缺陷保险丝）
- [x] 未知 kind 原样透传（前向兼容）
- [x] 「回放与实时推送 kind 一致」断言用例
- [x] 现有前端 transcript 展示测试同 PR 更新为规范 kind，避免双命名期（test-spec §5）

## Dependencies
None

## Type
backend

## Priority
high

## SPEC Reference
event-protocol-spec §2–4；storage-spec §4；test-spec §3.2、§5

## Notes
- 读侧映射落在 `transcript-store.ts` 四个出口：`list`、`latest`、`findByClientMessageId`、`append` 的幂等去重返回（existing 事件也会到达 API，保守起见同样规范化）；`readRecords` 本身不映射，确保 retention 改写路径（现有行为）回写的仍是磁盘原始 kind，不违反「磁盘文件永不重写」。
- `application.ts` 写入点仅 messages 端点一处用了 legacy kind（`user_input`），已改 `user_message`；其余写入点（pty_output/lifecycle/error）本就是规范 kind。fork 物化（materializeTranscript）经由 `list` 读取父前缀，写入子文件时已是规范 kind，与写侧保险丝兼容。
- 前端 `TranscriptPanel` 渲染分支 `markdown`→`assistant_message`；`eventLabel` 改用规范 kind，新 kind 复用现有 i18n 键（file_change→toolActivity、approval_response→permissionRequest），不新增文案（UI 细化属 #7/#13）。
- 写侧保险丝复用 `TRANSCRIPT_WRITE_FAILED` 错误码（SPEC 未指定专用码，保守选择不新增错误码），且在入队前同步抛出，不产生任何磁盘副作用。
- `application.test.ts` 仅按 test-spec §5 将 composer 用例的 kind 断言同步为规范 kind（`user_input`→`user_message`），零用例删除、零语义修改。
- 验证：`npm run test` 32 文件 / 125 测试全绿；`tsc -p tsconfig.server.json --noEmit` 无错误。
