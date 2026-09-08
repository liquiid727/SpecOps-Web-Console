# DSH Development Practices 对 SpecOS 的可吸收实践研究

Status: draft-only research

Date: 2026-09-05
Question: `czm15053/dsh-development-practices` 中哪些工作方式适合被 SpecOS / GoalSpec 吸收？

## 结论摘要

`dsh-development-practices` 最有价值的不是另一套 SDLC，而是一层“执行时工程纪律”：实施前找到真实消费方和可观察表面，实施时以风险与边界约束方案，验证时区分源码、生成物、发布物和真实入口，收尾时分开报告“跑了什么”、“没跑什么”与剩余风险。这层定位由其主 Skill 明确声明，且与 SpecOS 的 GoalSpec 交付链是互补而非替代关系。来源：[DSH `SKILL.md` 第 8–14 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L8-L14)、SpecOS [GoalSpec 标准](../spec-modes/GoalSpec/agent-native-sdlc-standard.md)。

建议吸收的重点只有四项：

1. **变更前的“消费方 + 可观察表面”探测**；
2. **按受影响表面选证据，且源码与产物分开验**；
3. **把 `Alternatives considered` 的语义映射进现有 Design / Spec / Issue Completion Record**；
4. **标准化“如实收尾”报告**。

不建议原样引入 `.agents/notes/` 或直接安装该 Skill。SpecOS 已经规定 Issue Completion Record 是唯一的实施笔记，新增 Note 树会制造第二事实源。此外，目标仓库未携带 LICENSE，GitHub API 返回 `license: null`；**不可直接 vendor 或复制其文本，必须先向作者澄清许可、归属和再分发条件**。来源：SpecOS [`to-issues`](../../skills/developer/to-issues/SKILL.md) 的 “Issue body contract”，[`loop-it`](../../skills/developer/loop-it/SKILL.md) 的 “Single-Issue loop”，以及 [GitHub repository API](https://api.github.com/repos/czm15053/dsh-development-practices)。

## 调研边界与版本

- 主要对象：[`czm15053/dsh-development-practices@53c5b236`](https://github.com/czm15053/dsh-development-practices/tree/53c5b236d944191bb804e9b162343cd23f8627c8)，提交时间 2026-08-20。
- 来源复核：[`deepseek-ai/deepseek-harness@d347e703`](https://github.com/deepseek-ai/deepseek-harness/tree/d347e703908d0406b7a7ef80e3a0e594d86b2215)，用于判断抽取内容是否有真实上游实践支撑。
- SpecOS 对照真源：[`readme.md`](../../readme.md)、[`.rules/project.md`](../../.rules/project.md)、[GoalSpec 标准](../spec-modes/GoalSpec/agent-native-sdlc-standard.md)、[`sync-handoff-gateway.md`](../../ai/workflows/sync-handoff-gateway.md)、[`production-test-standards.md`](../../rules/testing/production-test-standards.md)、[`to-issues`](../../skills/developer/to-issues/SKILL.md)、[`loop-it`](../../skills/developer/loop-it/SKILL.md)。
- 本文仅是研究笔记，不代表已批准的设计或规则变更。

## 目标仓库实际包含什么

在所检查的修订中，目标仓库只有 1 个提交、7 个跟踪文件：`README.md`、`SKILL.md` 和 5 个 `references/*.md`。没有脚本、测试、CI workflow、模板或 LICENSE，且 GitHub API 的 `license` 字段为 `null`。这意味着它是一个内容包，不是一个已提供自动门禁的工程系统；在许可澄清前也不是可直接 vendor 或复制的资产。来源：[该修订的完整文件树](https://github.com/czm15053/dsh-development-practices/tree/53c5b236d944191bb804e9b162343cd23f8627c8)、[README 中声明的包内结构](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/README.md#L27-L40)、[GitHub repository API](https://api.github.com/repos/czm15053/dsh-development-practices)。

目标仓库的核心结构是：

```text
SKILL.md                         必读的七步主流程
references/defensive-checklist   边界、异步、资源与安全自检
references/evidence-by-surface   可观察表面到证据的映射
references/review-checklist      必拦项与人工语义审查
references/prose-checklist       文档、注释、提示词和文案纪律
references/simplification-checklist
                                 以生产消费方证据驱动简化
```

这种“短主文 + 命中场景后再读参考文件”的渐进披露是值得 SpecOS Skill 沿用的包装方式。来源：[README 第 29–40 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/README.md#L29-L40)、[`SKILL.md` References](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L124-L132)。

## 它的工作方式

### 1. 它是叠加层，不接管任务状态

宿主系统继续拆任务、排计划和管理 Todo；DSH 只补充判断、工程边界和证据。执行时先探测宿主的 `AGENTS.md`、贡献指南、ADR / decision / Issue 记录，仅在没有可用决策记录时才建立最小 Note 树。来源：[`SKILL.md` 第 8–22 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L8-L22)。

### 2. 用“非平凡变更”触发完整纪律

运行时行为、UI / CLI 表现、架构或模块契约、流程门禁、测试策略、持久化 / 网络 / 配置格式的变更被归为非平凡；纯格式、无歧义重命名和错别字可标记 `not applicable`。来源：[README 触发表](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/README.md#L13-L25)。

触发后又按“局部/机械、行为变更、跨表面变更、高风险”分类，但该分类只用来决定需要什么证据，不另增工作流阶段。来源：[`SKILL.md` 第 38–40 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L38-L40)。

### 3. 实施前先建立“事实地图”

其预检不停留在读声明，而是要求找到真正的消费方，包括源码、构建、测试、生成物和线上入口；同时列出已确认事实、未验证假设、受影响表面、无关工作区改动和需要人决策的问题。来源：[`SKILL.md` 第 24–36 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L24-L36)。

### 4. 在实现级设定明确边界

主要规则包括：默认值放在显式解析 / 归一化层；可变项变成可校验配置；在最早可定位处报错；只在文件、持久化、外部 JSON、进程、Worker 和网络等不可信边界校验；注册/释放、取消/清理、错误传播成对；避免第二事实源和无证据的宽泛兼容层。来源：[`SKILL.md` 第 42–52 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L42-L52)、[`defensive-checklist.md`](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/references/defensive-checklist.md#L5-L29)。

### 5. 用有生命周期的 Note 保留决策理由

它要求每个非平凡变更新增或更新一条 Note，用 `proposed / implemented / rejected / archived` 表达生命周期，用六个封闭 class 表达类型，并强制记录 `Alternatives considered`。来源：[`SKILL.md` 第 54–62 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L54-L62)。

这一点不只是二手概括：上游 DeepSeek Harness 真实维护这个 Note 树，并通过脚本校验生命周期、六种 class、标题骨架和 `Alternatives considered`。来源：[Harness Agent Note 规范第 44–113 行](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/.agents/notes/README.md#L44-L113)、[同规范的中文版第 38–117 行](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/.agents/notes/README.zh.md#L38-L117)、[`agent-note-tree.ts` 第 11–79 行](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/scripts/agent-note-tree.ts#L11-L79)、[`verify-agent-note-format.ts` 第 21–94 行](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/scripts/verify-agent-note-format.ts#L21-L94)。

### 6. 按可观察表面选证据

该 Skill 把表面分为纯转换、包 / API、CLI / 配置、浏览器 / UI、生成输出、模型可见输出、构建 / 发布产物、持久化 / 协议、安全 / 并发 / 清理，然后为每类表面指定不同证据。其核心是“源码和产物分开验”与“走发布形态的真实入口”。来源：[`SKILL.md` 第 64–97 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L64-L97)、[`evidence-by-surface.md`](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/references/evidence-by-surface.md#L5-L29)。

上游 Harness 进一步将这些原则变成具体的 keyless snapshot、built artifact smoke 和真实入口测试政策，因此“表面导向证据”有可观察的上游实践基础。来源：[Harness `docs/testing.md` 第 26–54 行](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/docs/testing.md#L26-L54)。

### 7. 审查以语义与真实消费为中心，收尾不夸大

审查清单要求查接口两端、资源生命周期、真实消费方、抽象的必要性、权限的真实执行点、派生状态的成功提交时机、边界值和发布形态入口。最终报告要分开说明已执行检查、未执行检查、已验证行为、已知限制、剩余风险和有意未改文件。来源：[`review-checklist.md` 第 5–26 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/references/review-checklist.md#L5-L26)、[`SKILL.md` 第 99–118 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L99-L118)。

## 与 SpecOS / GoalSpec 的高层对照

| 维度 | DSH | SpecOS 现状 | 判断 |
| --- | --- | --- | --- |
| 定位 | 现有工作流上的执行纪律叠加层 | PRD → Spec → Test Design → Issue → Evidence / Review → Acceptance 的 SDLC 真源 | 互补；DSH 只应作为横切执行规则 |
| 变更触发 | 有明确的“非平凡 / 机械”分界 | `sync-handoff-gateway` 已区分语义变更和 typo / format / comment | 高度重叠；DSH 的判断表更可操作 |
| 实施前探测 | 强调真实消费方、工作区和可观察表面 | 已有真源读取顺序、工作区安全和 source binding | “消费方 + 表面”是可补强的缺口 |
| 长期决策 | 一个独立 Note 树，生命周期和 class 编码到路径 | 稳定架构决策在 `design/`，产品 / 契约在 PRD / Spec，实施决策在 Completion Record | 语义有用，新目录冲突 |
| 证据 | 精简的“表面 → 证据”对照和真实入口规则 | 已有 TEST / SPEC / ISSUE / commit / environment 绑定，P0/P1 风险和 normalized evidence | SpecOS 纵向追溯更强；DSH 的横向表面清单更直观 |
| 实施与 QA | 本地只跑相关表面，CI 自管门禁 | SpecOS 已明确 implementation Issue 只跑聚焦检查，verification / QA 管正式证据 | 几乎一致，不应再建一套状态 |
| 收尾 | 强制分开已跑、未跑、已验、风险、未动文件 | Completion Record 已有 tests / evidence / decisions / tradeoffs / deviations / questions | DSH 的报告结构可直接补全模板 |
| 自动化 | 抽取仓库本身无门禁 | SpecOS 已有 schema / evidence / release gate 脚本 | 只吸收语义，再由 SpecOS 门禁落实 |

SpecOS 的现有依据如下：

- [`.rules/project.md`](../../.rules/project.md) 已要求就近定位真源、保留实施决策和假设，并运行最聚焦的可用验证。
- [`sync-handoff-gateway.md`](../../ai/workflows/sync-handoff-gateway.md) 已有 semantic / not-applicable 分界、neighbor assets 矩阵和 skipped / waived 记录。
- [`production-test-standards.md`](../../rules/testing/production-test-standards.md) 已经根据风险级别、测试类型、owner agent 和 gate impact 组织 normalized evidence。
- [`ISSUE` 模板](../../.requirements/templates/spec-package/issues/ISSUE-R001-S01-001-example.md) 已有 `Tests Executed`、`Evidence References`、`Design Decisions`、`Tradeoffs`、`Spec Deviation` 和 `Open Questions`。
- [`loop-it`](../../skills/developer/loop-it/SKILL.md) 已要求实现与独立验证分轨，并将实施闭环和 QA acceptance 分开。

## 适合直接吸收

### A. “非平凡变更”的可执行判断表

把 DSH 的触发表吸收为 SpecOS `semantic change` 的说明，但沿用 SpecOS 现有名称和 `sync_handoff_status: not_applicable` 状态，不引入新概念。这能减少 Agent 对“meaningful change”的自由解释。

### B. 预检的五个结果字段

在现有 Issue 执行上下文中补充：

- confirmed facts；
- unverified assumptions；
- production consumers / real entry paths；
- affected observable surfaces and planned checks；
- unrelated worktree changes / human decisions required。

这些是执行输入，不是新的状态文件。

### C. “可观察表面 → 最小证据”矩阵

将 DSH 的九类表面矩阵合并到 SpecOS 现有测试标准，并保留两条约束：

- 源码通过不等于发布产物通过；
- 只有真实消费入口能证明集成或发布形态。

这不会取代 SpecOS 的 TEST / SPEC / ISSUE / commit / environment 追溯字段，而是用来帮助 Test Design 选对 evidence type。

### D. “如实收尾”报告结构

在 Completion Record 或最终 handoff 中明确区分：

- commands/checks actually executed and results；
- intentionally skipped checks and reasons；
- behavior actually verified；
- known limitations and residual risks；
- intentionally untouched files/surfaces。

这是对 SpecOS 现有“不得在无证据时声称完成”的具体化，不会引入新 artifact。

### E. Skill 的渐进披露结构

主 Skill 只放稳定决策流程，与并发、UI、文档、简化等场景相关的长清单放入 `references/` 并按需读取。这很适合 SpecOS 已有 `skill_mode: scoped_only` 的角色加载方式，但仍应通过 [`.agents/manifest.yaml`](../../.agents/manifest.yaml) 注册到明确的 owner role。

## 适合改造后吸收

### A. 吸收 Note 的语义，不吸收 Note 树

建议映射如下：

| DSH 语义 | SpecOS 安放位置 |
| --- | --- |
| 未实施的产品决策 | PRD / child Spec 的决策、假设、Open Questions |
| 稳定平台或系统决策 | 现有 `design/<platform>-design.md` 的相关章节 |
| 实施选择和权衡 | Issue Completion Record 的 `Design Decisions` / `Tradeoffs` |
| 为避免重犯而保留的否决理由 | Spec 的 rationale / review finding / design 的 rejected alternative，按影响范围选一个真源 |
| 已过时的历史 | 已完成 Requirement Workspace 和 Git 历史，不反向改写当前真源 |

`Alternatives considered` 可以成为“非平凡且存在多个可行方案”时的必填语义，但不应强制每个局部 Issue 都造一份决策文档。

### B. 将防御性规则拆成有适用条件的清单

“异步状态不等于单条消息结果”、“dispose 必须等到子资源完全停止”、“回调异常由调度器隔离”、“超时 / exit code / signal 独立报告”、“不可信输出不获得 ambient environment 或可预测路径”都有价值，但只应在并发、进程、资源、安全等对应的 Spec / Issue 中启用。上游原始规则可在 [Harness `docs/defensive-patterns.md`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/docs/defensive-patterns.md#L7-L30) 中复核。

### C. 将“同一次证据链”改造成关联性约束

DSH 要求 UI 截图 / GIF 来自同一服务、同一会话和同一 commit。这对防止拼图式证据很有用，但 SpecOS 还要支持跨层和分布式执行。更合适的改造是要求完整关联 `runId / commit / environment / service revision / session or trace ID`，而不是将“同一 session”硬编码到所有证据类型。来源：[`SKILL.md` 第 92–97 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md#L92-L97)。

### D. 保留“真实入口”原则，替换仓库专有例子

`Loader/bin/worker`、`ctx.plugin(...)` 等例子是 Harness 特定架构。SpecOS 应把它们概括为“测试正式分发或打包形态所使用的入口，而不是测试自己组装的旁路”。

### E. 按阶段解释“最小够用证据”

实施 Issue 可以只跑受影响表面的定向验证；verification Issue、CI 和 QA 仍必须满足 Test Design 及 P0/P1 gate。不能将 DSH 的“本地不用每次全量”解读成发布时可以缺少正式证据。

## 不建议吸收

### A. 不新建 `.agents/notes/` 作为并行交付真源

SpecOS 已经明确把产品、契约、实施决策、证据和验收分配到 PRD / Spec / Completion Record / evidence / acceptance。原样复制 DSH Note 树会造成决策所有权模糊、重复同步和门禁冲突。

### B. 不直接安装上游 Skill 并绕过 manifest

SpecOS 规定 [`.agents/manifest.yaml`](../../.agents/manifest.yaml) 是角色、scoped skills、上下文和输出的唯一注册表。直接把包安装到 `.agents/skills/` 会绕过这个所有权模型，也会将 Note 和 GoalSpec 的冲突带入。

### C. 不将特定项目经验当作普适契约

例如“旧脏数据一律降级而不报错”、“手写协议优先换现成包”、“所有模型可见变更都用 keyless snapshot”只在具体风险与产品契约成立时适用。安全、数据完整性或协议不可兼容时可能必须 fail closed。

### D. 不复制完整 Note archive 治理

上游 Harness 对 archived note 的三文件配对、双语同步、hash seal 和 append-only manifest 有专用门禁，这是其自身文档国际化与大型决策库的成本。在 SpecOS 还没有独立 Note 真源的前提下复制这一套会是过度治理。来源：[Harness Agent Note archive 规则](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/.agents/notes/README.md#L34-L42)、[`verify-archived-agent-notes.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/scripts/verify-archived-agent-notes.ts#L1-L114)。

## 重要风险与不确定性

1. **授权不清晰，当前不可直接 vendor / 复制**：目标仓库的 README 说“与来源仓库保持一致，见来源仓库 LICENSE”，但当前文件树没有自身 LICENSE，GitHub API 也返回 `license: null`。在整段复制文本、vendor 仓库内容或作为发布资产前，必须先与作者澄清归属、许可证传递和再分发方式。可以在不复制表达的前提下，独立实现一般工程思想。来源：[目标 README 第 125–127 行](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/README.md#L125-L127)、[GitHub repository API](https://api.github.com/repos/czm15053/dsh-development-practices)。
2. **成熟度风险**：目标仓库目前只有一次提交，没有版本 tag、测试、CI 或 schema verifier。“可安装”不等于“内容兼容性已被持续验证”。
3. **双重真源风险**：Note 与 Requirement Workspace 可能同时记录决策、权衡和验证，后续不知以哪个为准。
4. **清单货物崇拜风险**：防御性规则中有大量 Harness 架构特定经验；必须用 Spec / risk tier / changed surface 选择适用项，不应每次全量仪式执行。
5. **测试责任混淆风险**：如果只记住“本地跑相关表面”，可能错误地跳过 verification Issue 和 P0/P1 release evidence。
6. **文档税风险**：对所有非机械变更强制独立 Note，会与 SpecOS 的 Completion Record 重复，也会掩盖真正需要长期维护的设计决策。

## 建议的后续落地顺序

如果要实际增强 SpecOS，应先建立 GoalSpec Requirement Workspace，再做以下小步变更：

1. 在 `.rules/project.md` / `sync-handoff-gateway.md` 中统一 semantic change 触发表和 `not_applicable` 理由。
2. 在 Issue 模板或 `loop-it` 预检中增加 consumer / observable surface / planned check，不新建任务或笔记真源。
3. 在 `production-test-standards.md` 中增加通用 surface-to-evidence 矩阵，由 Test Design 选择适用项。
4. 完善 Issue Completion Record / Sync Handoff 的如实收尾字段，并将 `Alternatives considered` 映射到 `Design Decisions` / `Tradeoffs`。
5. 如果这些规则在多个角色中重复，再抽成一个精简的横切 Skill，以 `references/` 按需承载长清单，并通过 `.agents/manifest.yaml` 挂到实施和审查 owner。
6. 最后再为可机械验证的部分增加门禁；不要一开始复制 Harness 的整套 Note archive 和 i18n 校验系统。

## 实际核验过的源文件

### `czm15053/dsh-development-practices@53c5b236`

- [`README.md`](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/README.md)
- [`SKILL.md`](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/SKILL.md)
- [`references/defensive-checklist.md`](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/references/defensive-checklist.md)
- [`references/evidence-by-surface.md`](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/references/evidence-by-surface.md)
- [`references/prose-checklist.md`](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/references/prose-checklist.md)
- [`references/review-checklist.md`](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/references/review-checklist.md)
- [`references/simplification-checklist.md`](https://github.com/czm15053/dsh-development-practices/blob/53c5b236d944191bb804e9b162343cd23f8627c8/references/simplification-checklist.md)

### `deepseek-ai/deepseek-harness@d347e703`

- [`AGENTS.md`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/AGENTS.md)
- [`docs/defensive-patterns.md`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/docs/defensive-patterns.md)
- [`docs/testing.md`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/docs/testing.md)
- [`.agents/notes/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/.agents/notes/README.md)
- [`.agents/notes/README.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/.agents/notes/README.zh.md)
- [`.agents/skills/dsh-code-review/SKILL.md`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/.agents/skills/dsh-code-review/SKILL.md)
- [`.agents/skills/dsh-find-simplifications/SKILL.md`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/.agents/skills/dsh-find-simplifications/SKILL.md)
- [`.agents/skills/dsh-archive-agent-notes/SKILL.md`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/.agents/skills/dsh-archive-agent-notes/SKILL.md)
- [`scripts/agent-note-tree.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/scripts/agent-note-tree.ts)
- [`scripts/verify-agent-note-format.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/scripts/verify-agent-note-format.ts)
- [`scripts/verify-archived-agent-notes.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/scripts/verify-archived-agent-notes.ts)
- [`package.json`](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/package.json#L19-L101)

## 验证记录

- 通过 Git 将两个外部仓库 checkout 到上述固定 commit，逐个读取目标仓库的全部 7 个文件。
- 通过 `git ls-tree`、`git rev-list`、`git tag -l` 核验目标仓库的文件、提交和 tag 现状。
- 对上游 Harness 核验了中英文 Note 规范、校验脚本、防御性规则、测试政策和有关 npm scripts。
- 通过 GitHub repository API 确认目标仓库的 `license` 字段为 `null`；因此本文只分析机制，不 vendor 或复制其 Skill 文本。
- 对 SpecOS 核验了 GoalSpec 交付链、artifact 位置、Issue Completion Record、implementation / verification 分轨、Sync Handoff 与 production evidence gate。
- 本次只新建研究文档，未运行代码测试或构建；原因是没有修改代码、规则或生产行为。
