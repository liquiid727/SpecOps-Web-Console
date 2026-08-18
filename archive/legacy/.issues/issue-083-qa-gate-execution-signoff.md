# QA-GATE: MVP02-A 体验验收门禁执行与签署

## Description

执行 mvp02-check-qa 全流程：自动化回归 → 场景自动化 → 人工走查 → 真实引擎
smoke → 平台验证 → 缺口修复 → 填写 qa-gate.md 签署。此 issue 是其他 QA
issue 的收口点，在所有子 issue 达标后填写门禁结论。

## Acceptance Criteria

- [x] L1 自动化回归通过：`npm run test --run` / `build` / `ui:check` 零失败。
- [x] L2 场景自动化：E2E 或 acceptance 脚本覆盖主路径。
- [x] L3 Chrome 桌面 + 窄屏 390×844 走查完成，截图/录屏记录。（take_screenshot 工具超时，以 browser-use evaluate_script DOM 断言作为证据）
- [x] L4 真实 Codex smoke 全链路 PASS。
- [x] L4 真实 Claude smoke 全链路 PASS。（含 1 项 P2：cancel 后立即重发的 session 锁竞态）
- [ ] L5 Tauri packaged build 验证（如可用；否则 BLOCKED + 原因）。 → BLOCKED：`@tauri-apps/cli` 未安装（cargo 1.95.0 存在），环境就绪后补验
- [x] P0/P1 缺口数 = 0（或已修复后重验证通过）。
- [x] P2 缺口有挂起签署和责任边界记录。（qa-gate.md §7）
- [x] experience-checklist.md 所有项有证据标注。（39 项：37 PASS、1 PENDING-HUMAN/P2、1 BLOCKED）
- [x] qa-gate.md 门禁签署完成，结论为 PASS 或 CONDITIONAL。（结论：CONDITIONAL）

## Verification Evidence (2026-07-30)

- L1: vitest 402 passed / build 成功 / ui:check 零警告（1 个 chat-api claude multi-turn 并行 flaky，单独跑 PASS，非回归）
- L2: Playwright E2E 11/11 passed（6.6s），本轮修复 4 处定位器（`cli-gui/e2e/workbench.spec.ts`）
- L3: Chrome 桌面 1440×900 + 窄屏 390×844 走查，i18nKeyLeaks=[]、无横向滚动、IME/reduced-motion/a11y role 全部验证
- L4: codex-cli 0.146.0 ALL PASS；claude-code 2.1.211 PASS（含 1 P2）；脚本 `scripts/issue082-stop-retry-smoke.mjs` + `scripts/issue062-real-engine-check.mjs`
- L5: BLOCKED（见上）
- 子 issue #076–#082 全部回填 Verification Evidence；experience-checklist.md 与 qa-gate.md 已签署
- 门禁结论：**CONDITIONAL** — 允许进入 MVP02-B，附带 Tauri 补验条件；P2 清单见 qa-gate.md §7

## Execution Order

1. 完成 issue #076（LIF）→ 复用 #071/#072 已有证据 + 补充走查。
2. 完成 issue #077（FLOW）→ 复用 #064/#066 已有证据 + 补充走查。
3. 完成 issue #078（CHAT）→ 复用 #062/#067/#068/#070 已有证据 + 补充走查。
4. 完成 issue #079（SET）→ 新验证。
5. 完成 issue #080（UI）→ 复用 #073 + 窄屏走查。
6. 完成 issue #081（PERF）→ 复用 #074 + 压力补测。
7. 完成 issue #082（ENGINE）→ 补齐 approval/diff/stop/retry/restart 真实证据。
8. 缺口修复（如有）→ 重验证相关子 issue。
9. 填写 qa-gate.md → 签署。

## Checklist IDs

QA-EVID-01 ~ QA-EVID-06

## SPEC Reference

spec-experience-verification.md §6 Execution Order, §9 Completion Gate

## PRD Mapping

prd-experience-hardening.md §6 Success Criteria, §7 Acceptance

## Sub-Issues

- #076 QA-LIF
- #077 QA-FLOW
- #078 QA-CHAT
- #079 QA-SET
- #080 QA-UI
- #081 QA-PERF
- #082 QA-ENGINE

## Type

qa

## Priority

high
