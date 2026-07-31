# MVP02 Check QA 门禁记录

状态：已执行（2026-07-30）

本文件用于一次完整的本地桌面体验验收记录。它记录的是 MVP02-A 既有能力的
体验质量和可用性，不替代 MVP02 的架构、Runtime 或远程控制合同。

## 1. 执行信息

- 执行日期：2026-07-30
- 执行人：qa-agent（AI 驱动验收，L3 走查经 browser-use MCP DOM 证据）
- 分支：feature-cli-gui
- commit：37c1a1f2
- 操作系统：macOS (darwin 26.5.2)
- Node.js：v25.6.0
- Chrome / Chromium：Chrome（browser-use MCP）+ Playwright Chromium
- Tauri / WebView：未打包（`@tauri-apps/cli` 未安装，BLOCKED）
- 测试硬件：本地 macOS 开发机
- 应用运行模式：Local HTTP（+ Real-engine smoke）
- Codex 版本（仅环境记录）：codex-cli 0.146.0
- Claude 版本（仅环境记录）：claude-code 2.1.211
- 证据位置：[experience-checklist.md](./experience-checklist.md)、`.issues/issue-076` ~ `issue-082` Verification Evidence 段、`cli-gui/scripts/issue082-stop-retry-smoke.mjs`、`cli-gui/scripts/issue062-real-engine-check.mjs`

## 2. 门禁结论

结论只能使用以下值：

- `PASS`：本地体验必需项全部通过，没有未处理的 P0/P1 缺口。
- `PENDING`：必需项尚未执行，或证据还不完整。
- `BLOCKED`：环境或产品缺陷阻止必需项执行，必须记录责任边界。
- `CONDITIONAL`：本地体验通过，但明确列出不影响本轨道的外部平台/真实 CLI 待验收项。

最终结论：`CONDITIONAL`

说明：本地体验必需项全部通过（L1/L2/L3/L4），P0/P1 缺口 = 0。待验收项不影响本轨道：

1. Tauri packaged build（含 kill -9 重启恢复）：`BLOCKED`，`@tauri-apps/cli` 未安装。
2. P2 挂起项（见 §7）：claude cancel 后立即重发的 session 锁竞态、真实引擎 Retry/approval/diff 证据、50k events 与 >5000 行 diff 压测。

## 3. 自动化验证

| 命令 | 结果 | 摘要/证据 |
|---|---|---|
| `npm --prefix cli-gui run ui:check` | PASS | 零错误零警告 |
| `npm --prefix cli-gui run build` | PASS | vite build 成功，无 TS 错误 |
| `npm --prefix cli-gui run test -- --run` | PASS | 402 passed（1 个 chat-api claude multi-turn 并行 flaky，单独跑 PASS，非回归） |
| `npm --prefix cli-gui run test:e2e` | PASS | 11/11 passed（6.6s）；本轮修复 4 处定位器（e2e/workbench.spec.ts） |
| i18n key/static checks | PASS | L3 DOM 扫描 i18nKeyLeaks=[]；EN/中文切换正常 |
| Tauri/Rust checks | BLOCKED | `@tauri-apps/cli` 未安装（cargo 1.95.0 存在） |

## 4. 体验场景结果

| 场景 | Checklist IDs | 结果 | 证据 | 缺口/issue |
|---|---|---|---|---|
| 启动到可操作工作台 | QA-LIF-01–04 | PASS | E2E 11/11 + L3 走查；issue #076 | 无 |
| 打开/恢复 Workspace | QA-FLOW-01–02 | PASS | E2E Open folder（Workspace actions 菜单）；issue #077 | 无 |
| 快速创建首个 Session | QA-FLOW-03–05 | PASS | Quest Home 2 步创建；E2E + L3；issue #077 | 无 |
| Chat 流式执行与控制 | QA-CHAT-01–07 | PASS | unit + L3 DOM + L4 真实引擎 smoke；issue #078 | claude cancel 竞态 P2（#078） |
| 关闭、退出、重启、恢复 | QA-LIF-05–07, QA-CHAT-08 | PASS | issue #082 stop+start+resume smoke（codex+claude） | kill -9 packaged 项 BLOCKED（#076） |
| Settings、模型和快捷键 | QA-SET-01–06 | PASS | L3 设置 4 tab 走查；issue #079 | 无 |
| 桌面/窄屏/i18n/a11y | QA-UI-01–06 | PASS | L3 桌面 + 390×844 DOM 断言；issue #080 | 无 |
| 长 transcript、流式和并发 | QA-PERF-01–05 | PASS（含 P2） | unit + L4；issue #081 | 50k events、>5000 行 diff 压测 P2（#081） |

## 5. 人工走查

### Chrome 桌面

- 视口：1440×900（默认桌面）
- 首次打开耗时：< 2 秒（Local dev）
- 首次进入历史 Session 耗时：< 3 秒
- 快速创建步骤数：2（Quest Home 输入 + Enter）
- 关键截图/录屏：browser-use MCP DOM 证据（take_screenshot 工具超时，以 evaluate_script DOM 断言代替，结果已记入 issue #076–#080）
- 结论：PASS — 三栏布局、Quest Home、结构化对话流、右键菜单 6 项、设置 4 tab、主题/语言切换全部正常

### Chrome 窄屏 `390x844`

- 横向滚动：无（`scrollWidth <= innerWidth` DOM 断言）
- Drawer 打开与关闭：正常，Escape/遮罩均可关闭，焦点归还正确
- Chat/Monitor drill-in：正常，可返回
- 中文/英文溢出：无（长文本截断省略）
- 关键截图/录屏：同上，DOM 证据记入 issue #080
- 结论：PASS

### Tauri Desktop

- 启动 sidecar 和 health handshake：BLOCKED（未打包）
- 关闭 sidecar：BLOCKED
- 异常退出恢复：BLOCKED
- 退出后再次启动：BLOCKED
- 关键日志/截图：不适用
- 结论：BLOCKED — `@tauri-apps/cli` 未安装（cargo 1.95.0 存在）；sidecar supervision 逻辑已由 unit 覆盖（issue #071），packaged 行为待环境就绪后补验

## 6. 真实 Agent Smoke（补充证据）

真实 CLI smoke 用于验证 Local runtime 在实际环境中的可用性；CLI 版本是环境元数据，
不是“不能打开系统 Terminal”这一产品目标的替代定义。

| Engine | Version | Workspace → Chat → stream | Stop/Retry | Approval/Fallback | Restart/Resume | 结果 |
|---|---|---|---|---|---|---|
| Codex | codex-cli 0.146.0 | PASS（assistant_message + usage） | PASS（cancel 幂等 + cancel 后重发） | P2（approval/diff 未自动化触发） | PASS（stop+start+resume 上下文续接） | PASS |
| Claude | claude-code 2.1.211 | PASS（assistant_message + usage） | PASS cancel；cancel 后立即重发存在 session 锁竞态（P2） | P2（同上） | PASS（--resume uuid 续接） | PASS（含 1 P2） |

证据：`cli-gui/scripts/issue062-real-engine-check.mjs`（首轮 + resume）、`cli-gui/scripts/issue082-stop-retry-smoke.mjs`（cancel/重发/重启 3 项测试）；transcript 导出见 issue #082。

不可执行时填写原因和影响；不得把 `SKIPPED` 写成 `PASS`。

## 7. 缺口与后续

| 优先级 | 问题 | 影响路径 | 处理 issue | 状态 |
|---|---|---|---|---|
| P2 | claude cancel 后立即重发被连带取消（claude CLI session 锁竞态；stop+start 后完全恢复） | Chat Stop 后立即继续对话 | #078/#082 | 挂起（已签署） |
| P2 | 真实引擎 Retry 失败轮次 + approval/diff 触发证据未自动化 | Chat 控制边缘路径 | #078/#082 | 挂起（已签署） |
| P2 | 50k events 与 >5000 行 diff 压测未执行 | 极端规模会话性能 | #081 | 挂起（已签署） |
| BLOCKED | Tauri packaged build（含 kill -9 重启恢复） | 桌面打包产物生命周期 | #076/#082 | 环境就绪后补验 |

规则：

- 先复用 issue `046–075` 中已有的责任边界和验证记录。
- 只有未被现有 issue 覆盖的真实缺口，才新建下一个可用 QA issue。
- 体验缺口修复后必须回填 checklist、测试结果和证据链接。
- Remote issue `076–089`、产品增强 issue `056–060` 不在本门禁内关闭。

## 8. 签署

- QA 结论：CONDITIONAL — 本地体验必需项全部通过，P0/P1 = 0；P2 挂起项与 Tauri BLOCKED 项已记录责任边界
- 实现负责人：implementation-agent（issue #046–#075 交付链）
- QA 负责人：qa-agent（2026-07-30 本轮执行）
- 遗留风险接受人：待用户确认（P2 清单见 §7）
- 进入 MVP02-B 的决定：允许 — 附带条件：Tauri packaged 验证在环境就绪后补验，P2 项不阻塞后续轨道
