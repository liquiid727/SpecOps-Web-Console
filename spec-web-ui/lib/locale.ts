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
      theme: "主题",
      day: "日间",
      night: "夜间"
    },
    home: {
      heroTitle: "先搜索目录，找到要组合的项目资产。",
      heroDescription: "SpecOS Web UI 是一个轻量入口。真正的浏览、组装和导出都放在对应工作区里，首页只负责帮你开始。",
      searchLabel: "搜索目录",
      searchPlaceholder: "$ 搜索规则、模板、Agent 角色...",
      openDiscover: "进入发现",
      openProjects: "进入项目",
      firstUseTitle: "初次使用建议",
      firstUsePrefix: "不知道从哪里开始时，先去 ",
      firstUseLinks: [
        {
          label: "发现页",
          description: " 看目录资产",
          href: "/discover"
        },
        {
          label: "项目页",
          description: " 组合项目上下文",
          href: "/projects"
        },
        {
          label: "导出页",
          description: " 做交付评审",
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
      workflowTitle: "工作区循环",
      workflowDescription: "产品流程保持聚焦：发现、组装、草稿、导出。",
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
        eyebrow: "$ cat specs/changes/spec-change-agent-workflow/spec.md",
        title: "Agent 工作方式与测试边界",
        description: "从需求进入 spec-draft，到 change 归档，执行和测试始终保持独立上下文。执行只管实现和单元测试，测试只管 test-plan、场景和真实执行。",
        stages: ["需求", "spec-draft", "spec", "change", "架构/设计 Gate", "执行 + 测试分轨", "归档"],
        gate: "架构和设计先审，再把执行与测试拆成两个互不污染的 agent track。",
        tracks: [
          {
            name: "Spec Agent",
            role: "维护 change 文档链路",
            description: "把 draft 润色为可审查的 change，记录变更、结论和归档事实。",
            points: ["spec-draft -> spec", "change 变更记录", "current / archive 推进"]
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
      theme: "Theme",
      day: "Day",
      night: "Night"
    },
    home: {
      heroTitle: "Search the catalog first, then compose the assets you need.",
      heroDescription:
        "SpecOS Web UI is a lightweight entry point. Browsing, composing, and exporting live in their own workspaces. The homepage only helps you get started.",
      searchLabel: "search catalog",
      searchPlaceholder: "$ search rules, templates, agent roles...",
      openDiscover: "Go to discover",
      openProjects: "Go to projects",
      firstUseTitle: "First-use guide",
      firstUsePrefix: "If you are not sure where to start, open ",
      firstUseLinks: [
        {
          label: "discover",
          description: " for catalog assets",
          href: "/discover"
        },
        {
          label: "projects",
          description: " to compose context",
          href: "/projects"
        },
        {
          label: "exports",
          description: " for handoff review",
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
      workflowTitle: "Workspace loop",
      workflowDescription: "The product flow stays intentionally narrow: discover, assemble, draft, export.",
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
        eyebrow: "$ cat specs/changes/spec-change-agent-workflow/spec.md",
        title: "Agent workflow and test boundaries",
        description:
          "From draft intake to archived change, execution and testing stay in separate contexts. Execution owns implementation and unit tests. Testing owns the test plan, scenarios, and real runs.",
        stages: ["request", "spec-draft", "spec", "change", "architecture/design gate", "split execution + testing", "archive"],
        gate: "Architecture and design review first, then split execution and testing into two isolated agent tracks.",
        tracks: [
          {
            name: "Spec Agent",
            role: "Maintain the change document chain",
            description: "Refine the draft into a reviewable change and record change history, conclusions, and archive facts.",
            points: ["spec-draft -> spec", "change log", "current / archive promotion"]
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
