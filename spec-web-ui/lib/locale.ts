export const LOCALE_STORAGE_KEY = "specos-locale";
export const DEFAULT_LOCALE = "zh";

export type Locale = "zh" | "en";

export function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "zh" ? value : DEFAULT_LOCALE;
}

export function getOppositeLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

export const localeCopy = {
  zh: {
    name: "中文",
    htmlLang: "zh-CN",
    shell: {
      languageLabel: "语言",
      nav: {
        about: "关于",
        home: "主页",
        discover: "发现",
        "spec-templates": "Spec 模版",
        "skill-templates": "Skill 技能",
        "agent-templates": "Agent 模版",
        "agent-teams": "Agent Team",
        specTemplates: "Spec 模版",
        skillTemplates: "Skill 技能",
        agentTemplates: "Agent 模版",
        agentTeams: "Agent Team",
        workflowTemplates: "Workflow 模版",
        projects: "项目",
        drafts: "草稿",
        exports: "导出"
      },
      home: "首页",
      theme: "视觉系统"
    },
    home: {
      heroTitle: "把 AI 工程资产装进项目骨架。",
      heroDescription: "从规则、Skill、Agent 到模板，搜索目录，挑选可复用资产，组合出一套能直接落地的项目基线。",
      searchLabel: "搜索可复用资产",
      searchPlaceholder: "搜索规则、模板、Agent 角色...",
      openDiscover: "浏览资产",
      openProjects: "创建工作区",
      firstUseTitle: "三步开始",
      firstUsePrefix: "先 ",
      firstUseLinks: [
        {
          label: "浏览目录",
          description: " 找到适合的资产",
          href: "/discover"
        },
        {
          label: "组合工作区",
          description: " 形成项目基线",
          href: "/projects"
        },
        {
          label: "预览导出",
          description: " 确认交付内容",
          href: "/exports"
        }
      ],
      stats: {
        catalogAssets: "目录资产",
        projects: "项目",
        rules: "规则",
        agentRoles: "Agent 角色"
      },
      filtersTitle: "筛选器",
      filtersDescription: "从方向、资产类型、技术栈或标签开始搜索项目资产。",
      fields: {
        direction: "方向",
        type: "类型",
        stack: "技术栈",
        tag: "标签",
        all: "全部"
      },
      runQuery: "运行查询",
      quickTagsTitle: "快捷标签",
      quickTagsDescription: "直接进入更窄的目录切片。",
      starterTitle: "目录快照",
      starterDescription: "只展示少量代表性资产，完整筛选留到发现页。",
      openFullSearch: "查看全部",
      resourcesTitle: "资源",
      resourcesDescription: "打开主要工作区。",
      resources: {
        discover: "发现目录资产",
        projects: "查看项目工作区",
        drafts: "打开草稿工作台",
        exports: "评审导出快照"
      },
      projectShortcutsTitle: "最近项目",
      projectShortcutsDescription: "保留工作区入口，不在首页展开项目细节。",
      workflowTitle: "资产工作流",
      workflowDescription: "从目录选择开始，到项目基线交付结束。",
      workflowBodyA:
        "`spec-web-ui` 是目录优先的工作台。目录保持仓库驱动，项目把规则、模板和 Agent 角色作为可组合资产使用。",
      workflowBodyB: "产品循环刻意收窄：发现资产、组装项目、细化草稿，然后在交付前评审导出差异。",
      workflowSteps: [
        "1. discover - 搜索可复用资产",
        "2. workspace - 组装项目组合",
        "3. draft - 编写结构化 Spec",
        "4. export - 评审生成的 Bundle"
      ]
    },
    about: {
      agentFlow: {
        eyebrow: "$ cat specs/RP-002-decision-api/spec.md",
        title: "Agent 工作方式与测试边界",
        description: "从需求进入 spec-draft，到 design、roadmap 和 feature spec，执行和测试始终保持独立上下文。执行只管实现和单元测试，测试只管 test-plan、场景和真实执行。",
        stages: ["需求", "spec-draft", "design", "roadmap", "feature spec", "执行 + 测试分轨", "review / merge"],
        gate: "先确认 design 和 feature spec，再把执行与测试拆成两个互不污染的 agent track。",
        tracks: [
          {
            name: "Spec Agent",
            role: "维护 design / roadmap / spec 文档链路",
            description: "把 draft 润色为可审查的 design、roadmap 和 feature spec，记录结论与边界。",
            points: ["spec-draft -> feature spec", "design / roadmap 更新", "review handoff"]
          },
          {
            name: "Execution Agent",
            role: "实现业务代码与单元测试",
            description: "只处理实现与实现耦合的单元测试，不读取独立测试计划。",
            points: ["实现任务", "单元测试", "implementation-report"]
          },
          {
            name: "Test Agent",
            role: "编排独立验证",
            description: "负责 test-plan、场景、API、E2E、UI 以及结果归一化。",
            points: ["test-plan / test-schedule", "E2E / 场景 / API / UI", "test-result-summary"]
          }
        ]
      },
      projectModes: {
        eyebrow: "$ cat docs/spec-modes/README.md",
        title: "项目模式说明",
        description: "SpecOS 有三种正式项目 mode。about 页这里直接说明它们的类型、结构重点和实际作用，方便在进入项目之前先选对交付模型。",
        sharedLabel: "共享约束",
        sharedPoints: [
          "三种 mode 都保留 README、design 和 current 作为稳定上下文入口。",
          "三种 mode 都要求按 Spec ID 保持 feature、实现、评审和测试的可追踪关系。",
          "差异不在命名，而在交付证据的拆分粒度、角色边界和治理强度。"
        ],
        modes: [
          {
            name: "LiteSpec",
            typeLabel: "类型",
            typeValue: "Feature Driven",
            treeLabel: "目录树缩略图",
            treeCommand: "$ tree project/",
            tree: [
              { text: "project/" },
              { text: "|-- README.md", note: "入口说明" },
              { text: "|-- design/", note: "稳定设计真相" },
              { text: "|-- current/", note: "当前交付状态" },
              { text: "|-- specs/", note: "feature 就地组织" },
              { text: "|   |-- roadmap.md" },
              { text: "|   `-- RP-001-feature/" },
              { text: "|       |-- spec.md" },
              { text: "|       |-- tasks.md" },
              { text: "|       |-- tests.md", note: "feature 内验证" },
              { text: "|       |-- review.md" },
              { text: "|       `-- changelog.md" },
              { text: "`-- .agents/", note: "轻量 agent 上下文" }
            ],
            loadLabel: "加载顺序",
            loadPath: ["README", "current", "design", "specs/RP-xxx", "相关 skill"],
            loadNote: "按一条 feature 线加载，目标是让 agent 一次读完最小上下文。",
            purposeLabel: "作用",
            purposeValue: "把 feature 当成最小执行单元，优先保证 agent 上下文小、迭代快、目录容易一次读完。",
            structureLabel: "结构重点",
            structure: [
              "specs/RP-xxx/ 下把 spec、tasks、tests、review、changelog 放在同一个 feature 目录里。",
              "current/ 维护 active-feature、active-context、active-tasks 和 handoff，偏向单线推进。",
              ".agents/ 只保留少量通用 skill 文件，默认由一个工程师或一个 agent 端到端完成。"
            ],
            fitLabel: "适用场景",
            fit: [
              "MVP、个人项目、小团队日常开发。",
              "希望低 token 成本快速迭代，交付证据可以紧贴 feature 保存。",
              "平台、基础设施、内部工具这类需要频繁试错的工作。"
            ]
          },
          {
            name: "GoalSpec",
            typeLabel: "类型",
            typeValue: "Workflow Driven",
            treeLabel: "目录树缩略图",
            treeCommand: "$ tree project/",
            tree: [
              { text: "project/" },
              { text: "|-- README.md", note: "入口说明" },
              { text: "|-- design/", note: "稳定设计真相" },
              { text: "|-- current/", note: "双轨交付进度" },
              { text: "|-- docs/workflow.md", note: "版本化交付链路" },
              { text: "|-- specs/", note: "issue 索引 + feature" },
              { text: "|   |-- issues/README.md", note: "/to-issues 产出" },
              { text: "|   `-- RP-001-feature/" },
              { text: "|       |-- spec.md" },
              { text: "|       |-- tasks.md" },
              { text: "|       |-- review.md", note: "/review-it 产出" },
              { text: "|       `-- changelog.md", note: "/ship-it 产出" },
              { text: "|-- implementation/", note: "变更面记录" },
              { text: "|-- tests/specs/", note: "/spec-to-test 产出" },
              { text: "`-- .agents/", note: "轻量 agent 上下文" }
            ],
            loadLabel: "加载顺序",
            loadPath: ["README", "current", "design", "specs/issues", "specs/RP-xxx"],
            loadNote: "在 feature 加载顺序之外增加 issue 与 Test Spec 索引，定位实现轨和验证轨的当前状态。",
            purposeLabel: "作用",
            purposeValue: "先确认版本化 Feature Spec，再并行推进实现 Issue 与由 /spec-to-test 生成的独立验证 Issue，最后汇合到 review 和 ship。",
            structureLabel: "结构重点",
            structure: [
              "specs/issues/ 分开维护实现与验证 issue 的索引和依赖，每个 issue 保持小而可独立审查。",
              "review、ship 环节仍是 feature 内单文件（review.md、changelog.md），不引入 EnterpriseSpec 的多阶段 reviews/ 目录。",
              "docs/workflow.md 把 Feature Spec 版本、Test Spec 版本和双轨汇合关卡写成团队标准操作说明。"
            ],
            fitLabel: "适用场景",
            fit: [
              "已经习惯按 issue 拆解和推进的小团队。",
              "希望有明确的 review 和 ship 关卡，但还不需要 EnterpriseSpec 的分角色治理。",
              "从 LiteSpec 往 EnterpriseSpec 过渡，但暂时不需要全套交付证据体系的项目。"
            ]
          },
          {
            name: "EnterpriseSpec",
            typeLabel: "类型",
            typeValue: "Delivery Driven",
            treeLabel: "目录树缩略图",
            treeCommand: "$ tree project/",
            tree: [
              { text: "project/" },
              { text: "|-- README.md", note: "入口说明" },
              { text: "|-- design/", note: "稳定设计真相" },
              { text: "|-- current/", note: "发布与阻塞状态" },
              { text: "|-- specs/", note: "需求侧工件" },
              { text: "|   `-- RP-001-feature/" },
              { text: "|-- implementation/", note: "实施与发布记录" },
              { text: "|   `-- RP-001/" },
              { text: "|-- tests/", note: "按测试类型拆分" },
              { text: "|   |-- unit/" },
              { text: "|   |-- e2e/" },
              { text: "|   |-- performance/" },
              { text: "|   `-- security/" },
              { text: "|-- reviews/", note: "分阶段评审" },
              { text: "`-- docs/", note: "runbook / ops" }
            ],
            loadLabel: "加载顺序",
            loadPath: ["README", "current", "角色视角", "owned artifacts"],
            loadNote: "按角色切片加载，不要求 agent 一次读取 implementation、tests、reviews 和 docs 全量内容。",
            purposeLabel: "作用",
            purposeValue: "把交付证据当成最小治理单元，优先保证 QA、审计、发布和回滚链路都能被单独证明。",
            structureLabel: "结构重点",
            structure: [
              "specs/ 只保留 spec、task-plan、model、api、migration 等需求侧工件，implementation/tests/reviews 独立成目录。",
              "tests/ 按 unit、integration、e2e、performance、security、results 等测试类型拆开，适合多角色并行。",
              "reviews/、docs/runbook/、rollout/rollback 让发布治理、审计留痕和运维交接有固定落点。"
            ],
            fitLabel: "适用场景",
            fit: [
              "支付、风控、权限、安全、审计或合规要求明显的系统。",
              "需要正式 QA gate、发布记录、回滚证明和多团队协作的项目。",
              "性能、并发、安全测试必须独立建档并长期留存的交付环境。"
            ]
          }
        ],
        decisionLabel: "选择原则",
        decision:
          "默认从 LiteSpec 开始；当团队想要一条标准化的 issue 拆解 -> 实现 -> 审查 -> 交付闭环、并且需要明确的 review/ship 关卡时，升级到 GoalSpec；当 feature 已经需要独立 QA、发布治理、性能或安全证明，或者一个 feature 不再适合由单个 agent 在一条链路里完成时，再升级到 EnterpriseSpec。"
      },
      testUiDemo: {
        eyebrow: "$ open test-console/demo",
        title: "测试 UI Demo",
        description: "这里是独立测试 console 的嵌入式样式预览，用横向流程图展示 spec、测试场景、测试链条、测试标准和测试情况的追踪关系。",
        summary: [
          { label: "API 通过率", value: "83%", tone: "blue" },
          { label: "场景通过率", value: "50%", tone: "amber" },
          { label: "发布结论", value: "blocked", tone: "mint" }
        ],
        flowLabel: "测试流程图",
        columns: ["Spec", "测试场景", "测试链条", "测试标准", "测试情况"],
        columnNotes: ["输入来源", "从 spec 拆出的用户行为", "场景落到可执行路径", "判断通过/失败的规则", "真实执行后的结论"],
        flows: [
          {
            spec: "reward-order spec v1.2.0",
            scenario: "用户成功领取奖励",
            chain: "API + UI 主路径链条",
            standard: "200 / 扣减库存 / 成功提示",
            result: "通过 · trace-scenario-happy-001",
            status: "pass"
          },
          {
            spec: "reward-order spec v1.2.0",
            scenario: "用户成功领取奖励",
            chain: "结果一致性链条",
            standard: "订单 / 库存 / 权益一致",
            result: "通过 · api-pass-rate 100%",
            status: "pass"
          },
          {
            spec: "reward-order spec v1.2.0",
            scenario: "库存不足时领取失败",
            chain: "异常分支链条",
            standard: "OUT_OF_STOCK / 可恢复失败提示",
            result: "失败 · 错误码映射断言未通过",
            status: "fail"
          },
          {
            spec: "reward-order spec v1.2.0",
            scenario: "库存不足时领取失败",
            chain: "测试资产链条",
            standard: "Bruno collection / adapter 可执行",
            result: "阻塞 · 独立执行 adapter 未配置",
            status: "blocked"
          }
        ]
      }
    }
  },
  en: {
    name: "English",
    htmlLang: "en",
    shell: {
      languageLabel: "Language",
      nav: {
        about: "About",
        home: "Home",
        discover: "Discover",
        "spec-templates": "Spec templates",
        "skill-templates": "Skill skills",
        "agent-templates": "Agent templates",
        "agent-teams": "Agent teams",
        specTemplates: "Spec templates",
        skillTemplates: "Skill skills",
        agentTemplates: "Agent templates",
        agentTeams: "Agent teams",
        workflowTemplates: "Workflow templates",
        projects: "Projects",
        drafts: "Drafts",
        exports: "Exports"
      },
      home: "Home",
      theme: "Visual system"
    },
    home: {
      heroTitle: "Pack your AI engineering assets into a project baseline.",
      heroDescription:
        "Search rules, skills, agents, and templates, then assemble a reusable project baseline you can install and review.",
      searchLabel: "search reusable assets",
      searchPlaceholder: "search rules, templates, agent roles...",
      openDiscover: "Browse assets",
      openProjects: "Create workspace",
      firstUseTitle: "Three steps to start",
      firstUsePrefix: "Start by ",
      firstUseLinks: [
        {
          label: "browsing the catalog",
          description: " to find the right assets",
          href: "/discover"
        },
        {
          label: "composing a workspace",
          description: " to form your baseline",
          href: "/projects"
        },
        {
          label: "previewing the export",
          description: " before handoff",
          href: "/exports"
        }
      ],
      stats: {
        catalogAssets: "catalog assets",
        projects: "projects",
        rules: "rules",
        agentRoles: "agent roles"
      },
      filtersTitle: "Filters",
      filtersDescription: "Start a project search from direction, asset type, stack, or tag.",
      fields: {
        direction: "direction",
        type: "type",
        stack: "stack",
        tag: "tag",
        all: "all"
      },
      runQuery: "Run query",
      quickTagsTitle: "Quick tags",
      quickTagsDescription: "Jump straight into a narrow catalog slice.",
      starterTitle: "Catalog snapshot",
      starterDescription: "A small representative preview. Full filtering belongs in discover.",
      openFullSearch: "view all",
      resourcesTitle: "Resources",
      resourcesDescription: "Open the main work areas.",
      resources: {
        discover: "discover catalog assets",
        projects: "inspect project workspaces",
        drafts: "open draft studio",
        exports: "review export snapshots"
      },
      projectShortcutsTitle: "Recent projects",
      projectShortcutsDescription: "Keep workspace entry points visible without expanding project detail.",
      workflowTitle: "Asset workflow",
      workflowDescription: "Start with catalog selection and finish with a reviewable project baseline.",
      workflowBodyA:
        "`spec-web-ui` is a catalog-first workspace. The catalog stays repo-backed. Projects consume rules, templates, and agent roles as composable assets.",
      workflowBodyB:
        "The product loop is intentionally narrow: discover assets, assemble a project, refine the draft, then review export diffs before handoff.",
      workflowSteps: [
        "1. discover - search reusable assets",
        "2. workspace - assemble project composition",
        "3. draft - write the structured spec",
        "4. export - review the generated bundle"
      ]
    },
    about: {
      agentFlow: {
        eyebrow: "$ cat specs/RP-002-decision-api/spec.md",
        title: "Agent workflow and test boundaries",
        description:
          "From draft intake to design, roadmap, and feature spec, execution and testing stay in separate contexts. Execution owns implementation and unit tests. Testing owns the test plan, scenarios, and real runs.",
        stages: ["request", "spec-draft", "design", "roadmap", "feature spec", "split execution + testing", "review / merge"],
        gate: "Confirm design and feature-spec boundaries first, then split execution and testing into two isolated agent tracks.",
        tracks: [
          {
            name: "Spec Agent",
            role: "Maintain the design and feature-spec chain",
            description: "Refine the draft into reviewable design and feature-spec artifacts and record the resulting decisions.",
            points: ["spec-draft -> feature spec", "design / roadmap update", "review handoff"]
          },
          {
            name: "Execution Agent",
            role: "Deliver code and unit tests",
            description: "Own implementation and implementation-coupled unit tests only. Do not consume independent test plans.",
            points: ["implementation tasks", "unit tests", "implementation-report"]
          },
          {
            name: "Test Agent",
            role: "Run isolated verification",
            description: "Own test plan, scenarios, API, E2E, UI, and normalized result reporting.",
            points: ["test-plan / test-schedule", "E2E / scenario / API / UI", "test-result-summary"]
          }
        ]
      },
      projectModes: {
        eyebrow: "$ cat docs/spec-modes/README.md",
        title: "Project modes",
        description:
          "SpecOS has three official project modes. The about page spells out their type, structural focus, and operating purpose so the delivery model can be chosen before project assembly starts.",
        sharedLabel: "Shared rules",
        sharedPoints: [
          "All three modes keep README, design, and current as the stable context entry points.",
          "All three modes require feature, implementation, review, and test artifacts to stay traceable by Spec ID.",
          "The real difference is the granularity of delivery evidence, role boundaries, and governance strength."
        ],
        modes: [
          {
            name: "LiteSpec",
            typeLabel: "Type",
            typeValue: "Feature Driven",
            treeLabel: "Tree preview",
            treeCommand: "$ tree project/",
            tree: [
              { text: "project/" },
              { text: "|-- README.md", note: "entry context" },
              { text: "|-- design/", note: "stable system truth" },
              { text: "|-- current/", note: "active delivery state" },
              { text: "|-- specs/", note: "feature-local artifacts" },
              { text: "|   |-- roadmap.md" },
              { text: "|   `-- RP-001-feature/" },
              { text: "|       |-- spec.md" },
              { text: "|       |-- tasks.md" },
              { text: "|       |-- tests.md", note: "feature-local checks" },
              { text: "|       |-- review.md" },
              { text: "|       `-- changelog.md" },
              { text: "`-- .agents/", note: "small shared agent context" }
            ],
            loadLabel: "Loading order",
            loadPath: ["README", "current", "design", "specs/RP-xxx", "relevant skill"],
            loadNote: "Load along one feature track so the agent can read the smallest useful context in one pass.",
            purposeLabel: "Purpose",
            purposeValue:
              "Treat the feature as the smallest execution unit so agent context stays small, iteration stays fast, and the directory can be loaded in one pass.",
            structureLabel: "Structure focus",
            structure: [
              "Keep spec, tasks, tests, review, and changelog together under one feature directory in specs/RP-xxx/.",
              "Use current/ for active-feature, active-context, active-tasks, and handoff so the project can move along a single active track.",
              "Keep .agents/ small, with a few shared skill files, because one engineer or one agent is expected to finish the feature end to end."
            ],
            fitLabel: "Best for",
            fit: [
              "MVPs, personal projects, and small-team day-to-day development.",
              "Low-token, fast-iteration work where delivery evidence can stay close to the feature.",
              "Platform, infrastructure, and internal-tool projects that need rapid trial and adjustment."
            ]
          },
          {
            name: "GoalSpec",
            typeLabel: "Type",
            typeValue: "Workflow Driven",
            treeLabel: "Tree preview",
            treeCommand: "$ tree project/",
            tree: [
              { text: "project/" },
              { text: "|-- README.md", note: "entry context" },
              { text: "|-- design/", note: "stable system truth" },
              { text: "|-- current/", note: "dual-track delivery status" },
              { text: "|-- docs/workflow.md", note: "versioned delivery chain" },
              { text: "|-- specs/", note: "issue index + feature" },
              { text: "|   |-- issues/README.md", note: "produced by /to-issues" },
              { text: "|   `-- RP-001-feature/" },
              { text: "|       |-- spec.md" },
              { text: "|       |-- tasks.md" },
              { text: "|       |-- review.md", note: "produced by /review-it" },
              { text: "|       `-- changelog.md", note: "produced by /ship-it" },
              { text: "|-- implementation/", note: "changed-surface record" },
              { text: "|-- tests/specs/", note: "produced by /spec-to-test" },
              { text: "`-- .agents/", note: "small shared agent context" }
            ],
            loadLabel: "Loading order",
            loadPath: ["README", "current", "design", "specs/issues", "specs/RP-xxx"],
            loadNote: "Adds Issue and Test Spec indexes so an agent can resolve the current implementation and verification state.",
            purposeLabel: "Purpose",
            purposeValue:
              "Approve a versioned Feature Spec, advance implementation and independent verification in parallel, then converge at review and ship.",
            structureLabel: "Structure focus",
            structure: [
              "specs/issues/ keeps implementation and verification issue indexes separate; each issue stays small and independently reviewable.",
              "Review and ship stay single-file per feature (review.md, changelog.md), without EnterpriseSpec's multi-stage reviews/ tree.",
              "docs/workflow.md records Feature Spec versions, Test Spec versions, and the dual-track convergence gates."
            ],
            fitLabel: "Best for",
            fit: [
              "Small teams that already work issue by issue.",
              "Projects that want explicit review and ship gates without EnterpriseSpec's role-separated governance.",
              "Teams moving from LiteSpec toward EnterpriseSpec that don't need the full delivery-evidence apparatus yet."
            ]
          },
          {
            name: "EnterpriseSpec",
            typeLabel: "Type",
            typeValue: "Delivery Driven",
            treeLabel: "Tree preview",
            treeCommand: "$ tree project/",
            tree: [
              { text: "project/" },
              { text: "|-- README.md", note: "entry context" },
              { text: "|-- design/", note: "stable system truth" },
              { text: "|-- current/", note: "release and blocker state" },
              { text: "|-- specs/", note: "demand-side artifacts" },
              { text: "|   `-- RP-001-feature/" },
              { text: "|-- implementation/", note: "rollout and rollback evidence" },
              { text: "|   `-- RP-001/" },
              { text: "|-- tests/", note: "by test type" },
              { text: "|   |-- unit/" },
              { text: "|   |-- e2e/" },
              { text: "|   |-- performance/" },
              { text: "|   `-- security/" },
              { text: "|-- reviews/", note: "staged approvals" },
              { text: "`-- docs/", note: "runbook and ops" }
            ],
            loadLabel: "Loading order",
            loadPath: ["README", "current", "role view", "owned artifacts"],
            loadNote:
              "Load by role slice instead of asking one agent to read implementation, tests, reviews, and docs all at once.",
            purposeLabel: "Purpose",
            purposeValue:
              "Treat delivery evidence as the smallest governance unit so QA, audit, release, and rollback paths can each be proven independently.",
            structureLabel: "Structure focus",
            structure: [
              "Keep demand-side artifacts such as spec, task-plan, model, api, and migration in specs/, while implementation, tests, and reviews live in separate top-level directories.",
              "Split tests/ by type, including unit, integration, e2e, performance, security, and results, so specialist roles can work in parallel.",
              "Use reviews/, docs/runbook/, and rollout or rollback records as fixed homes for release governance, audit evidence, and operations handoff."
            ],
            fitLabel: "Best for",
            fit: [
              "Systems with payment, risk, permission, security, audit, or compliance scope.",
              "Projects that require formal QA gates, release records, rollback proof, or multi-team collaboration.",
              "Delivery environments where performance, concurrency, or security testing must be isolated and retained."
            ]
          }
        ],
        decisionLabel: "Selection rule",
        decision:
          "Start with LiteSpec by default. Move to GoalSpec when the team wants a standard issue-split -> implement -> review -> ship loop with explicit review/ship gates. Move to EnterpriseSpec when the feature needs independent QA, release governance, performance or security evidence, or when a single agent can no longer carry the whole change in one narrow execution track."
      },
      testUiDemo: {
        eyebrow: "$ open test-console/demo",
        title: "Test UI demo",
        description:
          "An embedded preview of the independent test console. It uses a horizontal flow diagram to show spec, test scenario, test chain, test standard, and test result relationships.",
        summary: [
          { label: "API pass rate", value: "83%", tone: "blue" },
          { label: "Scenario pass rate", value: "50%", tone: "amber" },
          { label: "Release decision", value: "blocked", tone: "mint" }
        ],
        flowLabel: "Test flow diagram",
        columns: ["Spec", "Test scenario", "Test chain", "Test standard", "Test result"],
        columnNotes: ["Input source", "User behavior split from the spec", "Executable path for the scenario", "Rule for pass/fail judgement", "Conclusion from the real run"],
        flows: [
          {
            spec: "reward-order spec v1.2.0",
            scenario: "User claims reward successfully",
            chain: "API + UI happy-path chain",
            standard: "200 / decrement inventory / success copy",
            result: "Pass · trace-scenario-happy-001",
            status: "pass"
          },
          {
            spec: "reward-order spec v1.2.0",
            scenario: "User claims reward successfully",
            chain: "Result consistency chain",
            standard: "Order / inventory / entitlement align",
            result: "Pass · api-pass-rate 100%",
            status: "pass"
          },
          {
            spec: "reward-order spec v1.2.0",
            scenario: "Claim fails when inventory is low",
            chain: "Error branch chain",
            standard: "OUT_OF_STOCK / recoverable failure copy",
            result: "Fail · error-code assertion mismatch",
            status: "fail"
          },
          {
            spec: "reward-order spec v1.2.0",
            scenario: "Claim fails when inventory is low",
            chain: "Test asset chain",
            standard: "Bruno collection / adapter executable",
            result: "Blocked · independent execution adapter missing",
            status: "blocked"
          }
        ]
      }
    }
  }
} as const;

export function getLocaleCopy(locale: Locale) {
  return localeCopy[locale];
}

export function buildLocaleBootScript() {
  return `(() => {
  const storageKey = "${LOCALE_STORAGE_KEY}";
  const defaultLocale = "${DEFAULT_LOCALE}";
  const normalize = (value) => value === "en" || value === "zh" ? value : defaultLocale;
  let locale = defaultLocale;
  try {
    locale = normalize(window.localStorage.getItem(storageKey));
  } catch {}
  const root = document.documentElement;
  root.dataset.locale = locale;
  root.lang = locale === "zh" ? "zh-CN" : "en";
})();`;
}
