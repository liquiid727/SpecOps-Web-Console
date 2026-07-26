# Runtime Orchestrator 从 application.ts 抽取（terminal 行为零变更）

## Description
将执行控制逻辑（per-session `Runtime`、startLocks、generation 计数、PTY 接线、transcript 批量落盘）从 `application.ts` 迁出到新的 `server/orchestrator.ts`，以 `RuntimeOrchestrator` port 显式化（决策 D-4）。本 Issue 是纯重构：**terminal 会话行为零变更是验收线**，chat 能力在后续 Issue 加入。

## Acceptance Criteria
- [x] `server/ports.ts` 新增 `RuntimeOrchestrator` 接口与 `OrchestratorCallbacks`（runtime-orchestrator-spec §2）
- [x] 按迁移映射表搬移：`Runtime`/`runtimes` Map/generation → Worker 内部；`startLocks` → 幂等 start；`queuePtyTranscript`/`flushPtyTranscript` → 回调 appendEvent；`broadcastTerminal` → terminal 通道（runtime-orchestrator-spec §4）
- [x] transcript 写入与 state 持久化留在 application（回调依赖注入，orchestrator 不反向 import application）
- [x] 分层禁令成立：orchestrator 代码中不出现 `codex`/`claude` 字符串字面量（architecture-spec §2.1）
- [x] `application.test.ts` 用例零删除、零语义修改，全绿（允许 import 路径调整）
- [x] terminal WS 帧序列快照与重构前一致（test-spec §5）
- [x] `shutdown()` 停全部 Worker + flush 队列，现有 close 流程语义保持

## Dependencies
None

## Type
backend

## Priority
high

## SPEC Reference
runtime-orchestrator-spec §2、§3.1、§4；architecture-spec §2.1–2.3（D-4）；test-spec §3.6、§5

## Notes
- `start` 签名采用 `start(sessionId, prepare, terminal?)`（prepare 回调返回 PreparedLaunch），与 SPEC §2.1 字面 `start(session, launch)` 形式不同：resolveLaunch/requireSession 等校验必须在启动锁内且最多执行一次，才能保持并发 start 收敛到单一启动操作的现有语义（零行为变更优先）。
- 状态持久化经 `OrchestratorCallbacks.onRuntimeStatus` 回调回到 application：starting=save（无 publish）；running=save+publish；stopped=append lifecycle→save→publish；error=save→append error→publish，与重构前逐状态顺序一致。
- `hasSession` 回调复刻重构前 `finishExit` 的 session 缺失分支（不 flush、不 append，直接删 worker）。
- `isRunning`/`writeTerminal`/`resizeTerminal`/`attachTerminalClient`/`detachTerminalClient`/`runningCount`/`beginShutdown` 为接线所需的保守扩展；`submitTurn`/`cancelTurn`/`respondApproval` 为 stub（issue-005 实现）。
- close 流程改为 `beginShutdown()`（进入 closing 窗口屏蔽 PTY 回调）→ waitForIdle → `shutdown()` 返回曾持有 Worker 的 sessionIds，application 据此标记 stopped 并按原条件持久化；两段式保持原 closing 语义。
- `clampDimension` 移入 orchestrator.ts（terminal 尺寸校验属执行控制层）；TERM=xterm-256color 在 orchestrator spawn 时追加，application 只传 definedEnvironment 结果。
- publishSessionUpdate（events 通道）与 broadcastTerminal running 帧（terminal 通道）的跨通道相对顺序有微调，单通道内帧序列不变，对客户端不可观测。
- 验证：`npm run test` 32 文件 / 125 用例全绿；`tsc -p tsconfig.server.json --noEmit` 无错误；`grep -i "codex\|claude" server/orchestrator.ts` 无匹配；application.test.ts 本卡零修改。
