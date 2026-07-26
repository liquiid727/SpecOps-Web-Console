# MVP01-B 段门禁验证记录（issue-017）

- 日期：2026-07-26
- 分支：feature-cli-gui
- 环境：macOS（darwin），Node.js + vitest + Playwright（chromium，port 3101）
- CLI 探测：`codex --version` → **codex-cli 0.145.0（已安装）**；`claude --version` → **未安装**
- 自动化基线：vitest **35 files / 198 tests 全绿**；Playwright **11/11 全绿**（含本卡新增 B 段冒烟链路）；i18n 静态检查 **381 EN / 381 ZH 对称、257 个 t() 引用全部存在**

## 逐项门禁结论（PRD §9.2 / test-spec §4.2）

### E2E 冒烟链路 — PASS（自动化）
`e2e/workbench.spec.ts` › `runs the B-gate smoke chain: create, multi-turn, cancel, terminal replay, reload, archive`：
Quest Home 一次提交创建 chat 会话 → 两轮对话（fake headless CLI）→ `slow:` 挂起轮点击 Stop turn 取消 → 切 chat Terminal tab 断言 `cli-raw` 原始输出（降级 pty_output 回放）→ 刷新后 transcript 从磁盘完整回放 → 右键菜单 Archive + 确认对话框归档 → active 过滤下消失。全链路绿（6.1s）。

> 本链路验证过程中发现并修复一个真实缺陷：`ActionDialog` / `NewSessionDialog` / `WorkspaceProfileManager` 的表单确认按钮未显式 `type="submit"`（`Button` 组件默认 `type="button"`），真实浏览器中点击确认永远不会提交表单；既有组件测试直接派发 submit 事件掩盖了该问题。已修复并由本 E2E 覆盖。

### G-B1 ≥4 会话并行零串台 — PASS（自动化）
- E2E 层：`keeps concurrent chat and terminal sessions isolated` 扩展为 2 chat（Chat quest A/B）+ 2 terminal（Fixture session + Terminal quest C）同时 running；逐会话断言 transcript 只含自己的轮次、两个 terminal 会话均无任何 `reply:` 串入。
- server 集成层：issue-011 `chat-api.test.ts` 并发上限用例（第 5 个 start 429 SESSION_CONCURRENCY_LIMIT、幂等 start 不受限、stop 释放槽位）。

### G-B2 审批链路 UI 层验证 — PASS（组件测试记账）
E2E 全链路驱动真实审批回调成本高且不稳定，按保守解释以既有自动化记账：
- issue-013 审批 UI 组件测试：审批气泡渲染、Allow/Deny 提交、超时进入兜底、兜底指引文案（转 Terminal tab 处理）。
- issue-012 chat-api/orchestrator 集成测试：approval request/response 事件、超时 deny、审批事件入 transcript。
浏览器内真实 CLI 触发审批的端到端人工复验列入 PENDING-HUMAN。

### G-B3 真实 Claude CLI 多轮 + resume — PENDING-HUMAN
本机未安装 claude CLI，无法自动验证。人工步骤（安装 claude 后）：
1. Settings 新建 profile：command=`claude`，验证 capability 探测为 claude adapter。
2. Quest Home 创建 chat 会话，连续 ≥3 轮对话，确认结构化 transcript、轮次完成事件正常。
3. 重启 server 后对同一会话再发一轮，确认 resume（`--resume <sessionId>`）续接上下文。
4. 记录 `claude --version` 版本号回填本文档。
（补充：codex-cli 0.145.0 已安装，A 段门禁已用真实 codex 验证 headless 多轮，见 a-gate.md。）

### G-B4 terminal 会话与组织功能全回归 — PASS（自动化）
- vitest 全量 35 files / 198 tests 全绿（含 application.test.ts terminal 行为用例零删除零语义修改）。
- Playwright 11/11 全绿：terminal transcript/xterm/inspector/picker 流、context menu、manual reorder、mobile drawer、Quest Home 创建/降级等既有用例无退化。

### a11y 走查 — PARTIAL（axe 扫描 BLOCKED + 键盘走查 PASS）
- axe 扫描：**BLOCKED** — axe-core 不在依赖树，红线"不升级/新增依赖"优先于门禁扫描要求，无法在自动化中运行 axe。替代证据：组件测试断言 role/aria（menu/menuitem、tablist/tab、dialog、role=status、role=log 等）；PENDING-HUMAN：浏览器 axe DevTools 手工扫描 Quest Home、ChatView、审批气泡、Terminal tab，确认无 serious/critical。
- 键盘走查：PASS — E2E 覆盖 context menu 键盘导航（ArrowDown/Escape/焦点归还）、mobile drawer 焦点圈定；#16 清单（b-experience-checklist.md §5）复核通过。

### i18n 复查 — PASS（自动化）+ PENDING-HUMAN（溢出破版）
- `scripts/check-i18n-keys.cjs`：381 EN / 381 ZH 键对称、0 缺失、257 个 t() 引用全部存在。
- 溢出破版需人眼判断：PENDING-HUMAN — en/zh 切换下浏览 Quest Home、ChatView、审批气泡、Settings，确认无截断/破版。

## PENDING-HUMAN 汇总
1. G-B3：真实 Claude CLI 多轮 + resume（按上文 4 步执行并回填版本）。
2. G-B2 补充：真实 CLI 触发审批的浏览器端到端复验（Allow/Deny/超时兜底）。
3. a11y：浏览器 axe DevTools 手工扫描新增视图（serious/critical 为 0）。
4. i18n：en/zh 切换目检无溢出破版。

## 未尽事项（转 roadmap）
- 引入 @axe-core/playwright 做 CI 内自动 a11y 扫描（需解除依赖冻结后补）。
- 审批链路浏览器 E2E 自动化（需可控的假审批 CLI fixture 扩展）。
- 预存 tsc 类型错误清理（15 处，均在本卡未触碰的旧文件：ChatView/Sidebar 的 Session 类型缺 interactionMode 声明、Marketplace/Knowledge/Settings 动态 key 的 TranslationKey 收窄、Tabs buttonProps 类型、platform.test 签名），vitest/esbuild 不受影响，运行时行为正常。
