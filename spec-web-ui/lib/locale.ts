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
        home: "主页",
        discover: "发现",
        "spec-templates": "Spec 模版",
        "agent-templates": "Agent 模版",
        specTemplates: "Spec 模版",
        agentTemplates: "Agent 模版",
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
    }
  },
  en: {
    name: "English",
    htmlLang: "en",
    shell: {
      languageLabel: "Language",
      nav: {
        home: "Home",
        discover: "Discover",
        "spec-templates": "Spec templates",
        "agent-templates": "Agent templates",
        specTemplates: "Spec templates",
        agentTemplates: "Agent templates",
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
