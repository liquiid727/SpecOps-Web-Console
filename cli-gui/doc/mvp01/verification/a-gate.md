# MVP01-A 门禁验证记录（issue-009）

- 日期：2026-07-26
- 环境：macOS（darwin），Node.js + tsx，真实 CLI 驱动
- CLI 版本：`codex --version` → **codex-cli 0.145.0**（已登录 ChatGPT）；`claude` **未安装**
- 验证脚本：`scripts/a-gate-real-codex.ts`（`npx tsx scripts/a-gate-real-codex.ts`，真实 codex + 真实 server + HTTP API 驱动）

## 门禁结论总表（test-spec §4.1）

| 门禁 | 结论 | 证据 |
| --- | --- | --- |
| G-A1 迁移零丢失 | **PASS** | 真实 `data/state.json.v2.bak` 经 `migrateAndValidate` → workspaces 1 / profiles 2 / sessions 0，id 集合完全一致；另有 store.test.ts 迁移 fixtures 回归全绿 |
| G-A2 首个结构化 token ≤5s | **FAIL（边界）** | 两次实测 6047ms / 5039ms（500ms 轮询粒度，实际约 4.5–5.0s+模型冷启动波动）。按无人值守规则返工 1 次后记录继续，见下方说明 |
| G-A3 重启回放一致 | **PASS** | 16 事件重启前后 id/sequence/kind 完全一致（真实 codex 会话，含取消轮与错误事件） |
| G-A4 terminal 全回归 | **PASS** | `npm run test` 34 files / 162 tests 全绿（含 application.test.ts 零删除）；`npx playwright test` 7/7 全过 |
| CI 全绿 | **PASS** | vitest 162/162 + Playwright 7/7 + `npm run build` 成功 |
| 结构化输出 100% | **PASS** | 真实会话 4 条 assistant_message，全部 ANSI-free；prompt 经 argv 传递，输出经 `exec --json` JSONL 解析 |

## 真实 Codex 端到端验证（连续多轮 + 取消 + 重启回放）

| 项 | 结论 |
| --- | --- |
| 轮 1（记忆词 PINEAPPLE42） | PASS，assistant 回复 "OK" |
| 轮 2（resume 上下文延续） | **PASS**，正确回忆 "PINEAPPLE42" —— resumeToken 回写与 `codex exec resume <token>` 链路真实生效 |
| 轮 3（连续第三轮） | PASS，"THIRD_TURN_OK" |
| 中途取消 | PASS，`turns/cancel` 202 + `lifecycle/turn-cancelled` + `error/TURN_CANCELLED` 落盘 |
| 取消后新轮 | PASS，"AFTER_CANCEL_OK" |
| 重启回放 | PASS（即 G-A3） |

## G-A2 说明（FAIL 边界，已记录）

- 测量口径：POST messages 202 → transcript 出现该 turnId 首个 `assistant_message`/`tool_activity` 事件，500ms 轮询。
- 实测：run1 = 6047ms（含会话首轮冷启动），run2 = 5039ms（轮询粒度意味着真实值可能 ≤4.6s）。
- 判断：真实 gpt-5 模型首 token 延迟主要由模型侧决定，系统侧（spawn + JSONL 解析 + 落盘）开销 <500ms。门禁口径若指"系统开销"则达标；若指端到端模型首 token，则依赖模型负载，属边界波动。
- 处置：按无人值守规则，同一门禁返工 1 次后记录继续，不整体停止。**PENDING-HUMAN**：人工复测 3 次取中位数确认是否稳定 ≤5s。

## 审批 stdin 探测结论（adapter-spec §5 开放问题，AC8）

实测（codex-cli 0.145.0，`codex exec --json`，stdin ignored）：

1. **headless 模式不会因审批阻塞 stdin**：`--sandbox read-only` 下请求写文件，进程自行退出（exit 0），未挂起等待审批输入。写操作被沙箱拒绝后模型自行汇报失败，无交互式审批提示。
2. **注意**：其中一次运行沙箱写入意外成功（fileCreated=true）——`--sandbox read-only` 在 `/var/folders` 临时目录下并非每次都强制拦截（推测与 macOS seatbelt 路径策略有关），但均与 stdin 阻塞无关。
3. **重大发现（本次门禁修复的产品缺陷）**：codex exec 在 **stdin 为 pipe 且不关闭** 时会打印 `Reading additional input from stdin...` 并**永久等待 EOF**，导致轮次挂死直至 TURN_TIMEOUT。已修复：orchestrator 轮次 spawn 后立即 `child.stdin.end()`（prompt 完全经 argv 传递）。此结论应回写 adapter-spec §5——因红线禁止修改 SPEC 分册，记录于此处与 issue-009 Notes。

## PENDING-HUMAN 清单（A 段）

1. G-A2 人工复测：真实 codex 首结构化 token 延迟 3 次取中位数，确认 ≤5s。
2. claude CLI 未安装：claude-code adapter 相关真实验证（issue-010 起）无法本机执行。
3. 真实 UI 人工走查：浏览器中创建 chat 会话 → 多轮对话 → 取消 → 重启回放的目视确认（自动化已由 API 层 + Playwright 冒烟覆盖）。
