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
        requirements: "需求包",
        "spec-templates": "Spec 模版",
        "skill-templates": "Skill 技能",
        "agent-templates": "Agent 模版",
        "agent-teams": "Agent Team",
        "engineering-packs": "工程包",
        specTemplates: "Spec 模版",
        skillTemplates: "Skill 技能",
        agentTemplates: "Agent 模版",
        agentTeams: "Agent Team",
        engineeringPacks: "工程包",
        workflowTemplates: "Workflow 模版",
        projects: "项目",
        drafts: "草稿",
        exports: "导出"
      },
      home: "首页",
      theme: "视觉系统",
      themeOptions: {
        "alro-pink": "Alro Pink",
        neo: "Neo"
      }
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
        eyebrow: "$ cat .requirements/requirements/R001-decision-api/spec.md",
        title: "Agent-Native SDLC 工作流",
        description: "一个需求 = 一个 Requirement Package。所有契约（PRD、Spec、Test、Issues）在同一目录落盘，ID 从 REQ 到 SPEC / TEST / ISSUE 永久锚定。Agent 沿 8 个 mode 的链路推进，执行与验证始终可追踪、可回溯。",
        stages: ["需求 / Idea", "PRD", "Spec", "Spec-Test", "Issues", "Issue 执行", "Feature Verify", "Done"],
        gate: "PRD 与 Spec 必须先通过 review 才能进入下游；Spec 与代码冲突时执行 agent 必须 STOP 并记录 Deviation 退回 Spec Review，不得静默改写产品语义。",
        tracks: [
          {
            name: "Spec Agent",
            role: "维护 Requirement Package 的契约链路",
            description: "按 prd-author → prd-review → spec-generate → spec-review → spec-test-generate → issue-generate 推进，产出并回写 prd.md / spec.md / test.md / issues.md。",
            points: [".requirements/requirements/R001-<slug>/prd.md（REQ-R001-001）", "spec.md（SPEC-R001-F01-001）+ test.md（TEST-R001-F01-001）", "issues.md（ISSUE-R001-001）与 review gate"]
          },
          {
            name: "Execution Agent",
            role: "按 Issue 实现，不擅改产品意图",
            description: "执行前必读 prd / spec / test 与代码库；只改本 Issue 范围并写 Completion Record；Spec 与代码冲突时 STOP 记录 Deviation。",
            points: ["遍历 ## ISSUE-R001-001 执行", "写 **Status:** 与 ### Completion Record", "实现耦合的单元测试"]
          },
          {
            name: "Verify Agent",
            role: "独立验证与追踪矩阵",
            description: "跑 test.md 的 Exit Criteria（E2E / 场景 / API / UI），核对 Requirement|Spec|Test|Issue 的可追踪关系，收敛到 feature-verify gate。",
            points: ["test.md 全场景覆盖（P0/P1 REQ）", "feature-verify 关卡", "traceability.md"]
          }
        ]
      },
      projectModes: {
        eyebrow: "$ cat docs/spec-modes/GoalSpec/README.md",
        title: "项目模式说明",
        description: "SpecOS 只有一个官方模式：GoalSpec（Agent-Native SDLC）。LiteSpec 与 EnterpriseSpec 不再作为独立 mode，保留为可选插件规范。about 页直接说明模式的结构重点和实际作用，方便在进入项目之前先选对交付模型。",
        sharedLabel: "共享约束",
        sharedPoints: [
          "一个需求 = 一个 Requirement Package（prd / spec / test / issues 同目录落盘）。",
          "ID 是永久锚点：REQ / SPEC / TEST / ISSUE 不因改稿而重排复用。",
          "Source Priority：approved PRD → approved Spec → ADR → 代码 → 测试，Agent 不得静默改写产品意图。"
        ],
        modes: [
          {
            name: "GoalSpec",
            typeLabel: "类型",
            typeValue: "Agent-Native SDLC",
            treeLabel: "目录树缩略图",
            treeCommand: "$ tree .requirements/",
            tree: [
              { text: ".requirements/" },
              { text: "|-- README.md", note: "包索引 / 入口" },
              { text: "|-- requirements/" },
              { text: "|   `-- R001-decision-api/" },
              { text: "|       |-- prd.md", note: "REQ-R001-001" },
              { text: "|       |-- spec.md", note: "SPEC-R001-F01-001" },
              { text: "|       |-- test.md", note: "TEST-R001-F01-001" },
              { text: "|       `-- issues.md", note: "ISSUE-R001-001" },
              { text: "|-- examples/", note: "R000-example-*" },
              { text: "|-- templates/", note: "prd / spec / test / issues" },
              { text: "`-- skills/", note: "8-mode 统一 skill" }
            ],
            loadLabel: "加载顺序",
            loadPath: [".requirements/README.md", "R001-<slug>/prd.md", "spec.md", "test.md", "issues.md", "相关 skill"],
            loadNote: "按一个 Requirement Package 加载，一次读完 REQ→SPEC→TEST→ISSUE 整条链路。",
            purposeLabel: "作用",
            purposeValue: "让需求、契约、验证与执行进度在同一目录下可追踪：ID 永久锚定，变更走 type: change + affects，Agent 在任何 mode 都能找到决策来源。",
            structureLabel: "结构重点",
            structure: [
              "prd.md 用 RFC-2119 语言写 Goal / Non-Goal / REQ / BR / INV / Edge / AC，稳定 ID 不重排。",
              "spec.md 按业务逻辑做 F0N 分组，每条契约编号 SPEC-R001-F0N-###。",
              "test.md 覆盖 happy / negative / permission / state / invariant / retry / concurrency / external failure / observability。",
              "issues.md 用 ## ISSUE-R001-### 小节维护执行与进度。"
            ],
            fitLabel: "适用场景",
            fit: [
              "所有按需求包交付、要求可追踪链的团队。",
              "需要 Agent 在多模式链路中稳定推进、且能回溯每个决策来源的项目。",
              "LiteSpec / EnterpriseSpec 可作为可选插件叠加。"
            ]
          }
        ],
        decisionLabel: "选择原则",
        decision: "默认直接使用 GoalSpec。需要轻量单线推进时可参考 LiteSpec 插件，需要重治理与审计证据时叠加 EnterpriseSpec 插件；但它们不再是独立的正式模式。"
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
            spec: "reward-order SPEC-R001-F01-001",
            scenario: "用户成功领取奖励",
            chain: "API + UI 主路径链条",
            standard: "200 / 扣减库存 / 成功提示",
            result: "通过 · trace-scenario-happy-001",
            status: "pass"
          },
          {
            spec: "reward-order SPEC-R001-F01-001",
            scenario: "用户成功领取奖励",
            chain: "结果一致性链条",
            standard: "订单 / 库存 / 权益一致",
            result: "通过 · api-pass-rate 100%",
            status: "pass"
          },
          {
            spec: "reward-order SPEC-R001-F01-001",
            scenario: "库存不足时领取失败",
            chain: "异常分支链条",
            standard: "OUT_OF_STOCK / 可恢复失败提示",
            result: "失败 · 错误码映射断言未通过",
            status: "fail"
          },
          {
            spec: "reward-order SPEC-R001-F01-001",
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
        requirements: "Requirements",
        "spec-templates": "Spec templates",
        "skill-templates": "Skill skills",
        "agent-templates": "Agent templates",
        "agent-teams": "Agent teams",
        "engineering-packs": "Engineering packs",
        specTemplates: "Spec templates",
        skillTemplates: "Skill skills",
        agentTemplates: "Agent templates",
        agentTeams: "Agent teams",
        engineeringPacks: "Engineering packs",
        workflowTemplates: "Workflow templates",
        projects: "Projects",
        drafts: "Drafts",
        exports: "Exports"
      },
      home: "Home",
      theme: "Visual system",
      themeOptions: {
        "alro-pink": "Alro Pink",
        neo: "Neo"
      }
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
        eyebrow: "$ cat .requirements/requirements/R001-decision-api/spec.md",
        title: "Agent-Native SDLC workflow",
        description:
          "One requirement = one Requirement Package. All contracts (PRD, Spec, Test, Issues) live in the same directory, with IDs anchored permanently from REQ through SPEC/TEST/ISSUE. Agents advance along an 8-mode chain, so execution and verification stay traceable end to end.",
        stages: ["Idea", "PRD", "Spec", "Spec-Test", "Issues", "Issue execution", "Feature verify", "Done"],
        gate: "PRD and Spec must pass review before downstream work. On a spec/code conflict the execution agent must STOP, record a Deviation, and hand back to Spec Review — never silently rewrite product intent.",
        tracks: [
          {
            name: "Spec Agent",
            role: "Maintain the Requirement Package contract chain",
            description: "Runs prd-author → prd-review → spec-generate → spec-review → spec-test-generate → issue-generate, producing and updating prd.md / spec.md / test.md / issues.md.",
            points: [".requirements/requirements/R001-<slug>/prd.md (REQ-R001-001)", "spec.md (SPEC-R001-F01-001) + test.md (TEST-R001-F01-001)", "issues.md (ISSUE-R001-001) and review gates"]
          },
          {
            name: "Execution Agent",
            role: "Deliver issues without rewriting product intent",
            description: "Reads prd / spec / test and the codebase before executing; touches only the current Issue scope and writes a Completion Record; STOPs with a Deviation on spec/code conflicts.",
            points: ["execute ## ISSUE-R001-001", "write **Status:** and ### Completion Record", "implementation-coupled unit tests"]
          },
          {
            name: "Verify Agent",
            role: "Run isolated verification and the traceability matrix",
            description: "Runs test.md Exit Criteria (E2E / scenario / API / UI) and checks the Requirement|Spec|Test|Issue trace links, converging at the feature-verify gate.",
            points: ["test.md full coverage (P0/P1 REQs)", "feature-verify gate", "traceability.md"]
          }
        ]
      },
      projectModes: {
        eyebrow: "$ cat docs/spec-modes/GoalSpec/README.md",
        title: "Project modes",
        description:
          "SpecOS has one official mode: GoalSpec (Agent-Native SDLC). LiteSpec and EnterpriseSpec are no longer independent modes; they remain as optional plugin specs. The about page spells out the structural focus and operating purpose so the delivery model can be chosen before project assembly starts.",
        sharedLabel: "Shared rules",
        sharedPoints: [
          "One requirement = one Requirement Package (prd / spec / test / issues co-located).",
          "IDs are permanent anchors: REQ / SPEC / TEST / ISSUE are never renumbered or reused across drafts.",
          "Source Priority: approved PRD → approved Spec → ADR → code → tests. Agents never silently rewrite product intent."
        ],
        modes: [
          {
            name: "GoalSpec",
            typeLabel: "Type",
            typeValue: "Agent-Native SDLC",
            treeLabel: "Tree preview",
            treeCommand: "$ tree .requirements/",
            tree: [
              { text: ".requirements/" },
              { text: "|-- README.md", note: "package index / entry" },
              { text: "|-- requirements/" },
              { text: "|   `-- R001-decision-api/" },
              { text: "|       |-- prd.md", note: "REQ-R001-001" },
              { text: "|       |-- spec.md", note: "SPEC-R001-F01-001" },
              { text: "|       |-- test.md", note: "TEST-R001-F01-001" },
              { text: "|       `-- issues.md", note: "ISSUE-R001-001" },
              { text: "|-- examples/", note: "R000-example-*" },
              { text: "|-- templates/", note: "prd / spec / test / issues" },
              { text: "`-- skills/", note: "8-mode unified skill" }
            ],
            loadLabel: "Loading order",
            loadPath: [".requirements/README.md", "R001-<slug>/prd.md", "spec.md", "test.md", "issues.md", "relevant skill"],
            loadNote: "Load along one Requirement Package so an agent reads the whole REQ→SPEC→TEST→ISSUE chain in a single pass.",
            purposeLabel: "Purpose",
            purposeValue:
              "Keep requirements, contracts, verification, and execution progress traceable in one directory: IDs are permanent, changes use type: change + affects, and every mode can resolve the source of a decision.",
            structureLabel: "Structure focus",
            structure: [
              "prd.md writes Goal / Non-Goal / REQ / BR / INV / Edge / AC in RFC-2119 language, with stable IDs that never renumber.",
              "spec.md groups contracts into logical F0N units, each numbered SPEC-R001-F0N-###.",
              "test.md covers happy / negative / permission / state / invariant / retry / concurrency / external failure / observability.",
              "issues.md tracks execution and progress as ## ISSUE-R001-### sections."
            ],
            fitLabel: "Best for",
            fit: [
              "Any team delivering by requirement package with a demand for traceability.",
              "Projects where agents must advance along a multi-mode chain and every decision can be traced to a source.",
              "LiteSpec / EnterpriseSpec may be layered on as optional plugins."
            ]
          }
        ],
        decisionLabel: "Selection rule",
        decision:
          "Use GoalSpec by default. Reference the LiteSpec plugin for light single-track delivery, or layer EnterpriseSpec for heavy governance and audit evidence — but they are no longer official modes."
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
            spec: "reward-order SPEC-R001-F01-001",
            scenario: "User claims reward successfully",
            chain: "API + UI happy-path chain",
            standard: "200 / decrement inventory / success copy",
            result: "Pass · trace-scenario-happy-001",
            status: "pass"
          },
          {
            spec: "reward-order SPEC-R001-F01-001",
            scenario: "User claims reward successfully",
            chain: "Result consistency chain",
            standard: "Order / inventory / entitlement align",
            result: "Pass · api-pass-rate 100%",
            status: "pass"
          },
          {
            spec: "reward-order SPEC-R001-F01-001",
            scenario: "Claim fails when inventory is low",
            chain: "Error branch chain",
            standard: "OUT_OF_STOCK / recoverable failure copy",
            result: "Fail · error-code assertion mismatch",
            status: "fail"
          },
          {
            spec: "reward-order SPEC-R001-F01-001",
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
