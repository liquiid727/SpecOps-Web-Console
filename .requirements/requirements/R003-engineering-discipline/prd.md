---
id: R003
title: Cross-Surface Engineering Discipline
type: change
version: 1.0.0
status: accepted
priority: P1
owner: pola
created_at: 2026-09-05
updated_at: 2026-09-06
affects:
  - .rules/project.md
  - rules/shared/
  - docs/spec-modes/GoalSpec/
  - .requirements/templates/
  - assets/templates/specs/
  - skills/developer/loop-it/
  - skills/developer/review-it/
  - skills/developer/ship-it/
  - ai/workflows/sync-handoff-gateway.md
  - scripts/checks/
---

# PRD — R003 Cross-Surface Engineering Discipline

## 1. Summary

SpecOS 已经通过 GoalSpec 建立了从 PRD、Spec、Test Design、Issue 到
Evidence、Review 和 Acceptance 的纵向追溯链，但在执行入口处还缺少统一的
横向工程纪律：Agent 不一定明确说明变更是否具有语义影响、真实消费方是谁、
影响了哪些可观察表面，以及每个表面应使用什么证据验证。

本变更将调研确认的 DSH 实践以 SpecOS 原生语义吸收到现有规则、模板、skills
和机械门禁中。它不引入第二套工作流、Note 树或 GoalSpec 模式，也不直接复制
第三方文本。稳定的平台或系统设计仍可按需使用 `design/`，但本需求不要求新增
设计文档。

研究依据：
[DSH Development Practices 对 SpecOS 的可吸收实践研究](../../../docs/research/dsh-development-practices-adoption-research.md)。

## 2. Background

### Current Situation

- GoalSpec 已定义稳定 ID、版本绑定、实施与独立验证分轨、规范化证据及 QA Gate。
- `.rules/project.md` 已要求查找最近真源、保护无关改动并运行最聚焦的验证。
- `sync-handoff-gateway.md` 已提出 semantic change 与 `not_applicable` 的分界，
  但尚未形成统一的入口判定和机械校验。
- Issue Completion Record 已记录测试、证据、设计决定、权衡、偏差和开放问题，
  但没有统一区分已执行、未执行、已证明、剩余风险和有意未触碰的表面。
- `design/` 只用于跨需求长期有效的平台或系统级真相；普通功能和实施决定不应
  因本变更被强制迁入 `design/`。

### Problem

- `meaningful change`、`semantic change` 和机械修改之间缺少一张可执行判断表。
- Issue 执行前没有统一产出真实消费方、正式入口和受影响表面清单。
- Test Design 的纵向 ID 追溯很强，但缺少直观的“可观察表面 → 验证方法 → 证据”映射。
- 源码测试、生成物验证和真实发布产物冒烟没有被统一表达为不同证据表面。
- Agent 最终报告可能列出测试，却没有明确哪些检查未执行、究竟证明了什么，
  或哪些文件和表面被有意保留不动。
- 决策理由虽可写入 Design、Spec 和 Completion Record，但 `Alternatives considered`
  尚未形成按影响范围选择真源的统一规则。

### Why Now

GoalSpec consolidation 已完成主要 artifact、CLI、Catalog、evidence 和 Agent/skill
链路整理。此时补充执行纪律，可以在不改变主 SDLC 的情况下提高 Agent 决策、
验证和交接质量，并为 Sync Handoff 的真实门禁提供稳定输入。

## 3. Goals

### G-R003-001 统一变更入口判定

- User / business outcome: Agent 能稳定区分机械修改、行为变更、跨表面变更和高风险变更。
- Success signal: 语义或高风险样例被误判为 `not_applicable` 的数量为 0。

### G-R003-002 建立消费方与表面事实地图

- User / business outcome: 每个非机械变更在执行前说明真实消费方、正式入口、
  假设、受影响表面和计划验证。
- Success signal: Gate 样例中所有必填事实和受影响表面均可追溯到当前 Issue 或其父链。

### G-R003-003 让证据与真实表面匹配

- User / business outcome: 测试设计和执行记录能够区分源码、生成物、发布产物及真实入口。
- Success signal: 每个 blocking surface 都有对应验证方法和可定位证据，且不能用旁路测试替代真实入口声明。

### G-R003-004 标准化决策与诚实收尾

- User / business outcome: 同事和后续 Agent 能看清选择了什么、放弃了什么、实际验证了什么和仍有什么风险。
- Success signal: 所有非机械 Gate 样例均完整输出决策归属和五类 closeout 信息。

## 4. Non-Goals

- NG-R003-001: 不创建 `.agents/notes/` 或任何与 Requirement Workspace 并行的决策真源。
- NG-R003-002: 不新增“轻量 / 完整”等 GoalSpec 项目模式或 overlay。
- NG-R003-003: 不直接安装、vendor 或逐段复制许可不明确的第三方 Skill 文本。
- NG-R003-004: 不复制 DeepSeek Harness 的 Note archive、双语配对或 hash seal 系统。
- NG-R003-005: 不增加新的 Agent 角色；继续使用 `.agents/manifest.yaml` 中的注册角色。
- NG-R003-006: 本 Requirement 不包含 Test Console 或 Spec Web UI 改版。
- NG-R003-007: 不要求为本变更新建 `design/` 文档；只在现有长期设计真相实际受影响时更新它。

## 5. Actors and Scope

| Actor | Description | Allowed / forbidden boundary |
|---|---|---|
| ACT-R003-001 Product / architecture owner | 批准语义、范围和跨表面影响 | 可定义规则和真源归属；不得跳过 Test Design 或实现门禁 |
| ACT-R003-002 Implementation agent | 按批准 Issue 执行并完成聚焦验证 | 可记录实施选择；不得声明独立 QA acceptance |
| ACT-R003-003 Testing agent | 将受影响表面映射为测试和证据 | 可定义 verification evidence；不得修改产品行为来让测试通过 |
| ACT-R003-004 Reviewer / QA | 核对声明、证据、风险和 Sync Handoff | 可阻断缺失或夸大的证据；不得凭推断补造执行事实 |
| ACT-R003-005 Maintainer | 阅读和继续维护交付链 | 应能从现有 artifact 找到事实；不需要搜索并行 Note 树 |

### In Scope

- 定义统一的 semantic / non-trivial change 触发表和 `not_applicable` 理由。
- 在现有 Issue / workflow 中记录 confirmed facts、unverified assumptions、
  production consumers、real entry paths、affected surfaces、planned checks、
  unrelated worktree changes 和 human decisions required。
- 增加通用 surface-to-evidence 矩阵，并明确源码与发布产物分开验证。
- 将 `Alternatives considered` 按影响范围映射到 Design、PRD、Spec、Issue Completion
  Record 或 Review，不新增 artifact 类型。
- 统一 closeout 的已执行检查、未执行检查、已验证行为、限制与风险、有意未触碰项。
- 将可机械验证的字段接入 Sync Handoff、检查脚本和回归测试。
- 通过现有模板源和 Catalog 镜像保持生成资产一致。

### Out of Scope

- 第三方仓库内容的重新分发或许可证解释。
- 为所有技术决定强制创建平台 Design。
- 对已有 R002 历史交付记录做批量回填。
- 将所有防御性案例强制应用于每个 Issue。
- 发布、部署、远程 Git 操作或外部 Issue 变更。

## 6. User / Business Scenarios

### FLOW-R003-001 执行前确定变更表面

Actor:
- ACT-R003-002 Implementation agent

Preconditions:
- 存在批准且版本有效的 Spec、Test Design 和 Issue，或明确标记的 standalone context。

Flow:
1. Agent 读取项目规则、父链、真实代码、测试和工作区状态。
2. Agent 将变更判定为 mechanical、behavior、cross-surface 或 high-risk。
3. Agent 找到生产消费方、正式入口和受影响可观察表面。
4. Agent 为每个表面声明计划验证或带理由的 `Not applicable`。

Expected Outcome:
- 执行边界、假设、表面和验证计划在修改前可被检查。

### FLOW-R003-002 按表面执行与审查证据

Actor:
- ACT-R003-003 Testing agent
- ACT-R003-004 Reviewer / QA

Preconditions:
- FLOW-R003-001 已形成完整事实地图。

Flow:
1. Test Design 将每个相关表面映射到验证方法、真实入口和 evidence type。
2. Implementation Issue 只运行声明的聚焦验证。
3. Verification Issue 生成绑定 Spec、Issue、commit、environment 和 run 的规范化证据。
4. Reviewer / QA 拒绝旁路入口、陈旧产物、拼接证据或无证据完成声明。

Expected Outcome:
- 证据证明真实可观察行为，并能区分源码、投影和发布产物。

### FLOW-R003-003 如实完成交接

Actor:
- ACT-R003-002 Implementation agent
- ACT-R003-004 Reviewer / QA

Preconditions:
- 变更已经完成声明范围内的执行和检查。

Flow:
1. Agent 记录实际执行的命令及结果。
2. Agent 单独记录跳过的检查及原因。
3. Agent 记录证据实际证明的行为。
4. Agent 记录已知限制、剩余风险和有意未触碰的文件或表面。
5. Sync Handoff 记录已同步、豁免和待处理的邻居资产。

Expected Outcome:
- 后续人员不会把构建成功、启动成功或局部测试误读为完整验证或 QA acceptance。

## 7. Functional Requirements

### REQ-R003-001 Semantic Change Applicability

System MUST 提供统一、可执行的变更判定：`mechanical`、`behavior`、
`cross-surface`、`high-risk`。该判定只决定事实、验证和 Gate 要求，不新增 SDLC 阶段。

User Value:
- 减少 Agent 对 `meaningful change` 和 `not_applicable` 的自由解释。

Trigger:
- Agent 接收分析、规格、实施、测试、审查或交付请求时。

Observable Result:
- 每个交付记录都能定位 change profile；机械修改带有 `not_applicable` 理由。

Priority:
- Must

Agent Behavior Contract:
- Success metric(s): change profile classification accuracy；semantic/high-risk false-`not_applicable` count。
- Dataset / sampled-input source and version: `R003 engineering-discipline fixtures v1`，16 个受控样例，覆盖 mechanical、behavior、cross-surface 和 high-risk。
- Passing threshold: semantic/high-risk false-`not_applicable` 为 0；整体分类与字段选择正确率不低于 90%。
- Trajectory fields, degradation, and human handoff: 保留输入、选择的 profile、依据、受影响表面和 Gate 决定；无法确认时升级为更高风险并交给 architecture owner，而不是猜测 `not_applicable`。

### REQ-R003-002 Preflight Fact Map

System MUST 在非机械变更执行前记录 confirmed facts、unverified assumptions、
production consumers / real entry paths、affected observable surfaces and planned checks、
unrelated worktree changes，以及 human decisions required。

User Value:
- 修改基于真实消费和当前工作区，而不是只读取声明文件或推测入口。

Trigger:
- implementation、verification 或 review 工作进入实际修改或执行前。

Observable Result:
- Issue 或当前 workflow 上下文中可找到完整事实地图；无需创建独立状态文件。

Priority:
- Must

Agent Behavior Contract:
- Success metric(s): blocking fixture 的必填事实字段完整率和真实消费方识别率。
- Dataset / sampled-input source and version: `R003 engineering-discipline fixtures v1`。
- Passing threshold: 所有 semantic/high-risk blocking fixtures 的必填字段完整率为 100%；整体事实与消费方选择正确率不低于 90%。
- Trajectory fields, degradation, and human handoff: 保留读取真源、consumer/entry path、假设和无关改动；找不到真实入口或无法安全归属工作区改动时必须停止并交给人处理。

### REQ-R003-003 Surface-Oriented Evidence

System MUST 将适用的源码、package/API、CLI/config、browser/UI、generated output、
model-visible output、build/release artifact、persistence/protocol、security/concurrency/
cleanup 表面映射到验证方法、真实入口、证据类型和 Gate impact。

User Value:
- 防止用源码测试替代发布产物、用单一投影替代兄弟消费方，或用 mock/旁路入口夸大集成结论。

Trigger:
- Spec-Test 设计、verification execution、review 和 QA acceptance。

Observable Result:
- 每个受影响 blocking surface 都有验证方法和证据；源码与构建/发布产物在适用时分开声明。

Priority:
- Must

Agent Behavior Contract:
- Success metric(s): affected surface coverage、real-entry selection accuracy、unsupported evidence substitution count。
- Dataset / sampled-input source and version: `R003 engineering-discipline fixtures v1`。
- Passing threshold: blocking surface coverage 为 100%；不支持的 evidence substitution 为 0；整体验证方法选择正确率不低于 90%。
- Trajectory fields, degradation, and human handoff: 保留 surface、consumer entry、command/runner、artifact ref、commit、environment、run/session/trace correlation；缺失 blocking evidence 时保持 blocked 并交给 testing/QA owner。

### REQ-R003-004 Durable Decision Ownership

System MUST 将 `Alternatives considered` 的语义放入现有 canonical artifact：
跨需求长期决定进入 `design/`，产品/契约决定进入 PRD 或 Spec，实施选择进入 Issue
Completion Record，审查否决进入 Review。不得为此创建并行 Note 树。

User Value:
- 后续维护者能理解为何选择当前方案，又不需要判断两个决策真源哪个有效。

Trigger:
- 非机械变更存在多个真实可行方案，或一个被否决方案值得防止重犯时。

Observable Result:
- 记录能链接到唯一 canonical owner，并包含真实考虑过的备选及落选原因；不存在自动生成的虚假备选。

Priority:
- Must

Agent Behavior Contract:
- Success metric(s): decision ownership accuracy、duplicate decision artifact count、fabricated alternative count。
- Dataset / sampled-input source and version: `R003 engineering-discipline fixtures v1`。
- Passing threshold: duplicate decision artifact 和 fabricated alternative 均为 0；所有需要长期理由的样例均选择正确 owner。
- Trajectory fields, degradation, and human handoff: 保留候选 owner、已有记录搜索和最终链接；归属不清时交给 architecture owner，不得新建临时真源规避判断。

### REQ-R003-005 Honest Closeout

System MUST 在 Completion Record 或最终 handoff 中分别记录：实际执行的检查及结果、
刻意跳过的检查及原因、实际验证的行为、已知限制与剩余风险、有意未触碰的文件或表面。

User Value:
- 交付状态可被准确理解，不把局部成功误报成完整验证或可发布状态。

Trigger:
- implementation、verification、review、CI 或 ship workflow 收尾。

Observable Result:
- 五类 closeout 信息均显式存在；空项使用带理由的 `None` 或 `Not applicable`。

Priority:
- Must

Agent Behavior Contract:
- Success metric(s): closeout field completeness、unsupported completion claim count。
- Dataset / sampled-input source and version: `R003 engineering-discipline fixtures v1`。
- Passing threshold: semantic/high-risk 样例字段完整率为 100%；unsupported completion claim 为 0。
- Trajectory fields, degradation, and human handoff: 保留 executed/skipped/proved/risk/untouched 与对应证据；结果不一致或缺少证据时必须降级为 partial/blocked 并交给 reviewer 或 QA。

### REQ-R003-006 Mechanical Enforcement

System MUST 对可机械判定的 change profile、surface mapping、closeout 和 Sync Handoff
字段提供可重复检查，并以受控 fixtures 验证正例和失败例。

User Value:
- 关键纪律不只依赖 Agent 记忆或文档自觉。

Trigger:
- 本地 check、CI fast gate 或相关 workflow handoff。

Observable Result:
- 缺失 blocking 字段、非法 `not_applicable`、无关联证据或夸大 closeout 的 fixture 返回非零；合法 fixture 通过。

Priority:
- Must

Agent Behavior Contract:
- Success metric(s): fixture gate precision/recall and deterministic rerun result。
- Dataset / sampled-input source and version: `R003 engineering-discipline fixtures v1`，至少 16 个正反例。
- Passing threshold: 所有 blocking 正反例的期望 Gate 结果为 100%；同一输入重复运行结果一致。
- Trajectory fields, degradation, and human handoff: 记录 rule/version、fixture、错误码、字段路径和 Gate 决定；schema 或来源版本不一致时停止，不自动修复生产 artifact。

## 8. Business Rules, Lifecycle, and Edges

- BR-R003-001: 本变更是 GoalSpec 上的横切执行纪律，不是新的 SDLC 或项目模式。
- BR-R003-002: 同一事实只允许一个 canonical owner；其他 artifact 必须链接而不是复制。
- BR-R003-003: `not_applicable` 只能用于无语义影响的机械、格式、错别字或注释变更，并必须说明理由。
- BR-R003-004: 只有真实考虑过的替代方案才能写入 `Alternatives considered`；不得为了通过模板而编造备选。
- BR-R003-005: Implementation focused validation、independent verification、Review 和 QA acceptance 保持不同含义。
- BR-R003-006: Source、generated projection 和 build/release artifact 是可独立失败的证据表面。
- BR-R003-007: 防御性清单按 change profile 和 affected surface 选择，不得仪式性全量套用。
- BR-R003-008: 第三方材料只作为研究输入；实现使用 SpecOS 自有措辞、结构和门禁。
- INV-R003-001: System MUST NOT 创建 `.agents/notes/` 或其他并行决策真源。
- INV-R003-002: System MUST NOT 用局部测试、构建成功或进程启动推断 QA acceptance 或 release readiness。
- INV-R003-003: System MUST NOT 通过 normalizer、放宽断言、隐藏 flaky/failure 或替换真实入口来通过 Gate。
- INV-R003-004: System MUST NOT 要求普通功能或 Issue 决策进入 `design/`；只有跨需求长期真相才适用。

| ID | Case | Expected Behavior |
|---|---|---|
| EDGE-R003-001 | 只改格式、拼写或无语义注释 | profile 为 mechanical；Sync Handoff 可 `not_applicable`，但保留理由 |
| EDGE-R003-002 | 一个源变更影响多个生成投影或消费方 | 所有受影响表面单独列出并验证，不用一个通过结果覆盖其他表面 |
| EDGE-R003-003 | 高风险变更找不到真实入口或 evidence | 停止并标记 blocked，交给 owner 决策 |
| EDGE-R003-004 | 已有 artifact 已记录同一决定 | 更新或链接现有 owner，不新建重复记录 |
| EDGE-R003-005 | 多轮或分布式证据无法共享 session | 使用 runId、commit、environment、service revision、session/trace ID 建立相关性，不要求错误地合并为单一 session |
| EDGE-R003-006 | 历史 R002 artifact 缺少新字段 | 不批量回填；只对 R003 生效后的新建或明确变更 artifact 执行门禁 |
| EDGE-R003-007 | 安全或数据完整性要求 fail closed | 以批准 Spec 为准，不套用第三方材料中的通用降级建议 |

Lifecycle:
- `approved → implementing → accepted | blocked → done`；子 Spec Package 独立完成设计、验证和接受。

## 9. UX, Non-Functional Goals, and Constraints

UX / interaction:
- Not applicable — 本 Requirement 不修改用户界面；错误反馈通过 CLI/check 输出可观察。

| Area | Requirement or `Not applicable` with rationale |
|---|---|
| Performance | 检查应在常规 PR fast gate 可接受时间内完成；具体预算由 S03 基于现有 check 基线确定 |
| Reliability | 相同输入和规则版本必须产生确定性的分类与 Gate 结果 |
| Security / privacy | fixtures 和证据不得包含真实密钥、PII 或第三方私有材料 |
| Accessibility | Not applicable — 无 UI 变更 |
| Compatibility / migration | 不回填历史 artifact；新规则启用点和旧 artifact 读取行为必须在 S03 明确 |

Constraints:
- GoalSpec v2 仍是唯一 Agent-Native SDLC contract。
- artifact 位置继续由 `.specos/manifest.yaml` 与 canonical templates 决定。
- `.agents/manifest.yaml` 仍是角色、skills 和上下文的唯一注册表。
- 现有 dirty worktree 中不属于 R003 的修改必须保持不变并排除在交付范围之外。
- 不新增依赖，除非 S03 证明现有解析和检查能力不足并获得单独批准。

## 10. Acceptance Criteria

- AC-R003-001: Given mechanical、behavior、cross-surface 和 high-risk fixtures，When 执行 applicability check，Then semantic/high-risk false-`not_applicable` 为 0，整体分类正确率至少 90%。
- AC-R003-002: Given 一个 semantic implementation Issue，When 进入执行，Then 可定位 confirmed facts、assumptions、production consumers、real entry paths、affected surfaces、planned checks、unrelated changes 和 required human decisions。
- AC-R003-003: Given 一个同时影响 source 和 build/release artifact 的变更，When 生成 Test Design，Then 两个表面分别拥有验证方法、真实入口、evidence type 和 Gate impact。
- AC-R003-004: Given 一个存在多个真实可行方案的非机械变更，When 记录决定，Then `Alternatives considered` 位于唯一合适的 Design、PRD、Spec、Completion Record 或 Review 中，且没有并行 Note artifact。
- AC-R003-005: Given 一个完成或部分完成的 workflow，When 输出 closeout，Then 分别列出 executed checks、skipped checks、verified behavior、known limitations/residual risk 和 intentionally untouched files/surfaces，且无证据时不会声称完成。
- AC-R003-006: Given 合法与非法 fixtures，When 运行新的机械检查，Then 所有 blocking 正反例均得到预期退出结果，相同输入重复执行结果一致。
- AC-R003-007: Given 本 Requirement 的实现 diff，When 检查仓库结构，Then 不存在新 `.agents/notes/`、GoalSpec mode、未授权第三方副本或强制新增的 platform design。
- AC-R003-008: Given semantic changes to rules、templates、skills 或 gates，When 进入 review/ship，Then Sync Handoff 明确列出 updated、waived 和 open-risk neighbor surfaces，缺失 blocking sync evidence 时 Gate 不通过。

## 11. Spec Package Decomposition

### S01 Engineering Discipline Contract

Covers:
- REQ-R003-001
- REQ-R003-002
- REQ-R003-003
- REQ-R003-004
- REQ-R003-005
- AC-R003-001
- AC-R003-002
- AC-R003-003
- AC-R003-004
- AC-R003-005
- AC-R003-007

Business Outcome:
- SpecOS 的 canonical rules、GoalSpec 标准和模板用统一语义表达 change profile、fact map、surface evidence、decision ownership 和 honest closeout。

Dependencies:
- None

Path:
- ./specs/S01-engineering-discipline-contract/

Required:
- true

### S02 Workflow Integration

Covers:
- REQ-R003-001
- REQ-R003-002
- REQ-R003-003
- REQ-R003-004
- REQ-R003-005
- AC-R003-002
- AC-R003-003
- AC-R003-004
- AC-R003-005
- AC-R003-008

Business Outcome:
- `loop-it`、`review-it`、`ship-it` 和 Sync Handoff 在各自责任边界内执行同一套工程纪律，不创建第二状态机或真源。

Dependencies:
- S01

Path:
- ./specs/S02-workflow-integration/

Required:
- true

### S03 Enforcement and Eval

Covers:
- REQ-R003-003
- REQ-R003-005
- REQ-R003-006
- AC-R003-001
- AC-R003-003
- AC-R003-005
- AC-R003-006
- AC-R003-008

Business Outcome:
- 可重复的 fixtures、schema/check 和 Gate 让关键纪律成为可验证行为，并对错误 `not_applicable`、缺失表面和夸大 closeout 产生稳定失败。

Dependencies:
- S01
- S02

Path:
- ./specs/S03-enforcement-and-eval/

Required:
- true

## 12. Risks and Open Questions

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| 新字段增加文档负担 | Medium | Medium | 仅 semantic change 必填；mechanical 使用带理由的 N/A |
| 与现有 riskTier、intent_class 或 kind/track 概念重叠 | High | Medium | S01 明确各字段只回答一个问题并禁止重复状态机 |
| surface 矩阵被当作全量清单 | Medium | Medium | 按 profile 和真实消费方选择适用表面 |
| Gate 文档与实现再次脱节 | High | Medium | S03 提供 fixture 驱动的机械检查并绑定 CI |
| 旧 artifact 因缺少字段被误判 | High | Low | 明确启用点，不批量回填或默认为失败 |
| 第三方许可不清导致复制风险 | High | Low | 只独立实现一般思想，保留研究引用，不 vendor 文本 |
| Agent 为通过模板编造 alternatives | Medium | Medium | 没有真实备选时允许带理由 N/A，fixture 明确禁止虚构 |

| ID | Question | Blocking | Decision / Approver | Status |
|---|---|---|---|---|
| Q-R003-001 | 是否采用 16 个受控样例、semantic/high-risk false-N/A 为 0、整体正确率至少 90% 的 Eval 门槛？ | true | 用户批准于 2026-09-05 | resolved |
| Q-R003-002 | 本次是否要求新增平台 `design/` 文档？ | false | 不新增；只有现有长期设计真相实际改变时才更新 | resolved |
| Q-R003-003 | 是否直接安装或复制第三方 Skill？ | true | 不安装、不 vendor、不复制未明确许可文本 | resolved |
| Q-R003-004 | S03 的具体错误码、schema 字段和旧 artifact 启用点是什么？ | false | 由 S03 Spec 在读取现有实现后确定 | open |

## 13. PRD Ready Check

- [x] Goals, non-goals, actors, scope, REQ, BR/INV/EDGE, and AC are explicit.
- [x] Every requirement and acceptance criterion has an observable result.
- [x] S0N packages have independent business outcomes and known dependencies.
- [x] Applicable technical/product constraints are stated; inapplicable areas have a rationale.
- [x] No blocking Open Question remains.
