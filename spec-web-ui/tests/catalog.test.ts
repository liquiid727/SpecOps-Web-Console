import { describe, expect, it } from "vitest";

import {
  buildCatalogComparison,
  filterCatalogAssets,
  getCatalogFilterOptions,
  getFeaturedAssets,
  getMarketplaceRecommendations,
  loadCatalogAssets,
  sortCatalogAssetsForWorkspace
} from "@/lib/catalog";
import { buildAssetCompositionPreview } from "@/lib/projects";
import type { CatalogAsset } from "@/lib/types";

const assets: CatalogAsset[] = [
  {
    id: "rule-go-backend",
    type: "rule",
    title: "Go Backend Governance",
    summary: "Shared backend delivery rules for Go services.",
    direction: "backend",
    categories: ["backend"],
    stacks: ["go"],
    tags: ["ci", "auth", "errors"],
    appliesTo: ["backend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "rules/backend/go-backend-governance.md",
    files: ["rules/backend/go-backend-governance.md"],
    version: "1.0.0"
  },
  {
    id: "template-react-feature",
    type: "spec_template",
    title: "React Feature Draft",
    summary: "Structured draft template for React-facing features.",
    direction: "frontend",
    categories: ["product", "frontend"],
    stacks: ["react"],
    tags: ["react", "ui"],
    appliesTo: ["frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "spec-draft/_template/feature/product-ui.template.md",
    files: ["spec-draft/_template/feature/product-ui.template.md"],
    version: "1.0.0"
  },
  {
    id: "skill-tool-config-ui",
    type: "skill",
    title: "Tool Config UI Skill",
    summary: "Patterns for safe agent configuration interfaces.",
    direction: "frontend",
    categories: ["frontend", "operations"],
    stacks: ["react"],
    tags: ["skill", "config"],
    appliesTo: ["frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: ".skills/tool-config-ui/SKILL.md",
    files: [".skills/tool-config-ui/SKILL.md"],
    version: "1.0.0"
  },
  {
    id: "team-governance-pack",
    type: "agent_team",
    title: "Governance Team Pack",
    summary: "Reusable agent team routing pack.",
    direction: "fullstack",
    categories: ["operations", "deployment"],
    stacks: ["go", "react"],
    tags: ["team", "routing"],
    appliesTo: ["backend", "frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "agent-teams/governance-pack/README.md",
    files: ["agent-teams/governance-pack/README.md"],
    version: "1.0.0"
  },
  {
    id: "agent-openapi",
    type: "agent_role",
    title: "OpenAPI Agent",
    summary: "Produces API contracts and aligns them with spec output.",
    direction: "fullstack",
    categories: ["backend", "product"],
    stacks: ["go", "react"],
    tags: ["openapi", "api"],
    appliesTo: ["backend", "frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "ai/agents/openapi-agent.md",
    files: ["ai/agents/openapi-agent.md"],
    version: "1.0.0"
  },
  {
    id: "skill-ddd-layering",
    type: "skill",
    title: "DDD Layering Governance",
    summary: "Guides DDD layer ownership and domain modeling decisions.",
    direction: "backend",
    stacks: ["go"],
    tags: ["ddd", "layering"],
    appliesTo: ["backend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "spec-web-ui/catalog/skills/ddd-layering-governance/SKILL.md",
    files: [
      "spec-web-ui/catalog/skills/ddd-layering-governance/SKILL.md",
      "spec-web-ui/catalog/skills/ddd-layering-governance/references/layering-rules.md"
    ],
    version: "1.0.0"
  }
];

describe("filterCatalogAssets", () => {
  it("applies text, type, direction, stack, and tag filters together", () => {
    const result = filterCatalogAssets(assets, {
      query: "api",
      types: ["agent_role"],
      directions: ["fullstack"],
      stacks: ["go"],
      tags: ["openapi"]
    });

    expect(result.map((asset) => asset.id)).toEqual(["agent-openapi"]);
  });

  it("returns all assets when no filters are set", () => {
    expect(filterCatalogAssets(assets, {})).toHaveLength(6);
  });

  it("matches source paths while searching catalog assets", () => {
    const result = filterCatalogAssets(assets, { query: ".skills/tool-config-ui" });

    expect(result.map((asset) => asset.id)).toEqual(["skill-tool-config-ui"]);
  });

  it("matches localized summaries while searching catalog assets", () => {
    const localizedAssets: CatalogAsset[] = [
      {
        id: "skill-go-backend-governance",
        type: "skill",
        title: "Go Backend Governance",
        summary: "English summary.",
        summaryZh: "Go 后端治理总入口。",
        direction: "backend",
        categories: ["backend"],
        stacks: ["go"],
        tags: ["governance"],
        appliesTo: ["backend"],
        dependsOn: [],
        conflictsWith: [],
        sourcePath: "spec-web-ui/catalog/skills/go-backend-governance/SKILL.md",
        files: ["spec-web-ui/catalog/skills/go-backend-governance/SKILL.md"],
        version: "1.0.0"
      }
    ];

    const result = filterCatalogAssets(localizedAssets, { query: "总入口" });

    expect(result.map((asset) => asset.id)).toEqual(["skill-go-backend-governance"]);
  });

  it("filters catalog assets by shared business category", () => {
    const result = filterCatalogAssets(assets, { categories: ["operations"] });

    expect(result.map((asset) => asset.id)).toEqual(["skill-tool-config-ui", "team-governance-pack"]);
  });
});

describe("getCatalogFilterOptions", () => {
  it("collects sorted filter values from the catalog", () => {
    expect(getCatalogFilterOptions(assets)).toEqual({
      directions: ["backend", "frontend", "fullstack"],
      stacks: ["go", "react"],
      tags: ["api", "auth", "ci", "config", "ddd", "errors", "layering", "openapi", "react", "routing", "skill", "team", "ui"],
      types: ["agent_role", "agent_team", "rule", "skill", "spec_template"]
    });
  });
});

describe("loadCatalogAssets", () => {
  it("loads skill assets from the web-ui catalog directory", async () => {
    const catalog = await loadCatalogAssets();
    const skill = catalog.find((asset) => asset.id === "skill-ddd-layering-governance");

    expect(skill?.type).toBe("skill");
    expect(skill?.sourcePath).toBe("spec-web-ui/catalog/skills/ddd-layering-governance/SKILL.md");
  });

  it("loads spec and agent template assets from directory-backed manifests", async () => {
    const catalog = await loadCatalogAssets();
    const specTemplate = catalog.find((asset) => asset.id === "template-feature-draft");
    const modesTemplate = catalog.find((asset) => asset.id === "template-project-modes");
    const currentTemplate = catalog.find((asset) => asset.id === "template-current-workspace");
    const agentTemplate = catalog.find((asset) => asset.id === "agent-spec-editor");

    expect(specTemplate?.sourcePath).toBe(
      "spec-web-ui/catalog/spec-templates/template-feature-draft/product-ui.template.md"
    );
    expect(specTemplate?.files).toEqual(["spec-draft/_template/feature/product-ui.template.md"]);
    expect(specTemplate?.contentFiles?.["spec-draft/_template/feature/product-ui.template.md"]).toBe(
      "spec-web-ui/catalog/spec-templates/template-feature-draft/product-ui.template.md"
    );
    expect(modesTemplate?.files).toEqual([
      "docs/spec-modes/README.md",
      "docs/spec-modes/LiteSpec/README.md",
      "docs/spec-modes/EnterpriseSpec/README.md"
    ]);
    expect(modesTemplate?.contentFiles?.["docs/spec-modes/LiteSpec/README.md"]).toBe(
      "spec-web-ui/catalog/spec-templates/template-project-modes/LiteSpec.md"
    );
    expect(currentTemplate?.files).toContain("current/project-status.md");
    expect(currentTemplate?.contentFiles?.["current/handoff.md"]).toBe(
      "spec-web-ui/catalog/spec-templates/template-current-workspace/handoff.md"
    );
    expect(agentTemplate?.sourcePath).toBe(
      "spec-web-ui/catalog/agent-templates/agent-spec-editor/spec-editor.md"
    );
    expect(agentTemplate?.files).toEqual(["ai/agents/spec-editor.md"]);
  });

  it("loads the extracted Go skill and agent pack as reusable catalog assets", async () => {
    const catalog = await loadCatalogAssets();
    const orchestratorAgent = catalog.find((asset) => asset.id === "agent-go-pack-orchestrator");
    const apiGovernanceSkill = catalog.find((asset) => asset.id === "skill-api-contract-governance");
    const backendGovernanceSkill = catalog.find((asset) => asset.id === "skill-go-backend-governance");
    const timeGovernanceSkill = catalog.find((asset) => asset.id === "skill-go-time-governance");
    const routingTemplate = catalog.find((asset) => asset.id === "template-go-pack-routing");

    expect(orchestratorAgent?.type).toBe("agent_role");
    expect(orchestratorAgent?.sourcePath).toBe(
      "spec-web-ui/catalog/agent-templates/agent-go-pack-orchestrator/orchestrator.md"
    );
    expect(orchestratorAgent?.files).toEqual(["ai/agents/orchestrator.md"]);
    expect(orchestratorAgent?.contentFiles?.["ai/agents/orchestrator.md"]).toBe(
      "spec-web-ui/catalog/agent-templates/agent-go-pack-orchestrator/orchestrator.md"
    );

    expect(apiGovernanceSkill?.type).toBe("skill");
    expect(apiGovernanceSkill?.sourcePath).toBe(
      "spec-web-ui/catalog/skills/api-contract-governance/SKILL.md"
    );
    expect(apiGovernanceSkill?.files).toContain(
      "spec-web-ui/catalog/skills/api-contract-governance/references/api-contract-rules.md"
    );
    expect(apiGovernanceSkill?.categories).toEqual(["backend"]);
    expect(apiGovernanceSkill?.summaryZh).toContain("接口契约治理");

    expect(backendGovernanceSkill?.type).toBe("skill");
    expect(backendGovernanceSkill?.sourcePath).toBe(
      "spec-web-ui/catalog/skills/go-backend-governance/SKILL.md"
    );
    expect(backendGovernanceSkill?.dependsOn).toEqual([
      "skill-api-contract-governance",
      "skill-go-time-governance",
      "skill-error-logging-governance",
      "skill-ddd-layering-governance"
    ]);
    expect(backendGovernanceSkill?.categories).toEqual(["backend"]);
    expect(backendGovernanceSkill?.summaryZh).toContain("总入口");

    expect(timeGovernanceSkill?.type).toBe("skill");
    expect(timeGovernanceSkill?.sourcePath).toBe(
      "spec-web-ui/catalog/skills/go-time-governance/SKILL.md"
    );
    expect(timeGovernanceSkill?.files).toContain(
      "spec-web-ui/catalog/skills/go-time-governance/references/clock-and-business-time.md"
    );
    expect(timeGovernanceSkill?.categories).toEqual(["backend"]);
    expect(timeGovernanceSkill?.summaryZh).toContain("时间治理");

    expect(routingTemplate?.type).toBe("spec_template");
    expect(routingTemplate?.sourcePath).toBe(
      "spec-web-ui/catalog/spec-templates/template-go-pack-routing/routing.md"
    );
    expect(routingTemplate?.files).toEqual(["ai/templates/routing.md"]);
  });
});

describe("sortCatalogAssetsForWorkspace", () => {
  it("prioritizes selected, required, recommended, and conflicting assets for the active project", () => {
    const sorted = sortCatalogAssetsForWorkspace(assets, {
      selectedAssetIds: ["agent-openapi"],
      requiredAssetIds: ["rule-go-backend"],
      recommendedAssetIds: ["template-react-feature"],
      conflictingAssetIds: []
    });

    expect(sorted.map((asset) => asset.id)).toEqual([
      "agent-openapi",
      "rule-go-backend",
      "template-react-feature",
      "skill-ddd-layering",
      "team-governance-pack",
      "skill-tool-config-ui"
    ]);
  });
});

describe("getMarketplaceRecommendations", () => {
  it("returns a focused recommendation list for the active workspace stacks", () => {
    const recommendations = getMarketplaceRecommendations(assets, {
      activeStacks: ["go"],
      selectedAssetIds: ["rule-go-backend"],
      limit: 2
    });

    expect(recommendations.map((asset) => asset.id)).toEqual(["skill-ddd-layering", "agent-openapi"]);
  });
});

describe("buildAssetCompositionPreview", () => {
  it("shows how adding an asset changes the workspace composition", () => {
    const preview = buildAssetCompositionPreview(
      {
        project: {
          id: "rewards-platform",
          name: "Rewards Platform",
          projectType: "mixed",
          architecture: "modular-monolith",
          stacks: ["go", "react"],
          selectedAssets: [
            { assetId: "rule-go-backend", enabled: true },
            { assetId: "template-react-feature", enabled: true }
          ],
          draftTemplateId: "template-react-feature",
          draftPath: "spec-web-ui/workspace/projects/rewards-platform/draft.md",
          exportTargets: ["docs/", "current/", "rules/", "specs/_template/", "ai/agents/", "agent-teams/", "project-manifest.yaml"]
        },
        selectedAssets: assets.filter((asset) =>
          ["rule-go-backend", "template-react-feature"].includes(asset.id)
        ),
        missingDependencies: [],
        conflicts: [],
        recommendedAssets: []
      },
      assets.find((asset) => asset.id === "agent-openapi")!
    );

    expect(preview.selectedAssetCount).toBe(3);
    expect(preview.exportDirectories).toEqual(["ai"]);
    expect(preview.remainingMissingDependencies).toEqual([]);
  });
});

describe("getFeaturedAssets", () => {
  it("surfaces a small featured set with strong stack and tag signals across asset types", () => {
    const featured = getFeaturedAssets(assets, {
      limit: 2,
      preferredTags: ["openapi", "config"]
    });

    expect(featured.map((asset) => asset.id)).toEqual(["agent-openapi", "skill-tool-config-ui"]);
  });
});

describe("buildCatalogComparison", () => {
  it("creates a comparison-friendly shape for multiple assets", () => {
    const comparison = buildCatalogComparison(assets, ["rule-go-backend", "agent-openapi"]);

    expect(comparison.assets.map((asset) => asset.id)).toEqual(["rule-go-backend", "agent-openapi"]);
    expect(comparison.exportDirectories).toEqual(["ai", "rules"]);
    expect(comparison.sharedStacks).toEqual(["go"]);
  });
});
