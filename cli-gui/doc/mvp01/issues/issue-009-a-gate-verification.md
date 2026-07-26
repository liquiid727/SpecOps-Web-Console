# MVP01-A 段门禁收口：真实 Codex 验证 + 门禁清单核销

## Description
A 段最后一步：用真实 Codex CLI 做手工多轮验证（fake CLI 无法覆盖的部分），逐项核销 PRD §9 A 段验收门禁，产出验证记录。任何门禁不满足 → 回开对应 Issue，不得带病进 B 段。

## Acceptance Criteria
- [x] 真实 Codex 手工脚本执行并记录：连续 3+ 轮对话（resume 上下文延续）、中途取消后再发新轮、服务重启后回放完整（test-spec §4.1）
- [x] 门禁 G-A1：真实 v2 数据迁移 v3 零丢失（#1 fixture 在真实备份数据上复跑）
- [ ] 门禁 G-A2：chat 首 token 呈现 ≤5s（本地 Codex 实测，网络异常除外） <!-- BLOCKED: 两次实测 6047ms/5039ms（500ms 轮询粒度，真实值约 4.5–5.0s 边界波动，主要是模型侧延迟）；已返工 1 次，详见 a-gate.md，PENDING-HUMAN 复测 -->
- [x] 门禁 G-A3：重启后 transcript 回放与重启前 UI 一致（事件数、顺序、kind）
- [x] 门禁 G-A4：terminal 会话全回归通过（application.test.ts + Playwright 现有用例）
- [x] CI 全绿：vitest unit + server 集成（fake CLI）+ 现有 E2E
- [x] 验证记录写入 `cli-gui/doc/mvp01/verification/a-gate.md`（含 CLI 版本号、日期、逐项结论）
- [ ] 开放问题回填：codex headless 审批是否阻塞 stdin 的实测结论，回写 adapter-spec §5 <!-- BLOCKED: 红线禁止修改 SPEC 分册；实测结论（不阻塞，但 stdin pipe 不关闭会挂死）已记录于 a-gate.md 与本卡 Notes -->

## Dependencies
Issue #1, #2, #3, #4, #5, #6, #7, #8

## Type
fullstack

## Priority
high

## SPEC Reference
test-spec §4.1；architecture-spec §5（A/B 划分）；PRD §9.1

## Notes
- 验证方式：`scripts/a-gate-real-codex.ts`（npx tsx 运行）用真实 codex-cli 0.145.0 + 真实 server（HTTP API 驱动）跑完整链路：3 轮对话（PINEAPPLE42 记忆回忆验 resume）、中途取消、取消后新轮、重启回放对比、ANSI 检查、审批 stdin 探测。全部结论见 verification/a-gate.md。
- **门禁修复的产品缺陷**：codex exec 在 stdin 为 pipe 且不关闭时打印 "Reading additional input from stdin..." 并永久等待 EOF → 轮次挂死至超时。修复：orchestrator 轮次 spawn 后立即 `child.stdin.end()`（prompt 完全经 argv 传递，通用行为无 CLI 字面量）。fake CLI 不读 stdin 故此前全绿，只有真实 CLI 能暴露——这正是本门禁卡的价值。
- **环境坑**：npx/tsx 会向 PATH 注入祖先目录 node_modules/.bin（含残留假 codex 0.2.3）；且 profile-adapters.detectCapabilities 用 process.env 探测版本。脚本内覆写 process.env.PATH 剔除 node_modules/.bin 后才能命中真实 CLI（否则 0.2.3 落在 >=0.145.0 验证范围外 → headless 关闭 → 静默降级 terminal）。
- G-A2 两次实测 6047ms/5039ms，边界 FAIL；系统侧开销 <500ms，主延迟在模型侧。按规则返工 1 次后记账继续，PENDING-HUMAN 复测。
- 审批探测发现 `--sandbox read-only` 在 /var/folders 临时目录下拦截不稳定（一次写入成功一次被拒），属 codex 沙箱策略行为，与本门禁（stdin 不阻塞）无关；已记入 a-gate.md 供 adapter-spec 后续修订参考。
- claude CLI 未安装：本卡无 claude 项；B 段相关真实验证将记 PENDING-HUMAN。
- transcript API limit 上限 200（application.ts 校验），验证脚本改为分页拉取——与 frontend 实际用法一致。
