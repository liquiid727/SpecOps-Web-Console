# MVP02 Check QA

状态：PRD/SPEC 就绪，准备执行

`mvp02-check-qa` 是 MVP02-A 本地桌面能力完成后的体验加固和质量收口轨道，
位于 MVP02-B 远程控制之前。它不改写 MVP02 现有 PRD、SPEC 或 roadmap，
也不是新的产品 MVP。

## 目标

验证并补强用户原本在终端中使用 Codex、Claude 等 Agent 时需要的本地工作流：

- 应用启动、runtime ready、Workspace 打开和最近项目恢复足够快。
- 创建 Session、进入 Chat、发送任务、观察流式执行和查看结果的路径足够短。
- 停止、重试、审批、切换视图、关闭、退出、重启和恢复行为连续且可解释。
- 设置、模型、快捷键、语言、主题和偏好能够生效并持久化。
- 长输出、窄屏、中文输入、错误、离线和恢复状态不会破坏主要工作流。

“不打开系统 Terminal”只是一项场景检查：正常流程不能强迫用户离开应用，
应用内 Setup/Advanced Terminal 仍然可以作为登录、兼容性和诊断 fallback。
真实 CLI 版本只记录为测试环境信息，不是产品成功定义。

## 交付物

- [prd-experience-hardening.md](./prd-experience-hardening.md)：体验加固与质量收口 PRD（目标、用户故事、功能需求、成功标准）。
- [spec-experience-verification.md](./spec-experience-verification.md)：体验验收规范 SPEC（验证层级、场景域、证据要求、缺口协议、issue 拆分指导）。
- [adapter-capability-matrix.md](./adapter-capability-matrix.md)：Adapter 能力矩阵与事件覆盖。
- [experience-checklist.md](./experience-checklist.md)：体验、交互、设置、生命周期和性能检查清单。
- [qa-gate.md](./qa-gate.md)：执行记录、证据、待人工验证项和门禁结论模板。

## 范围边界

### 纳入

- MVP02-A 已有本地 Runtime、Chat、Session、Workspace、Diff、Monitor、Tauri
  和 recovery 能力的用户体验验证。
- `.features/cli-structured-tui-adaptation/spec.md` 及 issue `046–055` 的
  UI、Transcript、设置、模型和 Session 创建补强项。
- MVP02 本地实现 issue `066–073` 的体验回归和证据收口。

### 不纳入

- 不修改 `doc/mvp02/` 下现有 PRD、SPEC 或 roadmap。
- 不重复实现 `ClientRuntime`、`AgentBackend`、Transport 或 RemoteRuntime 合同。
- 不纳入 issue `056–060` 的日报、任务列表、RepoWiki、Skill 自动生成和主题产品增强。
- 不纳入 issue `076–089` 的远程控制实现。

## 执行顺序

1. 按清单对当前实现做自动化和人工核对。
2. 复用已有 issue 的实现和测试证据，不重复开卡。
3. 只有清单发现未覆盖的真实缺口时，才使用下一个可用 issue 编号新增 QA issue。
4. 修复缺口后更新清单和 [qa-gate.md](./qa-gate.md)，再决定是否允许进入 MVP02-B。

## 相关来源

- [MVP02 architecture SPEC](../mvp02/spec/architecture-spec.md)
- [MVP02 UI interaction SPEC](../mvp02/spec/ui-interaction-spec.md)
- [MVP02 verification SPEC](../mvp02/spec/test-spec.md)
- [MVP01 experience checklist](../mvp01/verification/b-experience-checklist.md)
- [MVP01 gate record](../mvp01/verification/b-gate.md)
