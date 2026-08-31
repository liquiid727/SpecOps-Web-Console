# Developer Skills

这里集中存放 SpecOS 项目可复用的开发人员通用 Skill。当前共 30 个，覆盖需求分析、架构设计、编码测试、QA 验收、评审交付和技术写作等场景。

> **本仓库的现行研发工作流是 GoalSpec（Agent-Native SDLC），统一入口为 `/requirement-package` skill（`.claude/skills/requirement-package/SKILL.md`）**：一个需求一个 Requirement Workspace，根目录为 `.requirements/requirements/R0NN-<slug>/`，下挂 `specs/S0N-<slug>/`，Issue 位于 child package 的 `issues/ISSUE-R0NN-S0N-NNN-<slug>.md`。稳定 ID 串联 REQ→SPEC→TEST→ISSUE。`prd` / `prd-to-spec` / `spec-to-test` / `to-issues` / `loop-it` / `feature-verify` 是这条链路的能力组件，不是旧目录的默认入口。

每个 Skill 都是独立目录，入口为 `skills/developer/<skill-name>/SKILL.md`。项目路由不会自动加载整个目录；需要使用某个 Skill 时，应在 `.agents/manifest.yaml` 对应角色中显式声明，避免所有角色共享过多上下文。

## 方向分类

`skills/developer/` 保存项目级 Skill 原文，不承担目录展示分类。面向 Catalog 的 Agent、Rule 和 Skill 方向归类由 [`packages/catalog/config/asset-directions.yaml`](../../packages/catalog/config/asset-directions.yaml) 统一维护：它通过稳定 `assetId` 映射产品、商业、前端、后端、运维和测试 / QA 六个方向。

- 实际 Rule、Skill、Agent 文件仍保留在各自的稳定位置，不复制也不移动。
- `.agents/manifest.yaml` 继续负责运行时 `tier`、`managedBy` 和角色路由；方向清单只服务于资产浏览和组合。
- 新增可展示 Agent、Rule 或 Skill 时，先创建或更新其 Catalog asset，再把 asset ID 加入一个或多个方向。

## Skill 在交付体系中的位置

Developer Skills 分为主链路 Skill、替代入口、阶段辅助 Skill 和流程执行器。主链路负责产物状态与版本关系；其他 Skill 只在某个问题出现时接入，完成任务后回到主链路。

### 主链路

```text
R0NN/prd.md + index.yaml
  -> S0N/spec.md
      ├── to-issues (implementation) -> S0N/issues/ISSUE-*.md
      └── spec-to-test -> S0N/test.md
                            -> to-issues (verification)
                            -> S0N/evidence/
  -> loop-it
  -> review.md / Completion Record
  -> feature-verify -> child acceptance.md -> root acceptance.md
  -> ship-it
```

主链路产物的存放位置由 `.specos/manifest.yaml` `artifacts` 统一声明（需求包 → `.requirements/requirements/R0NN-<slug>/`，模板 → `.requirements/templates/`），解析顺序与自定义协议见 `rules/shared/artifact-locations.md`。

主链路中的职责不可互相替代：

| Skill | 输入 | 输出 | 边界 |
| --- | --- | --- | --- |
| `prd` | 原始需求、产品目标 | `R0NN/prd.md`、`index.yaml`、根验收草稿 | 不确定实现架构，不生成 child Spec 或 Issue。 |
| `prd-to-spec` | 已接受根 PRD Workspace | `specs/S0N/spec.md` | 只定义 child 系统契约，不生成 Test Design。 |
| `spec-to-test` | 已批准 child Spec | 同目录 `test.md` | 绑定精确 Spec 版本，不写执行结果。 |
| `to-issues` | Approved child Spec 或 Test Design | 同目录 `issues/ISSUE-*.md` | 实现和验证分轨，不创建根 issue 文件。 |
| `loop-it` | 已批准的本地 Issue 选择 | 代码、Completion Record、evidence、checkpoint | 实现轨只跑定向验证；验证轨负责正式证据与 Gate。 |
| `feature-verify` | 当前 child package 或完成的 root Workspace | child/root `acceptance.md` | 只根据版本当前的 Evidence、Review 和 AC 写 QA 决策；不实现或改测试。 |
| `ship-it` | 已通过评审的交付物 | Commit、PR、合并和 Issue 关闭 | 属于远端变更操作，不得绕过测试和评审关卡。 |

Child Spec Package 批准后，实现轨和验证轨可以并行准备：

```text
Approved child Spec v1.2
├── 实现轨
│   └── implementation Issues
│       ├── implementation
│       └── implementation-coupled unit tests
└── 验证轨
    └── Test Design v1.x (source: child Spec v1.2)
        ├── API contract
        ├── scenario orchestration
        ├── UI / E2E
        ├── performance / load / stress / spike / soak
        └── concurrency / security
```

测试设计、数据、Mock、API Collection、场景和 k6 模型可以与实现同步准备；依赖可部署目标的真实执行需要等待测试环境就绪。两条轨道最终在测试证据、`review-it`、`feature-verify` 和 `ship-it` 汇合。Child Spec 版本变化后，引用旧版本的 Test Design 必须标记为 `stale`。

### 替代入口

主链路不要求所有项目都从新 PRD 开始。

| 项目状态 | 接入方式 |
| --- | --- |
| 只有零散想法 | `prd -> prd-to-spec` |
| 已有 PRD，需要先讨论方案理由和取舍 | `prd -> to-design -> prd-to-spec` |
| 已有代码但没有可信 Spec | `code-to-spec -> 人工校对并批准 child Spec -> spec-to-test` |
| 已有 Approved child Spec，但缺少独立测试体系 | `spec-to-test -> verification Issues` |
| 已有 Test Design，需要实施具体测试资产 | `to-issues -> 对应测试执行角色` |

`code-to-spec` 产生的是对当前系统行为的观察结果。代码与产品意图冲突时，需要先处理差异并批准 child Spec 基线，不能直接把当前代码当成测试期望。

### 阶段辅助 Skill

辅助 Skill 不增加新的强制交付阶段。它们处理主链路中出现的具体问题，并把结论返回当前产物或 Issue。

| 接入位置 | 问题 | 推荐 Skill | 返回主链路的结果 |
| --- | --- | --- | --- |
| PRD 前后 | 技术、标准或产品事实不确定 | `research` | 有来源的调研结论和约束。 |
| PRD 或方案评审 | 假设、失败路径和边界没有暴露 | `grilling`、`grill-me`、`grill-with-docs` | 待确认问题、领域词汇或 ADR。 |
| 方案选择 | 关键交互、状态模型或技术可行性未知 | `prototype` | 一次性实验结论，不直接进入生产。 |
| PRD 到 Spec | 需要解释方案理由、替代方案和兼容性 | `to-design` | 设计提案，供 child Spec 采用。 |
| Child Spec | 领域术语、规则或边界不稳定 | `domain-modeling` | 统一语言、边界和决策记录。 |
| Child Spec 或实现 | 模块接口、接缝和抽象边界不清 | `codebase-design`、`design-an-interface` | 模块或接口设计选择。 |
| 架构规划 | 需要发现浅模块、复杂度或架构问题 | `improve-codebase-architecture`、`smell` | 可评审的架构改进建议。 |
| 理解系统 | 需要把代码关系转换成图 | `insight-diagram`、`architecture-diagram` | `docs/` 下的 UML、流程图或架构图。 |
| 实现 Issue | 新功能适合测试先行 | `tdd` | 实现代码和实现耦合单元测试。 |
| 实现 Issue | 出现故障、性能回退或不稳定测试 | `diagnosing-bugs` | 根因、证据和修复边界。 |
| 实现 Issue | 外部行为不变但内部结构需要改善 | `refactor` | 可验证的结构调整。 |
| 编码与评审 | 需要限制过度设计和无关修改 | `karpathy-guidelines` | 更小、假设明确、可验证的变更。 |
| 实现与评审后 | 需要形成面向团队的技术说明 | `technical-writing` | 克制、证据充分的内部技术文档。 |

辅助 Skill 的标准调用方式是：

```text
主链路产物或 Issue
  -> 识别当前阻塞问题
  -> 加载一个职责匹配的辅助 Skill
  -> 生成结论、设计、代码或证据
  -> 更新原产物或 Issue
  -> 回到主链路
```

不要因为某个 Skill 可用，就把它固定加入每次交付。例如，接口没有多种有效设计时不需要 `design-an-interface`；行为与架构都明确时不需要先做 `prototype`；没有可观察故障时不应调用 `diagnosing-bugs`。

### 流程执行器

`loop-it` 用于 child Spec、Test Design 和 Issues 已稳定之后的批量推进：

```text
R0NN/S0N implementation / verification Issues
  -> loop-it
      ├── 按依赖顺序执行
      ├── 检查 Test Design 版本和独立验证证据
      ├── review-it
      ├── 更新 Issue Completion Record
      ├── feature-verify
      └── ship-it
```

`loop-it` 不生成 PRD、Spec 或 Test Design，也不能绕过批准、测试和评审。需求仍在变化时，应先返回 `prd` 或 `prd-to-spec`；QA 决策必须由 `feature-verify` 写入 child/root `acceptance.md`。

执行 implementation Issue 时，`loop-it` 只运行 Issue `Validation` 中声明的
变更范围命令，并在完成后标记为 `implemented_pending_verification`。`test.md`
的完整场景、归一化 evidence 与 release Gate 由 verification Issue 和 QA 轨道
负责；它们不会因为实现 Issue 已完成而被跳过。

### 按角色加载

`skills/developer/` 是能力库，`.agents/manifest.yaml` 是加载入口。角色只加载职责需要的 Skill：

| 角色 | 典型 Skill |
| --- | --- |
| `spec-editor` | `prd`、`prd-to-spec`、`spec-to-test`、`to-issues`、`code-to-spec` |
| `architecture-agent` | `domain-modeling`、`codebase-design`、`design-an-interface` |
| `implementation-agent` | `karpathy-guidelines`、`diagnosing-bugs`、`tdd`、`refactor` |
| `testing-agent` / `test-editor` | `spec-to-test` |
| `reviewer` | `review-it`、`smell` |
| `qa-agent` | `feature-verify`、`review-it` |
| `deployment-agent` | `review-it`、`ship-it` |
| `execution-editor` | `loop-it` |

显式绑定可以避免一个角色同时承担需求、架构、实现、测试和发布职责，也能减少无关 Skill 占用上下文。新增 Skill 时，先判断它属于主链路、替代入口、阶段辅助还是流程执行器，再决定应该绑定到哪些角色。

## 需求、规格与交付

| Skill | 主要作用 | 适用场景 |
| --- | --- | --- |
| [`prd`](./prd/SKILL.md) | 将想法整理为产品需求文档，明确目标、用户、范围和验收条件。 | 新功能立项、需求分析、把零散想法变成可评审 PRD。 |
| [`to-design`](./to-design/SKILL.md) | 从 PRD 生成强调方案理由、替代方案和取舍的设计提案。 | 团队需要先对技术方向达成共识，尚不需要精确实现契约。 |
| [`prd-to-spec`](./prd-to-spec/SKILL.md) | 将 PRD 转换为一个或多个模块化、可版本化的 child Spec Package。 | 需求已确认，需要判断单 Spec 或多 Spec，并形成稳定实现契约。 |
| [`spec-to-test`](./spec-to-test/SKILL.md) | 从 Approved child Spec 生成独立、版本绑定的 Test Design。 | 接口、场景和性能契约已经审查通过，需要准备独立测试体系或为旧项目补测。 |
| [`code-to-spec`](./code-to-spec/SKILL.md) | 从代码、配置和测试反向提取完整 SPEC。 | 接手遗留项目、补齐规格、理解一个缺少文档的现有系统。 |
| [`to-issues`](./to-issues/SKILL.md) | 将 Approved child Spec 或 Test Design 拆成相互隔离的实现或验证 Issue。 | 规格已确认，需要分别进入实现轨道或独立测试轨道。 |
| [`loop-it`](./loop-it/SKILL.md) | 按依赖顺序循环实现 Issue，并串联评审、记录、提交和恢复检查点。 | Issue 体系已经稳定，希望自动推进一批任务；不适合需求仍频繁变化时使用。 |
| [`feature-verify`](./feature-verify/SKILL.md) | 汇总当前 Issue、Evidence、Review 和 AC，写入 child/root QA 验收决策。 | 实现和验证已完成，需要判断一个 Spec 或整个需求能否接受、豁免或阻断。 |
| [`review-it`](./review-it/SKILL.md) | 检查工作区改动、分支差异和测试结果，完成代码评审收口。 | 功能实现结束、提交或合并前，需要发现回归风险和遗漏。 |
| [`ship-it`](./ship-it/SKILL.md) | 通过 GitHub CLI 完成提交、推送、创建或合并 PR、关闭 Issue。 | 代码和验证均已完成，准备正式交付；属于会改变远端状态的操作。 |
| [`handoff`](./handoff/SKILL.md) | 将当前对话和工作状态压缩为下一位 Agent 可接手的交接文档。 | 会话即将结束、任务跨人或跨 Agent 转交、需要保留关键上下文。 |

## 架构、领域与方案设计

| Skill | 主要作用 | 适用场景 |
| --- | --- | --- |
| [`domain-modeling`](./domain-modeling/SKILL.md) | 建立统一领域语言，识别领域边界，并记录 ADR。 | 业务术语混乱、模块边界不清、多人对同一概念理解不一致。 |
| [`codebase-design`](./codebase-design/SKILL.md) | 提供深模块、接口、接缝和适配器等模块设计方法。 | 设计新模块接口、判断抽象边界、提升代码的可测试性和 Agent 可导航性。 |
| [`design-an-interface`](./design-an-interface/SKILL.md) | 并行生成多套差异明显的接口设计并比较取舍。 | API 或模块接口有多种可能，需要避免过早锁定第一种方案。 |
| [`improve-codebase-architecture`](./improve-codebase-architecture/SKILL.md) | 扫描代码库中的浅模块和架构摩擦，输出可视化改进机会。 | 准备架构重构、寻找高收益模块深化点、规划长期演进工作。 |
| [`prototype`](./prototype/SKILL.md) | 构建一次性原型来验证状态模型、交互或技术假设。 | 方案存在关键未知项，希望用低成本实验代替长时间争论。 |
| [`smell`](./smell/SKILL.md) | 检测架构坏味道、反模式和复杂度热点。 | 重构前体检、技术债盘点、性能或维护成本持续上升。 |
| [`research`](./research/SKILL.md) | 基于高可信一手资料调研问题，并把结论保存为仓库 Markdown。 | 需要核实技术选型、API 能力、标准或框架行为，且结论需要可追溯。 |
| [`architecture-diagram`](./architecture-diagram/SKILL.md) | 生成自包含的深色 HTML 和 SVG 架构图。 | 展示系统、基础设施、云、安全或网络拓扑。 |
| [`insight-diagram`](./insight-diagram/SKILL.md) | 分析项目后生成 UML、架构图或流程图，并保存到 `docs/`。 | 希望从现有代码库自动提炼适合文档或汇报的结构图。 |

## 编码、调试与质量保障

| Skill | 主要作用 | 适用场景 |
| --- | --- | --- |
| [`diagnosing-bugs`](./diagnosing-bugs/SKILL.md) | 用系统化诊断循环定位复杂 Bug 和性能回退的根因。 | 报错、行为异常、测试不稳定、响应变慢；只要求诊断时不要直接改代码。 |
| [`tdd`](./tdd/SKILL.md) | 按红灯、绿灯、重构的方式测试先行实现。 | 新功能、缺陷修复、关键业务规则或集成行为需要可靠回归保护。 |
| [`refactor`](./refactor/SKILL.md) | 依据 Fowler 重构目录改善结构，同时保持外部行为不变。 | 长函数、重复代码、复杂条件、职责错位等维护性问题。 |
| [`karpathy-guidelines`](./karpathy-guidelines/SKILL.md) | 约束 Agent 做小而明确、可验证的代码修改。 | 编写、评审或重构代码时，防止过度设计、隐含假设和无关改动。 |

## 决策澄清与协作

| Skill | 主要作用 | 适用场景 |
| --- | --- | --- |
| [`grilling`](./grilling/SKILL.md) | 通过连续追问压力测试计划、决策或想法。 | 方案看似完整但风险、边界、假设和失败路径还没有被充分暴露。 |
| [`grill-me`](./grill-me/SKILL.md) | 快速进入 `grilling` 访谈流程。 | 用户明确希望被追问或挑战，但暂时不要求同步生成文档。 |
| [`grill-with-docs`](./grill-with-docs/SKILL.md) | 在压力测试方案的同时维护领域词汇和 ADR。 | 架构讨论既需要澄清决策，也需要把共识沉淀进仓库。 |
| [`setup-matt-pocock-skills`](./setup-matt-pocock-skills/SKILL.md) | 初始化一组工程 Skill 所需的 Issue、标签和领域文档约定。 | 首次采用 `grilling`、`domain-modeling`、`codebase-design` 等配套工作流。 |

## 技术写作

| Skill | 主要作用 | 适用场景 |
| --- | --- | --- |
| [`technical-writing`](./technical-writing/SKILL.md) | 起草或改写克制、证据充分的中文技术文档。 | 内部设计文档、架构说明、评审意见、面向同事或管理者的技术分享。 |

## 维护约定

- 以各 Skill 的 `SKILL.md` 为功能和触发条件的事实来源；本索引只提供快速选型说明。
- 新增、删除或重命名 Skill 时，同步更新本 README 和上级 [`skills/README.md`](../README.md)。
- 导入外部 Skill 时，移除 Codex 不支持的 frontmatter 字段，并运行 `quick_validate.py`。
- 不复制 `~/.codex/skills/.system/`；系统 Skill 由 Codex 自身维护。
- 不要默认把全部 Skill 加入所有角色。按照 `.agents/manifest.yaml` 的角色职责按需加载。
