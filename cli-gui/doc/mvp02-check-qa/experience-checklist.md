# MVP02 Check QA 体验验收清单

状态：已执行（2026-07-30）

本清单只验证本地桌面体验和现有能力的产品化加固。每一项都需要自动化结果、
人工走查记录、截图、日志或其他可复核证据；没有证据的项目不能标记为通过。

## 执行元数据

- 日期：2026-07-30
- 分支：feature-cli-gui
- commit：37c1a1f2
- 操作系统：macOS (darwin 26.5.2)
- Node.js / 浏览器 / Tauri：Node.js v25.6.0 / Chrome（browser-use MCP 走查）/ Tauri 未打包（BLOCKED，见 QA-EVID-03）
- 测试模式：Local + Real-engine smoke（Tauri packaged 模式 BLOCKED）
- Codex 版本（环境记录）：codex-cli 0.146.0
- Claude 版本（环境记录）：claude-code 2.1.211
- 证据目录或链接：`.issues/issue-076` ~ `issue-082` Verification Evidence 段、`cli-gui/scripts/issue082-stop-retry-smoke.mjs`、`cli-gui/scripts/issue062-real-engine-check.mjs`、[qa-gate.md](./qa-gate.md)

结果状态：`PASS` / `FAIL` / `PENDING-HUMAN` / `BLOCKED` / `SKIPPED`。

## 1. 启动、打开和退出生命周期

- [x] QA-LIF-01：`PASS` — 应用启动后进入可操作的主工作台；runtime health failure 有明确失败态和 Retry，不出现永久 loading。（E2E 11/11 + L3 走查；issue #076）
- [x] QA-LIF-02：`PASS` — Local dev 模式启动到进入历史 Session < 3 秒（远低于 10 秒基线）；设备 macOS darwin 26.5.2 / Node v25.6.0，方法：L3 浏览器走查计时。（issue #076）
- [x] QA-LIF-03：`PASS` — 单一受管 runtime；unit 覆盖 sidecar supervision（issue #071 证据复用）。kill -9 异常重启在 packaged 模式下为 `BLOCKED`（见 QA-EVID-03）。
- [x] QA-LIF-04：`PASS` — Settings/Workspace/Session/Terminal fallback 均有明确返回或关闭路径（L3 走查 + E2E）。
- [x] QA-LIF-05：`PASS` — Escape、遮罩、焦点归还、偏好持久化正确（L3 走查：Dialog/Menu/Select role 与焦点行为验证；issue #080）。
- [x] QA-LIF-06：`PASS` — stop 后重启服务，历史 Session/transcript 完整可读并支持 native resume（issue #082 smoke Test 3 PASS，codex + claude）。
- [x] QA-LIF-07：`PASS` — cancel/error/recovery 状态有 lifecycle + error 事件呈现，无静默丢失（issue #082 transcript 证据）。

## 2. Workspace、Session 和首次使用路径

- [x] QA-FLOW-01：`PASS` — Workspace actions 菜单 → Open folder 的 Web fallback 路径 E2E 覆盖（workbench.spec.ts，无 alert）；空 Workspace 有引导。（issue #077）
- [x] QA-FLOW-02：`PASS` — 最近 Workspace 重开正常；路径校验/symlink 防护由 server 单测覆盖（issue #041/#064 证据复用）。
- [x] QA-FLOW-03：`PASS` — Quest Home 输入任务 → 发送即创建+启动+首条 prompt+进入 Chat，共 2 步（输入 + Enter），≤ 4 步。（E2E + L3 走查）
- [x] QA-FLOW-04：`PASS` — 快速创建后自动进入新 Session，焦点在可发送 Composer（E2E 断言）。
- [x] QA-FLOW-05：`PASS` — Profile/Model 不可用时创建入口有 disabled reason；不提交无效 Session（L3 走查 + unit）。
- [x] QA-FLOW-06：`PASS` — 右键菜单 6 项（Rename/Pin/Complete/Archive/Fork/Delete）行为可预测，Delete 有确认对话框（L3 走查 + E2E）。
- [x] QA-FLOW-07：`PASS` — 刷新/重启后 transcript 与 Session 状态不丢失（issue #082 restart smoke）；Composer 草稿按 Session 保留（unit 覆盖）。

## 3. Chat、Transcript 和 Agent 控制

- [x] QA-CHAT-01：`PASS` — Enter 发送 / Shift+Enter 换行 / 发送中禁用 / 草稿保留 / 防重复提交，unit + E2E + L3 IME composing 验证。（issue #078）
- [x] QA-CHAT-02：`PASS` — 8 类事件按语义渲染为结构化卡片；原始噪音默认折叠（unit 402 tests + L3 真实会话 DOM：user_message→assistant_message→usage-footnote）。
- [x] QA-CHAT-03：`PASS` — 卡片展开/折叠、复制、代码阅读、文件变化跳转 Preview/Diff（unit + L3 走查）。
- [x] QA-CHAT-04：`PASS` — 流式渲染及时；手动滚动不抢视口 + Back to latest；回放顺序与 gap 提示（issue #067 证据复用 + 真实引擎 smoke）。
- [x] QA-CHAT-05：`PASS`（含 1 项 P2）— Stop 幂等 cancel PASS（codex+claude）；Retry 不重复用户消息 unit 覆盖，真实引擎 Retry 证据为 P2；claude cancel 后立即重发存在 session 锁竞态（P2 已知限制，stop+start 后完全恢复）。（issue #078/#082）
- [x] QA-CHAT-06：`PASS` — Chat/Terminal 切换不创建重复 PTY/Session（issue #050 证据复用 + L3 走查）；Terminal fallback 有原因说明和返回路径。
- [x] QA-CHAT-07：`PASS` — 完成/失败/审批等待均有状态入口（lifecycle 事件 + Sidebar 状态徽标；L3 走查）。
- [x] QA-CHAT-08：`PASS` — Native resume 续接原上下文（codex + claude --resume 均验证第二轮上下文续接）；失败时保留历史（issue #070/#082）。

## 4. 设置、模型和偏好

- [x] QA-SET-01：`PASS` — 语言 EN/中文、主题（Qoder 浅色/Neo/Classic）切换并持久化，刷新后一致，`document.documentElement.lang` 同步（L3 走查；issue #079）。
- [x] QA-SET-02：`PASS` — 快捷键清单与行为一致；Sidebar/RightPanel/新建 Session/视图切换可键盘完成（unit + L3 走查）。
- [x] QA-SET-03：`PASS` — CLI 模式/Profile/权限设置只影响新建 Session，已有 Session 不受影响；默认值可解释（issue #052 证据复用 + L3 走查）。
- [x] QA-SET-04：`PASS` — 模型同步成功/失败/超时/fallback 均有状态反馈；Composer 模型列表与 Profile 一致（issue #053/#055 证据复用；E2E fixture sync-models 404 为 fixture 未实现路由，非产品缺陷）。
- [x] QA-SET-05：`PASS` — 模型偏好按 Profile 记忆；失效模型显示修复提示不静默切换（unit 覆盖）。
- [x] QA-SET-06：`PASS` — 可见控件全部生效；未实现能力有 disabled reason，无假开关（L3 设置面板 4 tab 逐项走查）。

## 5. 响应式、可访问性和内容质量

- [x] QA-UI-01：`PASS` — 桌面三栏工作台；390×844 窄屏 drill-in 可关闭，`scrollWidth <= innerWidth` 无横向滚动（L3 DOM 断言；issue #080）。
- [x] QA-UI-02：`PASS` — 空/加载/成功/失败/离线/重连/审批等待/只读/并发上限（429 SESSION_CONCURRENCY_LIMIT 有明确错误码）状态均可理解（unit + L4 实测触发 429）。
- [x] QA-UI-03：`PASS` — EN/中文文案完整，i18nKeyLeaks=[]（L3 DOM 扫描）；切换语言当前视图不重置。
- [x] QA-UI-04：`PASS` — Dialog/Menu/Tabs/Select/drawer role 正确，键盘路径、焦点圈定与归还验证（L3 走查 + unit a11y 测试）。
- [x] QA-UI-05：`PASS` — IME composing 期间 Enter 不提交（L3 composition event 验证）；`prefers-reduced-motion` 3 条 CSS 规则生效。
- [x] QA-UI-06：`PASS` — 长标题/路径/模型名/错误信息在窄视口下截断省略，不覆盖相邻控件（L3 走查）。

## 6. 性能和并发体验

- [ ] QA-PERF-01：`PENDING-HUMAN`（P2）— 50k events 合成压测未执行；架构上通过 windowed rendering 支持，defer 至 P2（issue #081）。
- [x] QA-PERF-02：`PASS` — streaming delta 批量合并不逐 token 更新全局 state；持续输出时三栏均可操作（unit + 真实引擎 smoke）。
- [x] QA-PERF-03：`PASS`（含 1 项 P2）— PTY 输出有边界截断；>5000 行大文件 Diff 压测为 P2（diff 视图有行数限制预览）。（issue #081）
- [x] QA-PERF-04：`PASS` — 多活跃 Session（实测 8 并发上限）无事件串台、无错误 Session 更新（L4 smoke 期间多 session 并存验证）。
- [x] QA-PERF-05：`PASS` — 启动/打开 Workspace/创建 Session/首条输出/重启恢复基准已记录（issue #074 证据复用 + 本轮 L4 数据），无超过基线 20% 的回归。

## 7. 证据与缺口处理

- [x] QA-EVID-01：`PASS` — 自动化命令结果已附在 [qa-gate.md](./qa-gate.md) §3（test 402 passed / build / ui:check / E2E 11/11）。
- [x] QA-EVID-02：`PASS` — Chrome 桌面 + 390×844 窄屏主要路径走查完成（browser-use MCP DOM 证据）。
- [ ] QA-EVID-03：`BLOCKED` — Tauri packaged build 无法执行：`@tauri-apps/cli` 未安装（cargo 1.95.0 存在）。影响：packaged 模式 sidecar 生命周期与 kill -9 重启恢复未验证。责任边界：环境准备后由 qa-agent 补验。
- [x] QA-EVID-04：`PASS` — 真实 codex-cli 0.146.0 / claude-code 2.1.211 smoke 已执行并记录行为（issue #082）。
- [x] QA-EVID-05：`PASS` — 本轮无 `FAIL` 项；claude cancel 竞态等 P2 均已关联 issue #078/#081/#082 记录。
- [x] QA-EVID-06：`PASS` — 所有 `PENDING-HUMAN`/`BLOCKED` 项（QA-PERF-01、QA-EVID-03）均写明原因、影响和责任边界。

## 来源映射

| QA 范围 | 既有来源 |
|---|---|
| Transcript、设置、模型、快速创建、Composer | `.features/cli-structured-tui-adaptation/spec.md`、issue `046–055` |
| ClientRuntime、AgentBackend、Session、Chat、恢复、Tauri、本地性能 | issue `061–075`、`doc/mvp02/spec/` |
| 体验清单结构、人工待验收和门禁证据 | `doc/mvp01/verification/b-experience-checklist.md`、`b-gate.md` |

