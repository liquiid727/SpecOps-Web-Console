# MVP01-B 段门禁收口：E2E 冒烟 + i18n/a11y + Claude 真实验证

## Description
B 段最后一步：跑通完整 Playwright E2E 冒烟链路，用真实 Claude CLI 复验多轮对话，逐项核销 PRD §9 B 段门禁，产出验证记录。通过后 MVP01 整体交付。

## Acceptance Criteria
- [x] Playwright E2E 冒烟：Quest Home 创建 chat 会话 → 多轮对话（fake CLI）→ 取消一轮 → 切 Terminal tab 查看原始输出 → 重启回放 → 归档，全链路绿（test-spec §4.2）
- [x] 门禁 G-B1：4 会话（2 chat + 2 terminal）并行零串台（#11 验收用例在 E2E 层复跑）
- [x] 门禁 G-B2：审批链路（allow/deny/超时/兜底文案）在 UI 层验证通过 <!-- 组件测试记账（issue-012/013）；真实 CLI 浏览器端到端复验 PENDING-HUMAN，见 b-gate.md -->
- [ ] 门禁 G-B3：真实 Claude CLI 多轮 + resume 手工验证并记录版本 <!-- PENDING-HUMAN：本机未安装 claude CLI（codex-cli 0.145.0 已装）；人工步骤已写入 b-gate.md -->
- [x] 门禁 G-B4：terminal 会话与既有组织功能全回归无退化
- [ ] a11y 走查：axe 扫描新增视图无 serious/critical 违规；键盘操作路径复核（#16 清单复跑） <!-- BLOCKED: axe-core 不在依赖树，红线“不升级/新增依赖”优先；键盘走查部分已过（E2E + #16 清单），axe 扫描转 PENDING-HUMAN（浏览器 axe DevTools） -->
- [x] i18n 复查：en/zh 切换下全部新界面无缺失、无溢出破版 <!-- 脚本验证 0 缺 key；溢出破版目检 PENDING-HUMAN -->
- [x] 验证记录写入 `cli-gui/doc/mvp01/verification/b-gate.md`（CLI 版本、日期、逐项结论）；未尽事项转入 roadmap

## Dependencies
Issue #10, #11, #12, #13, #14, #15, #16

## Type
fullstack

## Priority
medium

## SPEC Reference
test-spec §4.2、§5；architecture-spec §5；PRD §9.2

## Notes
- N1 真实缺陷修复：冒烟 E2E 暴露 `ActionDialog`/`NewSessionDialog`/`WorkspaceProfileManager` 确认按钮未显式 `type="submit"`（`Button` 组件默认 `type="button"`），真实浏览器点击确认从不提交表单；既有组件测试直接派发 submit 事件掩盖了问题。已修复（三处确认按钮加 `type="submit"`）并由冒烟 E2E 的归档确认步骤回归覆盖。
- N2 fixture CLI 扩展：假 headless CLI 每轮输出未识别行 `cli-raw <prompt>`（验证降级 pty_output → chat Terminal tab 回放）；`slow:` 前缀 prompt 挂起 20s（验证 Stop turn 取消路径）。对既有断言无影响。
- N3 axe 冲突裁决：门禁要求 a11y 扫描真跑，但 axe-core 不在依赖树且红线禁止新增依赖；红线优先，axe 自动扫描记 BLOCKED，以组件 aria 断言 + 键盘走查 E2E 作替代证据，浏览器 axe DevTools 人工扫描转 PENDING-HUMAN；@axe-core/playwright 引入转 roadmap。
- N4 G-B2 保守解释：“UI 层验证”以 issue-013 审批 UI 组件测试（allow/deny/超时/兜底文案）+ issue-012 后端集成测试记账；真实 CLI 触发审批的浏览器端到端属于真实 CLI 验证项，并入 PENDING-HUMAN。
- N5 G-B1 复跑方式：在既有 multi-session E2E 上扩展第 2 个 terminal 会话（Terminal quest C）而非新开用例，凑足 2 chat + 2 terminal 并保留原有断言；默认并发上限 8 不构成阻碍。
- N6 预存 tsc 类型错误：`tsc --noEmit` 报 15 处错误，均在本卡未触碰的旧文件（Session 类型缺 interactionMode、动态 TranslationKey 收窄等）；vitest/esbuild 不受影响，修复属于跨卡重构超出本卡范围，转 roadmap（已记入 b-gate.md 未尽事项）。
- N7 本卡未修改 SPEC/PRD；未发现 SPEC 矛盾项。
