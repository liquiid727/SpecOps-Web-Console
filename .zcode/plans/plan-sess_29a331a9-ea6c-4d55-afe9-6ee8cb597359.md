## 目标

把 `spec-to-test` 从“Skill 内嵌一段 Markdown 结构”提升为 GoalSpec 中的正式验证设计阶段：approved Feature Spec 之后生成独立、可审批、可版本绑定的 `.features/<SPEC-ID>-<slug>/test-spec.md`，再由下游 test-plan、schedule、执行资产和 gate evidence 消费。新增的测试设计需要覆盖用户列出的测试内容，但保持 tool-agnostic；Bruno、Playwright、k6、Go test、Schemathesis、OWASP ZAP 等只作为后续执行 adapter。

实现时继续遵守：不恢复 `spec-draft/` 或根 `specs/`，不写入旧路径；不覆盖任务开始时已有的 `cli-gui/client/app/App.tsx`、`cli-gui/client/main.test.tsx` 修改；不伪造测试通过；不写入 secrets、token、生成缓存或本机路径。

## 实施步骤

### 1. 重写 `spec-to-test` Skill

修改 `skills/developer/spec-to-test/SKILL.md`，保留当前独立验证、approved hard gate、版本/哈希/stale 规则和实现轨/验证轨隔离，但重组为可执行的生成协议：

- 明确产物身份：Feature Spec、Test Spec、test-plan、test-schedule、result、gate report 的职责边界和输入输出关系。
- 增加源基线检查：`spec_id`、`spec_version`、source status、approval evidence、source hash/immutable revision、公共 API/event/state/error/acceptance/performance contract；缺少阻塞契约时停止生成 release-eligible Test Spec。
- 区分六个概念，避免把它们混成“测试类型”：
  - test intent：要验证的质量风险或业务行为。
  - test level：L0 Unit、L1 Component、L2 API、L3 Integration、L4 E2E、L5 Performance、L6 Chaos。
  - test type/profile：functional、api-contract、scenario、integration、ui-e2e、performance、load、stress、spike、soak、concurrency/reliability、security、data/migration、compatibility、observability、regression。
  - execution adapter：工具和命令。
  - evidence type：raw-report、trace、log、screenshot、video、gate-report 等。
  - gate impact：blocking、warning、informational。
- 增加基于需求信号和风险的测试选择决策表：不是每个 Feature 都强制做压测、Chaos、迁移或浏览器矩阵；但每个适用风险必须显式 required、not-applicable（含原因）或 deferred（含 owner/依赖）。P0/P1 的 blocking gap 必须阻断 release/merge readiness。
- 增加测试金字塔和最小覆盖规则：Unit/Component/API/Integration/E2E 的层级关系；后端 API、前端 UI、全栈流程、数据迁移、Agent workflow 等 quality profile 的默认基线；保留现有 happy/error/edge/limit/flow 分支要求。
- 增加完整质量与风险模型：`availability`、API latency p95/p99、throughput/error rate、security、reliability/retry、data integrity、observability 等可度量目标；风险项包含 likelihood、impact、risk tier、mitigation、required evidence、gate impact。
- 增加专门的 API Contract Test 设计：request/response schema、status code、authn/authz、error code、idempotency、retry、compatibility、OpenAPI contract source 和 negative cases。
- 增加 Functional/BDD 场景协议：Given/When/Then、业务前置条件、动作、预期状态、分支、补偿/恢复、清理和 acceptance criterion 映射。
- 增加 Integration、E2E 和浏览器/客户端矩阵：服务依赖、数据边界、空/加载/成功/失败状态、浏览器/OS/viewport/accessibility/visual regression 的按风险启用规则。
- 增加性能与业务负载模型：用业务事务、actor profile、arrival pattern、阶段、数据分布、依赖模式描述 workload，不只写 RPS/VUs；提供 k6 设计示例和 threshold 规则，覆盖 expected-load、load、stress、spike、soak、capacity、baseline/regression。
- 增加 Security、Data/Migration、Compatibility、Observability、Reliability/Concurrency、Regression 章节：包含认证授权、滥用/资源消耗、PII/secrets、双写/回填/向前向后兼容、trace/log/metric、重试/幂等/顺序/最终状态、PR/merge/release 回归集合。
- 增加结构化 Test Data Specification 和 Test Environment Specification：schema、fixture version、seed/cleanup、隔离、脱敏、依赖 live/stubbed/mocked、浏览器/设备/服务/数据库/消息系统、环境差异和可复现性。
- 增加 Automation Plan：每个 test intent 对应 level/type/owner/adapter/asset path/evidence；工具选择说明和“不因工具可用而增加测试”的约束。
- 增加分阶段 CI/CD gates：PR fast、merge/change verification、release、promote/rollback，明确 required test types、阈值、blocking、证据和 waiver 规则。
- 增加 Acceptance Criteria 与 Definition of Done 的逐项绑定；增加 Open Gaps/Waivers 的 owner、reason、expiry、approval 和 gate impact。
- 让生成内容使用现有 `SpecosTestPlan` 可消费的稳定语义：API → endpoints，业务流程 → flows/scenarios，分支 → BranchType，SLO → performanceTargets，并明确 load/stress/spike/soak/data 等不能被伪装成现有枚举；需要由执行 adapter 或扩展 schema 表达时要保留原始 profile。
- 增加 3 个 skill evaluation prompt/检查标准（普通登录、k6 高并发业务负载、包含安全/迁移/兼容/可观测性的 SaaS API），验证生成结果是否包含适用性判断、覆盖矩阵、可度量门禁和无实现细节泄漏。

### 2. 新增 canonical reusable Test Spec 模板

新增：

- `assets/templates/specs/template-test-spec/asset.json`
- `assets/templates/specs/template-test-spec/test-spec.md`

模板采用目录资产的既有 `asset.json` 约定，依赖 `template-feature-spec`，并将 `skill-spec-to-test` 作为关联 skill/依赖说明。模板内容固定但允许按风险填充，至少包含：

1. Meta / source binding / status / approval evidence
2. Test Overview
3. Test Objective
4. Quality Requirements
5. Test Scope / Out of Scope
6. Risk Assessment
7. Test Strategy / Test Pyramid / L0-L6
8. Functional Test / BDD Scenarios
9. API Contract Test
10. Integration Test
11. E2E / UI / Compatibility Test
12. Performance Test / Business Load Model / k6 adapter notes
13. Security Test
14. Data Test / Migration Test
15. Reliability / Concurrency / Chaos Test
16. Observability Test
17. Test Scenario Matrix
18. Test Data Specification
19. Test Environment Specification
20. Automation Plan / Tool Selection
21. CI/CD Gate
22. Regression Plan
23. Acceptance Criteria
24. Evidence and Release Decision
25. Open Gaps and Waivers
26. Definition of Done

每个不适用章节保留 `not-applicable`、原因和评估人字段，避免通过删除章节隐藏风险评估。模板只描述验证意图、契约、阈值和证据，不把具体工具命令当作 Test Spec 的 source of truth。

### 3. 注册 Catalog 并同步项目模板

- 在 `packages/catalog/config/catalog-assets.json` 注册 `template-test-spec`，补充 testing/verification/contract/scenario/performance/data/security 等 tags，依赖 Feature Spec 模板，并更新相关 preset bundle（如适用）。
- 更新 Catalog/UI 测试，验证资产可加载、sourcePath/files/contentFiles、依赖关系和导出目标。
- 将 canonical 模板同步为 feature-local 示例：
  - `packages/templates/fullstack/.features/_template/feature/test-spec.example.md`
  - `packages/templates/spec-only/.features/_template/feature/test-spec.example.md`
  - `packages/cli/templates/fullstack/.features/_template/feature/test-spec.example.md`
  - `packages/cli/templates/spec-only/.features/_template/feature/test-spec.example.md`
- 更新四套 Feature Template README，明确 bundle 包含 `spec.md`、`test-spec.md`、task plan、model、API/Bruno、changelog，并说明 downstream copies 不得独立演进。
- 保留 `cli-gui/doc/mvp01/spec/test-spec.md` 为项目级示例，不把它注册为 canonical reusable asset，也不覆盖它。

### 4. 对齐 GoalSpec/test 文档与 schema

更新：

- `tests/README.md`
- `tests/plans/README.md`
- `tests/plans/test-plan.schema.md`
- `tests/schedules/README.md`
- `packages/templates/*/tests/...` 的对应副本
- `packages/cli/templates/*/tests/...` 的对应副本
- `docs/spec-modes/GoalSpec/README.md`
- 必要时更新 `skills/developer/README.md`

文档统一为：approved Feature Spec → independent approved Feature-local Test Spec → test-plan/schedule → execution/result/gate。消除当前“文档要求 testSpecVersion，但运行时模型没有它”的不一致，并明确测试计划、schedule、result 不替代 Test Spec。

### 5. 补齐下游 artifact 的 Test Spec binding

在不改变旧 artifact 路径的前提下，扩展 Core 的验证契约，使独立 Test Spec 真正能够被下游识别：

- 为 `SpecosTestPlan` 增加 production-required 的 Test Spec 绑定字段，至少包括 `testSpecVersion`、`testSpecPath`，并按需要保留 `testSpecHash`/source hash；draft/preview 允许明确的非发布状态。
- 为 `SpecosTestSchedule`、`ScenarioResult`、`TestGateReport` 增加同一 Test Spec version/binding，使执行结果和 gate report 能证明自己验证的是哪一个 Test Spec。
- 增加 Test Spec lifecycle/status 的独立类型，不复用 execution `status` 或 `plan.source` 表达 `draft/in-review/approved/stale/superseded`。
- 更新 validators：production plan/result/gate 需要 approved Test Spec binding；source version/hash 或 Test Spec version mismatch、stale/superseded、缺少 approval evidence 时阻断 release eligibility；preview 只能产生 draft-only/blocked evidence。
- 更新 `buildDeterministicTestPlan` 与 `buildSpecChangeTestSchedule` 的输入/输出，保留 Feature Spec → Test Spec → plan/schedule 的来源路径和版本关系；schedule 的 testing track 必须显式读取 sibling `test-spec.md`，execution track 不得读取实现私有测试笔记。
- 更新 CLI `generate-test-plan` 的生成流程：从 manifest 的 `artifacts.specsDir` 定位同一 Feature-local `test-spec.md`，校验 metadata/approval/version/hash；缺失或不合规时返回清晰、可测试的错误，而不是静默从 Feature Spec 生成 release-eligible plan。保持 manifest-resolved `.prd/.features/.issues/tests/results` 路径，不引入 fallback。
- 不强行把 `load/stress/spike/soak/data/chaos` 压缩成错误的现有 `TestType`；若当前 normalized result schema 不能表达某类 profile，增加明确的 profile/adapter mapping 或扩展枚举，并同步 validator、gate matching、schema 文档和测试。
- 保留现有实现轨/验证轨隔离规则，并让 testing task 的 inputs 包含 Test Spec；增加 performance/security/migration/compatibility/observability 等 profile 的执行任务映射，不能把所有 specialist owner 错误地折叠成 `test-editor`。

### 6. 增加回归测试与 skill 评估

补充：

- Core artifact tests：Test Spec binding、approved/preview/stale/mismatch、plan/schedule/result/gate 传递、profile 映射、测试轨隔离、缺失证据阻断。
- CLI tests：同目录 Test Spec 发现、manifest 自定义路径、缺失/未批准/版本不匹配错误、生成 plan/schedule 的 `testSpecVersion` 和输入输出。
- Catalog/Bundler/Installer tests：新模板注册、导出、安装、内容映射和四套模板同步。
- Spec Web UI tests：新资产筛选、详情、依赖和导出 bundle（只在 Catalog asset 变更时更新）。
- 使用三个 realistic Feature Spec evaluation prompt 检查 skill 生成的 Test Spec：
  - 普通登录：应覆盖 API contract、BDD、错误/锁定/会话和最小 E2E，但不无条件生成 k6/Chaos。
  - 高并发业务登录/下单：应生成业务 actor/load model、k6 scenarios、capacity/SLO、concurrency/idempotency、stress/spike/soak 的适用判断和 gates。
  - SaaS/API：应生成 security、migration、compatibility、observability、rollback/regression 和数据/环境规格。
  评估结果只记录真实生成/缺陷，不伪造执行 evidence；若项目没有现成 evaluation artifact 位置，则使用临时输入并在最终报告说明。

### 7. 验证与范围检查

按变更范围执行并如实报告：

- `npm test`（root workspaces）
- Core、CLI、Catalog、Bundler、Installer 的 build/test
- `cd spec-web-ui && npm test` 与 production build（Catalog/UI 变化时）
- 相关模板内容/manifest 检查
- `git diff --check`
- 全仓库扫描 `spec-draft|tests/specs|tasks/prd|tasks/spec|specs/roadmap|specs/changes|specs/current`，确认没有恢复旧 artifact 入口
- 检查 `git status`，确认仅包含本次变更和任务开始时已有的 `cli-gui/client/app/App.tsx`、`cli-gui/client/main.test.tsx` 修改

现有 `.features/chat-streaming-and-persistent-runtime/test-spec.md` 及其 implementation/verification evidence chain 不在本次模板/Skill 设计变更中直接伪造；在新的 hard gate 能确认该 Feature Spec 的 approval/version/hash 后，再单独生成并执行，所有未执行项标记为 `pending` 或 `blocked`。