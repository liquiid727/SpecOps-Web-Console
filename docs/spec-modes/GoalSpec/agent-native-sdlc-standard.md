# Agent-Native SDLC 标准

## PRD Workspace
>
> 核心原则：一个需求一个 PRD Workspace；一个 PRD 可包含多个独立交付的
> Spec Package；一个 Spec Package 可包含多个独立 Issue。

## 1. 为什么采用 Workspace

PRD、Spec、测试设计、Issue、Review 与 QA 验收必须能够追溯到同一需求，
但它们不是一对一关系。以下关系是规范模型，而不是实现建议：

    PRD 1:N Spec Package
    Spec Package 1:N Issue
    Spec Package 1:N Test Case / Evidence
    PRD 1:N Acceptance Criterion

PRD 是产品行为的真相。Spec Package 是可独立设计、实现、验证与验收的
交付单元。Issue 是该交付单元内可独立完成的工作单。不要让单一根目录
spec.md、test.md 或 issues.md 同时承担多个 Spec 的状态与责任。

## 2. 规范目录

新建 Requirement Package MUST 使用以下结构：

    .requirements/
    └── requirements/
        └── R0NN-<slug>/
            ├── prd.md
            ├── index.yaml
            ├── acceptance.md
            └── specs/
                └── S01-<slug>/
                    ├── spec.md
                    ├── test.md
                    ├── review.md
                    ├── acceptance.md
                    ├── issues/
                    │   └── ISSUE-R0NN-S01-001-<slug>.md
                    └── evidence/

根目录文件的职责：

| File | Responsibility |
|---|---|
| prd.md | 产品目标、REQ、BR、INV、AC、范围与 Open Question |
| index.yaml | 子 Spec Package 的路径、状态、Owner 与覆盖关系；不复制正文 |
| acceptance.md | PRD 级 AC/UAT 汇总与最终产品验收 |

子 Spec Package 文件的职责：

| File | Responsibility |
|---|---|
| spec.md | 可执行系统契约 |
| test.md | 独立测试设计与 Exit Criteria，不写执行结论 |
| issues/*.md | 一文件一个独立工作单 |
| review.md | Spec / Code review finding 与解决状态 |
| evidence/ | 运行证据及其不可变引用 |
| acceptance.md | QA 决策、风险、豁免与晋级建议 |

release.md 是可选文件。只有可部署、高风险、迁移、性能或回滚需要独立
运行手册时才创建。

### Legacy package policy

旧的根目录四件套：

    R0NN-<slug>/
    ├── prd.md
    ├── spec.md
    ├── test.md
    └── issues.md

是历史可读证据。不得迁移、重排或当作脚手架复制。所有新建包 MUST
使用本标准的 Workspace。

## 3. 稳定 ID

| Layer | Format | Meaning |
|---|---|---|
| Requirement Workspace | R0NN | 全项目唯一的 PRD 根 |
| Product Requirement | REQ-R0NN-NNN | PRD 功能要求 |
| Business Rule | BR-R0NN-NNN | 产品业务规则 |
| Invariant | INV-R0NN-NNN | 不可破坏约束 |
| Acceptance Criterion | AC-R0NN-NNN | PRD 验收条件 |
| Spec Package | S0N | 仅 Workspace 内唯一 |
| Contract Behavior | SPEC-R0NN-S0N-NNN | 子 Spec 中的系统行为 |
| Test Case | TEST-R0NN-S0N-NNN | 子 Test 中的验证场景 |
| Issue | ISSUE-R0NN-S0N-NNN | 子 Issue 工作单 |
| Review Finding | REVIEW-R0NN-S0N-NNN | 子 Review 发现 |

进入 approved、implementing、accepted 或 done 后，ID MUST NOT 被重排或
复用。

每个 Issue MUST 有且仅有一个 primary_spec。跨 Spec 工作 MAY 在 covers
中引用其他 SPEC ID，但不改变该 Issue 的归属目录和主验收责任。

## 4. 每层增加的确定性

    PRD             产品行为与范围确定性
    Spec Package    系统契约确定性
    Test Design     可验证性确定性
    Issue           执行范围确定性
    Evidence        实际运行结果确定性
    Review          变更质量确定性
    QA Acceptance   可晋级与残余风险确定性

下层 MUST NOT 静默重定义上层。实现现实与已批准 Spec 冲突时，记录
Spec Deviation 并回到 Spec Review。

## 5. PRD

PRD MUST 包含：

- Background、Goals、Non-Goals、Actors、Scope 与业务流程；
- 具有稳定 ID 的 REQ、BR、INV、EDGE 与 AC；
- 可测试的验收标准：传统功能必须定义可观察的行为结果；含 Agent 行为的
  需求还必须定义成功指标、评测数据集或样本来源、通过阈值与人工接管条件；
- Spec Package Decomposition，每个 S0N 都列出 path、覆盖 REQ 与业务结果；
- Open Questions。阻塞问题未解决前不得自动实现为需求。

PRD 不应规定代码目录、组件命名或数据表，除非它们本身是产品、合规或
兼容性约束。

## 6. Spec Package

每个 Spec Package 是一个独立的业务交付结果，而不是代码目录映射。拆分
依据是独立业务目标、Actor、生命周期、授权边界、风险轮廓或可验收结果。

spec.md 中每个 SPEC MUST 指向至少一个 REQ，并描述：

- Preconditions，Given / When / Then；
- Authorization、State / Transition、Data Semantics；
- Error Semantics 与 Idempotency / Concurrency；
- Side Effects 与 Observability；
- Acceptance Mapping。

当根 PRD 的 type 为 change 时，受影响的子 Spec MUST 包含 Change Delta：
Added、Modified、Removed、Unchanged Guarantees。Unchanged Guarantees 是
可测试的契约，不能只是备注。

## 7. Test Design 与 Evidence

test.md 是设计，不是结果表。它 MUST 覆盖适用的 Happy Path、Negative、
Authorization、State Transition、Invariant、Retry/Duplicate、并发、
External Failure、Audit/Observability 与 QA Exploratory Cases。

每个 P0/P1 REQ MUST 有一个或多个 TEST 映射。test.md 的 Coverage Matrix
使用 Planned Evidence，而不是最终 PASS/FAIL。

执行结果、截图、trace、报告、性能数据和 flaky 分类 MUST 写入或引用到
同一子 Spec Package 的 evidence/。每份证据 SHOULD 标明关联 TEST、SPEC、
ISSUE、提交版本、环境、时间与结果。QA 只有在 acceptance.md 明确引用
证据后才能将其作为 Gate Evidence。

## 8. 质量交付管线

质量活动贯穿需求、开发、交付和运行阶段；每一阶段的结果都必须能回链到
PRD、Spec、TEST、Issue 与 evidence/。

| 阶段 | 必要活动 | 门禁或产物 |
|---|---|---|
| 需求 | 定义功能 AC；适用时定义 Agent 成功指标、Eval 数据与阈值 | PRD / Spec Ready |
| 开发 | 代码与关联单元测试同步变更；AI 可生成用例草稿 | 经人工审核的测试与 Issue 验证记录 |
| PR | Unit、关键路径，以及 Agent 烟雾 Eval | PR Gate |
| Merge 后 / 夜间 | 全量回归、全量 Agent Eval、契约检查与性能基线比较 | 可追溯的运行与 Gate Evidence |
| 预发 / 灰度 | 金丝雀发布、在线采样评估、Agent 轨迹监控与告警 | Promotion Evidence |
| 生产 | Trace、指标、日志、降级与人工接管；故障复盘回灌 | 运行记录、复盘与新增 Dataset / 用例 |

PR Gate MUST 包含变更关联的 Unit 与关键路径检查。对
`qualityProfile: agent-workflow` 或 Spec 明确包含 Agent 行为的变更，PR Gate
还 MUST 运行 20–50 条、由 Test Design 指定的数据集或样本上的 Agent 烟雾
Eval。Merge 后或夜间流水线 MUST 运行适用的全量回归、全量 Agent Eval、契约
检查和性能基线比较。

预发或灰度阶段，Agent 工作流 MUST 记录在线采样评估结果和轨迹异常告警。
生产运行 MUST 提供 Trace、指标与日志；对于会造成安全、成本或业务风险的
Agent 行为，Spec MUST 定义自动降级和人工接管的触发阈值。事故或异常复盘
必须把可复现的失败样本回灌到受控 Dataset 和测试用例，并在 evidence/ 中
引用复盘或变更记录。

AI 可以生成测试用例草稿并对失败进行自动归因，但人工必须审核用例的覆盖、
断言和风险等级。自动分析不得修改已记录的证据、掩盖失败，或单独改变 Gate
和 QA 的结论。

## 9. Issue

一个 Issue MUST：

- 位于其主 Spec Package 的 issues/ 中，且一文件一 Issue；
- 声明 primary_spec、covers、Goal、Must / Must Not、Tasks、Validation 与
  Dependencies；
- 可独立开发、验证和关闭；
- 在 Completion Record 中记录变更文件、测试、证据和 Spec Deviation。

Issue Done 的必要条件：

    Code Complete
    AND Related Tests Pass
    AND Evidence Recorded
    AND No Unexplained Spec Deviation

Issue Done 不等于 Spec Package Accepted，也不等于 Requirement Done。

## 10. Review 与 QA Acceptance

review.md 每条 finding MUST 记录 ID、Severity、Status、Source、Covers、
Owner、Evidence 与 Resolution。未解决的阻塞 finding 阻止 QA 通过。

子 Spec Package acceptance.md 是 QA 的唯一决策记录，decision 必须是：

    accepted
    blocked
    accepted-with-waiver

它 MUST 记录 Evidence Manifest、Blocking Gaps、Review Status、Residual Risk、
Waiver owner/expiry 与 Promotion Recommendation。

子 Spec Package Accepted 的必要条件：

    All Required Issues Done
    AND Test Exit Criteria Supported By Evidence
    AND Review Blockers Resolved Or Waived
    AND Actual Behavior == Spec
    AND Mapped AC Verified

根 acceptance.md 只在所有 required 子 Spec Package 已 accepted 或存在
人工批准的 waiver 后，才可产生 Requirement 级决策。Requirement Done 的
必要条件：

    All Required Spec Packages Accepted
    AND PRD Acceptance Criteria Verified
    AND No Blocking Open Question
    AND Product/UAT Decision Accepted

## 11. 8-mode workflow

| Mode | Input | Output | Gate |
|---|---|---|---|
| prd-author | 需求与产品上下文 | prd.md | PRD draft |
| prd-review | prd.md | PASS / WARN / BLOCK | PRD Ready |
| spec-generate | approved PRD 与代码上下文 | specs/S0N/spec.md | Spec draft |
| spec-review | child spec.md | PASS / WARN / BLOCK | Spec Ready |
| spec-test-generate | approved child Spec | child test.md | Test Ready |
| issue-generate | approved child Spec/Test | child issues/ISSUE-*.md | Issue Ready |
| issue-execute | one Issue 与其 parent artifacts | code, evidence, completion record | Issue Done |
| feature-verify | one child package, then root aggregation | child/root acceptance.md | Spec Accepted / Requirement Done |

feature-verify MUST 先完成子 Spec Package 的 Review、Evidence 和 QA Acceptance，
再聚合根 PRD 的 AC/UAT；不得在 Issue 中写最终 QA 决策。

## 12. Source Priority

信息冲突时按以下顺序处理：

    Approved latest PRD / Change Requirement
    ↓
    Approved child Spec
    ↓
    Architecture / ADR
    ↓
    Actual Code
    ↓
    Existing Tests

代码和测试可能过期。Agent MUST NOT 为匹配当前实现而静默改写产品意图。

## 13. 禁止事项

Agent / Developer MUST NOT：

1. 未读 PRD 即创建子 Spec。
2. 未读 parent Spec/Test 即执行 Issue。
3. 用一个根 issues.md 汇总并替代独立 Issue 文件。
4. 把测试设计中的计划状态当作执行证据。
5. 把 Issue Done 误报为 QA 通过或 Requirement Done。
6. 以弱化测试、静默改 Spec 或无关重构的方式让 Issue 关闭。
7. 自动把 Open Question 解释为已批准需求。
8. 在 change 中重写未受影响的既有行为。
9. 以未归一化、未引用的原始输出作为 QA Gate Evidence。

## 14. Agent load order

执行一个新 Issue 前，按顺序读取：

1. README.md、rules/、docs/spec-modes/ 与相关 design/；
2. 根 prd.md 和 index.yaml；
3. 选定 specs/S0N-<slug>/spec.md；
4. 同目录 test.md；
5. 当前 issues/ISSUE-*.md；
6. 当前阶段需要的 review.md、evidence/ 与 acceptance.md；
7. 真实代码库、Wiki、MCP、LSP 和已有测试。

所有新工作都遵循上述 GoalSpec 读取顺序。
