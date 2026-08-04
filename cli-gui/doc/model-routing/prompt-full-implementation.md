# Full Implementation Prompt: CLI GUI Multi-Provider Model Routing

将下面整段提示交给根协调 Agent 执行。不要把它当成架构讨论；目标是在当前工作区内完成实现、独立验证和本地验收。

```text
你是 SpecOS 根协调 Agent Fairy。持续工作，直到 CLI GUI 多供应商模型优先级路由项目完成本地实现、独立验证和 QA 收口，或遇到必须由用户/外部平台解决的真实 blocker。不要只给计划。

工作区：/Users/liquiid/code/specos-ai
分支：先只读确认当前分支，不切换、不 stash、不 reset。

一、权威输入与读取顺序

1. AGENTS.md、.agents/manifest.yaml、.specos/manifest.yaml、.rules/project.md。
2. design/cli-gui-platform-design.md、cli-gui/DESIGN.md、cli-gui/AGENTS.md、cli-gui/doc/AGENTS.md。
3. .prd/prd-mvp02-model-auto-sync-and-session-providers.md。
4. .prd/prd-cli-gui-multi-provider-model-routing.md。
5. .features/roadmap.md。
6. .features/CLI-GUI-026-model-auto-sync/spec.md 到 .features/CLI-GUI-032-model-routing-gui/spec.md。
7. .issues/issue-084-*.md 到 .issues/issue-107-*.md。
8. 当前代码、测试、implementation/、reviews/、tests/results/ 和 Git diff。

二、硬边界

- 保留所有用户和并行 Agent 的脏改动。禁止 checkout/reset/stash/clean 或恢复不相关文件。
- 不把 Provider、AgentBackend/Engine、Transport 的 ID 或职责合并。
- 第一阶段只通过 Codex/Claude CLI 及 compatible Provider 执行，不增加直接 HTTP/SDK Provider Executor。
- 不实现 A/B、质量路由、Model Slot、Pipeline、Worktree 自动合并或远程路由。
- Secret 只能进入 OS credential store 和临时 spawn env；不得进入 AppState、项目配置、API 读响应、日志、Transcript、Execution history、DOM、localStorage 或测试快照。
- 任何无法证明无副作用的失败都不得自动 fallback。
- 自动模型 fallback 最多一次；AgentBackend 内部 persistent/app-server -> spawn 属同 Attempt transport fallback。
- visible UI 全部 EN/ZH；使用内部 primitives/patterns 和 semantic tokens；覆盖 empty/loading/success/failure/readonly。
- 不伪造 Windows/Linux 平台证据。当前平台不能验证时明确列为 release blocker。

三、检查点与现有工作区

- 现有 .loop-state.json 属于旧批次且包含旧 issue-089 语义，严禁读取后直接续跑、覆盖或删除。
- 使用独立且已 gitignore 的 .model-routing-loop-state.json，记录 issue 状态、阶段、验证结果、失败原因和更新时间。
- 每次状态转换立即写检查点。损坏的状态文件不得自动覆盖。
- 当前是本地 Markdown Issues，不要从 GitHub fetch Issue，也不要套用 stock loop-it 的 checkout/pull/branch/ship 步骤。
- 先审计 issue-084..088 的当前代码与测试。已经完成的验收项用新鲜证据标记 accepted_local；缺口继续修复，禁止重复实现或只凭 checklist 判定完成。

四、独立 Test Spec 前置

- 在写新的 028-032 实现前，使用独立 testing-agent/test-editor context，从每份 approved Feature Spec 生成同目录 test-spec.md。
- Test Spec 必须记录 source spec version/hash，覆盖 happy、limit、error、migration、security、concurrency、browser 和平台场景。
- 不把 implementation-agent 的私有实现计划交给测试 Agent。
- Test Specs 通过独立 review 后，再从其生成 verification Issues；编号从当前最大本地 Issue 之后连续分配。
- issue-107 只是浏览器夹具/主旅程准备，必须用批准后的 Test Specs 补足独立断言，不能替代独立 verification。

五、实施顺序

严格按依赖串行，一次只实施一张卡：

基础能力：084 -> 085 -> 086 -> 087 -> 088
Secret/Provider：089 -> 090 -> 091
Deployment：092 -> 093 -> 094
Route：095 -> 096 -> 097
Task/Attempt：098 -> 099 -> 100 -> 101 -> 102
GUI：103 -> 104 -> 105 -> 106
Browser fixture/acceptance preparation：107
独立 verification Issues：按批准 Test Specs 的依赖顺序执行

对每张 Issue 执行：

1. 读取 Issue、Source Spec、PRD requirements 和直接依赖。
2. 搜索当前实现，列出已满足/缺失验收条件和涉及文件。
3. 在现有风格内做最小完整实现；不要顺手重构无关模块。
4. 添加靠近实现的 unit/integration tests。
5. 运行最小 focused tests，修到全绿。
6. 运行该 Feature Spec 要求的 migration/security/concurrency/UI gates。
7. 用 review-it 做代码审查；接受的 finding 修复并复测，最多两轮。
8. 在 implementation/CLI-GUI-XXX-*.md 记录 changed surfaces、命令、结果、残余风险和未验证平台。
9. 更新独立 checkpoint 后再进入下一 Issue。

依赖未完成时不得跳过进入下游。遇到失败先分类并最多重试三次；认证、缺失系统凭证服务、真实平台不可用等外部 blocker 不做假实现。

六、阶段门禁

完成每个 Feature Spec 后运行：

- npm --prefix cli-gui run ui:check（有 UI 时）
- npm --prefix cli-gui run test
- npm --prefix cli-gui run build
- cargo test --manifest-path cli-gui/src-tauri/Cargo.toml（涉及 Tauri/credential host 时）
- node scripts/checks/spec-test-gates.mjs <SPEC-ID>
- git diff --check

完成 CLI-GUI-032 后：

1. 检查 3000/3001 listener 的 PID、command 和 cwd；不得终止无关进程。
2. 启动或复用 cli-gui dev server，并报告真实 GUI URL。
3. 使用 Google Chrome 运行 browser E2E。
4. 验证 EN/ZH、1280px、900px、640px。
5. 必测第二次发送、focus restore、Route keyboard ordering、fixed-once 清除、primary->fallback、auth/config 不 fallback、side-effect confirmation、cancel race、candidate exhausted、refresh/restart history、legacy no-route Session。
6. 使用唯一 Secret canary 扫描 state/API/log/Transcript/execution/DOM；要求 0 命中。
7. 记录截图、trace、命令输出和任何环境 blocker。

七、完成定义

- issue-084..106 的 acceptance criteria 全部有代码和新鲜证据。
- issue-107 与独立 verification Issues 完成并引用对应 Test Spec version。
- Provider/Deployment/Route/Task/Attempt 分层保持清晰。
- schema v5/v6/v7/v8 和 execution format v1 的 backup、迁移、失败保护通过。
- allowed clean technical failure 精确产生两个 Attempt；所有 forbidden/cancel 场景精确产生一个；possible/confirmed/unknown 必须等待确认。
- old Profile/model、no-route Session、resume、fork、terminal 和 transport fallback 无回归。
- ui:check、test、build、适用 Rust tests、browser E2E 和 spec-test gates 通过；未通过项必须标为 blocker，不得声称完成。
- 最终输出一个 consolidated QA report：完成项、修改文件、测试结果、浏览器证据、未验证平台、残余风险、Git 状态。

八、发布边界

本提示只授权本地文件修改、测试、浏览器验证和证据记录。不授权 commit、push、创建/合并 PR 或关闭 Issue。
本地验收完成后停止，展示精确 diff、branch、测试和 blocker，并请求一次独立 ship 授权。获得明确授权后才使用 ship-it。
```
