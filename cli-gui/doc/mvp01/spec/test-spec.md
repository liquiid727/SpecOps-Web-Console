# SPEC: Agent Console MVP01 — 测试策略（test-spec）

> 派生自：`Agent_Console_MVP01_PRD.md` v0.3 §9、§10
> 横切全部分册；各分册的 Testing 小节在此汇总为可执行清单
> 现状：vitest（unit + server 集成 harness，`application.test.ts` 等）、
> Playwright（`e2e/`）、CI `cli-gui-ui.yml` 已存在——新增用例并入现有分层

## 1. Summary

测试策略 = 三层（unit / server 集成 / E2E）+ 两道门禁（PRD §9 A/B）。
原则：**契约先行**——迁移 Orchestrator 前现有 `application.test.ts`
必须全绿并保持全绿（terminal 行为零变更是重构验收线）；chat 新能力
以「假 CLI 脚本 + 录制 fixture」驱动，真实 Codex/Claude 只出现在
门禁的手动/E2E 验证项。

## 2. 分层与工具

| 层 | 工具 | 范围 | 门槛 |
|---|---|---|---|
| Unit | vitest | shared 纯函数、adapter buildTurn/parseEvents、迁移函数、渲染映射 | 每 PR 全绿 |
| Server 集成 | vitest + 隔离 harness（临时 data 目录 + 假 CLI 可执行脚本） | 路由、orchestrator、WS、存储 | 每 PR 全绿 |
| E2E | Playwright | 三栏主流程冒烟（B 段） | B 门禁 |
| 手动验收 | 真实 codex/claude CLI | 门禁清单 §4 中标注「真实 CLI」项 | A/B 收口 |

假 CLI 约定：harness 提供可控 Node 脚本充当 `profile.command`，
按参数回放预设 JSONL/延迟/退出码/挂起，用于确定性驱动轮次、超时、
取消、审批路径（不依赖网络与真实登录态）。

## 3. 分册用例清单

### 3.1 domain / 不变式（domain-spec §4）

- I-1 ~ I-10 每条至少一个断言用例（多数已有，补 I-2 / I-3）。
- 状态机非法转移拒绝：非 active 收消息、restore 非 archived 等（已有，保持）。
- Fork：继承矩阵（含 `interactionMode` 继承、`chatContext` 不继承）。

### 3.2 事件协议（event-protocol-spec）

- kind 全集类型测试：写入 10 个规范 kind 均合法；legacy kind 写入抛错。
- legacy 别名映射：`user_input`/`markdown`/`permission_request`
  fixture → 读出规范 kind；未知 kind 原样透传。
- 回放协议：`afterSequence` 分页顺序/hasMore/nextAfterSequence；
  Fork 前缀 + 自有事件单一单调序列（已有，保持）。
- 重连零重复：WS 订阅 afterSequence 补发 + id 去重（已有，保持）；
  「回放与实时推送 kind 一致」新增断言（storage-spec §4）。
- 轮次事件时序：成功轮 `user_message → …* → lifecycle(turn-completed)`
  全带同一 turnId；失败轮以 `error` 收尾；审批轮插入
  request/response 配对（approvalId 一致）。
- 流式：假 CLI 分段输出 → 事件逐条到达（不等 exit）。

### 3.3 Adapter（adapter-spec §7）

- `buildTurn` argv 快照：选项组合 × resume 有无 × prompt 含空格/引号
  /换行（断言单 argv 元素、无 shell 拼接）。
- `parseEvents` fixture 驱动：codex/claude 录制 JSONL → kind 映射表、
  resumeToken 提取（含多次出现取最后）、usage 透传。
- 降级纪律：非 JSON 行 / 未知事件类型 / 缺字段 JSON → `pty_output`
  且 raw 原样；Adapter 永不产出 lifecycle/error/user_message。
- capability：generic → 三个 headless 字段 false；
  `compatibility !== "supported"` → 全 false。

### 3.4 存储与迁移（storage-spec §7）

- 迁移矩阵：v1 裸对象 / v2 envelope / 字段缺失组合 → v3 默认值
  （`interactionMode: "terminal"`、`kind: "local-folder"`）；
  terminal + chatContext 剥除；非法 interactionMode / 伪造
  workspace.kind → `STATE_MIGRATION_FAILED` 且源文件不动。
- `.v2.bak` 生成且等于迁移前源文件；重复迁移不覆盖。
- readonly：迁移仅内存生效、零写盘。
- **零丢失门禁 fixture**：真实结构 v2 state + 混合 kind transcript →
  迁移后实体计数、字段值、事件数逐项相等（PRD §9「迁移 fixtures
  零数据丢失」）。

### 3.5 前端（frontend-spec §9）

- kind → 渲染映射全表（含未知 kind 中性条目、truncated 标记）。
- sanitize：HTML 注入、`javascript:`/`data:` 链接、远程图片 fixture
  → 断言不渲染为可执行/可加载形态；GFM 表格/任务列表正常。
- composer 状态矩阵：轮次进行中禁提交、stopped 走 start-and-send
  确认、readonly 全禁用、取消按钮切换。
- 重试生成新 clientMessageId；双击提交仅一轮。
- 四态：loading/empty/reconnecting/failure 各视图快照。
- 键盘走查（B 段，Playwright）：审批按钮、取消、模式选择 Tab 可达。

### 3.6 Orchestrator（server 集成，假 CLI 驱动）

- start/stop 幂等：并发 start 收敛单进程；重复 stop no-op；
  现有 terminal 用例全绿保持（重构验收线）。
- 轮次互斥：进行中再 submit → `TURN_IN_PROGRESS`；终态后可再提交。
- 取消：SIGTERM 后 2s SIGKILL（假 CLI 忽略 SIGTERM 用例）；
  取消后会话仍 running、可立即下一轮；取消与完成竞态单终态。
- 超时：假 CLI 挂起 → `TURN_TIMEOUT` error 事件；审批挂起暂停计时。
- spawn 失败：不存在的可执行 → `TURN_SPAWN_FAILED`，会话可重试。
- 并发上限：`SPECOS_MAX_RUNNING_SESSIONS=4` 下第 5 个 start →
  `429 SESSION_CONCURRENCY_LIMIT`（含 running/limit 数值）；
  已运行会话不受收紧影响。
- 审批：request → waiting → respond allow/deny → stdin 写入断言；
  超时 → `approval_response(timeout)` + failed；
  `APPROVAL_NOT_PENDING` 路径。
- stop 中断进行中轮次：事件顺序 error(turn) → lifecycle(stopped)。

### 3.7 API / WS（server 集成）

- messages 分流：terminal 会话行为与现有用例逐字节一致；chat 会话
  返回 turnId、幂等 duplicate、start-and-send 首轮。
- 新端点：turns/cancel（`TURN_NOT_ACTIVE`、mode mismatch）、
  approvals（B 段）、PATCH activeModel（列表校验、terminal 拒绝）。
- readonly 拦截覆盖全部新写端点。
- turn-status 帧时序：running → 终态；断连重连后从事件流可推导同一终态。
- 创建降级：generic profile + `interactionMode: "chat"` →
  持久化 terminal + `interactionModeDowngraded: true`。

## 4. 门禁映射（PRD §9）

### 4.1 MVP01-A 门禁 → 验证方式

| 门禁 | 验证 |
|---|---|
| assistant 回复 100% 结构化、无 ANSI 直渲 | §3.3 降级纪律 + §3.5 渲染映射（自动）+ 真实 Codex 走查 |
| 首段输出 ≤ 5s | §3.2 流式用例（自动，假 CLI）+ 真实 Codex 计时 |
| 重启零丢失 / 迁移 fixtures 零丢失 | §3.4 零丢失 fixture（自动） |
| 重连零重复、回放序一致 | §3.2（自动，已有基础） |
| resume 继续对话成功 | §3.6 resumeToken 注入断言（自动）+ 真实 Codex 多轮验证（手动） |
| Codex 真实多轮任务（headless + 取消 + 重试 + 重启回放） | 手动收口脚本，结果记录进交付文档 |
| `npm test` / `npm run build` 通过 | CI（现有 workflow） |
| 新文案 EN/ZH 齐备 | i18n key 完整性检查（现有测试模式复用） |

### 4.2 MVP01-B 门禁 → 验证方式

| 门禁 | 验证 |
|---|---|
| ≥ 4 并发 Session 零串台 | server 集成：4 会话（2 chat + 2 terminal，假 CLI）并行输入输出，断言事件 sessionId 归属零交叉 + Playwright 多会话冒烟 |
| New Quest → Chat View ≤ 2 次确认 | Playwright（Quest Home 创建流步数断言） |
| 组织管理不进 Settings | Playwright（已有部分覆盖，补齐） |
| Claude 真实验证（交互 + headless + Ctrl+C + resize + 退出） | 手动收口脚本 |
| 审批气泡 Allow/Deny 正确传达 / 兜底指引可见 | §3.6 审批 + §3.5 fallback 文案（自动）+ 支持协议的真实 CLI 手动验证 |
| 文件安全零越权 / 命令审计零 Git 变更 | 现有安全测试保持全绿 + 新端点纳入 |
| E2E 三栏冒烟 + 键盘走查 | Playwright |

## 5. 回归保护（重构期专项）

- Orchestrator 迁移 PR 前后：`application.test.ts` 用例零删除、
  零语义修改（允许 import 路径调整）；terminal WS 帧序列快照对比。
- schema v3 PR：v2 fixture 加载 → 序列化输出快照，与迁移规则表逐字段核对。
- kind 规范化 PR：现有前端 transcript 展示测试同步更新为规范 kind，
  一次性完成（避免双命名期）。

## 6. PRD 映射

| PRD | 本 SPEC |
|---|---|
| §9 A 门禁 | §4.1 |
| §9 B 门禁 | §4.2 |
| §10 交付顺序「每步可验证」 | §3 按分册分组即步骤验证清单 |
| §8 「A 段地基一次到位」 | §3.2 / §3.4 全量在 A 段落地 |
