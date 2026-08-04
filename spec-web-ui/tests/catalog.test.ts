import { describe, expect, it } from "vitest";

import {
  buildCatalogComparison,
  filterCatalogAssets,
  getCatalogFilterOptions,
  getFeaturedAssets,
  getMarketplaceRecommendations,
  loadCatalogAssets,
  sortCatalogAssetsForWorkspace
} from "@/features/catalog/server";
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
    sourcePath: ".prd/_template/feature/product-ui.template.md",
    files: [".prd/_template/feature/product-ui.template.md"],
    version: "1.0.0"
  },
  {
    id: "skill-spec-to-test",
    type: "skill",
    title: "Spec to Test Skill",
    summary: "Independent Test Specs from approved Feature Specs.",
    direction: "frontend",
    categories: ["frontend", "operations"],
    stacks: ["react"],
    tags: ["skill", "config"],
    appliesTo: ["frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "skills/developer/spec-to-test/SKILL.md",
    files: ["skills/developer/spec-to-test/SKILL.md"],
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
    sourcePath: "assets/skills/ddd-layering-governance/SKILL.md",
    files: [
      "skills/developer/ddd-layering-governance/SKILL.md",
      "skills/developer/ddd-layering-governance/references/layering-rules.md"
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
    const result = filterCatalogAssets(assets, { query: "skills/developer/spec-to-test" });

    expect(result.map((asset) => asset.id)).toEqual(["skill-spec-to-test"]);
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
        sourcePath: "assets/skills/go-backend-governance/SKILL.md",
        files: ["skills/developer/go-backend-governance/SKILL.md"],
        version: "1.0.0"
      }
    ];

    const result = filterCatalogAssets(localizedAssets, { query: "总入口" });

    expect(result.map((asset) => asset.id)).toEqual(["skill-go-backend-governance"]);
  });

  it("filters catalog assets by shared business category", () => {
    const result = filterCatalogAssets(assets, { categories: ["operations"] });

    expect(result.map((asset) => asset.id)).toEqual(["skill-spec-to-test", "team-governance-pack"]);
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
  it("loads skill assets from the shared asset directory", async () => {
    const catalog = await loadCatalogAssets();
    const skill = catalog.find((asset) => asset.id === "skill-ddd-layering-governance");

    expect(skill?.type).toBe("skill");
    expect(skill?.sourcePath).toBe("assets/skills/ddd-layering-governance/SKILL.md");
  });

  it("loads spec and agent template assets from directory-backed manifests", async () => {
    const catalog = await loadCatalogAssets();
    const specTemplate = catalog.find((asset) => asset.id === "template-feature-draft");
    const modesTemplate = catalog.find((asset) => asset.id === "template-project-modes");
    const currentTemplate = catalog.find((asset) => asset.id === "template-current-workspace");
    const agentTemplate = catalog.find((asset) => asset.id === "agent-spec-editor");
    const productArchitectAgent = catalog.find((asset) => asset.id === "agent-product-architect");
    const frontendAgent = catalog.find((asset) => asset.id === "agent-frontend");
    const backendAgent = catalog.find((asset) => asset.id === "agent-backend");
    const qaAgent = catalog.find((asset) => asset.id === "agent-qa");
    const specEditorAgent = catalog.find((asset) => asset.id === "agent-spec-editor");
    const productArchitectSkill = catalog.find((asset) => asset.id === "skill-product-architect");
    const specBlueprintTemplate = catalog.find((asset) => asset.id === "template-spec-blueprint-yaml");
    const taskGraphTemplate = catalog.find((asset) => asset.id === "template-task-graph-yaml");
    const prdTemplate = catalog.find((asset) => asset.id === "template-prd-draft");
    const productSpecTemplate = catalog.find((asset) => asset.id === "template-product-spec-yaml");
    const testSpecTemplate = catalog.find((asset) => asset.id === "template-test-spec");

    expect(testSpecTemplate?.type).toBe("spec_template");
    expect(testSpecTemplate?.sourcePath).toBe("assets/templates/specs/template-test-spec/test-spec.md");
    expect(testSpecTemplate?.files).toEqual([".features/_template/feature/test-spec.example.md"]);
    expect(testSpecTemplate?.contentFiles?.[".features/_template/feature/test-spec.example.md"]).toBe(
      "assets/templates/specs/template-test-spec/test-spec.md",
    );
    expect(testSpecTemplate?.dependsOn).toEqual(
      expect.arrayContaining(["template-feature-spec", "skill-spec-to-test"]),
    );

    expect(specTemplate?.sourcePath).toBe(
      "assets/templates/specs/template-feature-draft/product-ui.template.md",
    );
    expect(specTemplate?.files).toEqual([".prd/_template/feature/product-ui.template.md"]);
    expect(specTemplate?.contentFiles?.[".prd/_template/feature/product-ui.template.md"]).toBe(
      "assets/templates/specs/template-feature-draft/product-ui.template.md"
    );
    expect(modesTemplate?.files).toEqual([
      "docs/spec-modes/README.md",
      "docs/spec-modes/LiteSpec/README.md",
      "docs/spec-modes/GoalSpec/README.md",
      "docs/spec-modes/EnterpriseSpec/README.md"
    ]);
    expect(modesTemplate?.contentFiles?.["docs/spec-modes/LiteSpec/README.md"]).toBe(
      "assets/templates/specs/template-project-modes/LiteSpec.md"
    );
    expect(currentTemplate?.files).toContain("current/project-status.md");
    expect(currentTemplate?.contentFiles?.["current/handoff.md"]).toBe(
      "assets/templates/specs/template-current-workspace/handoff.md"
    );
    expect(agentTemplate?.sourcePath).toBe(
      "assets/agents/roles/agent-spec-editor/spec-editor.md"
    );
    expect(agentTemplate?.files).toEqual(["ai/agents/spec-editor.md"]);

    expect(productArchitectAgent?.type).toBe("agent_role");
    expect(productArchitectAgent?.dependsOn).toEqual(
      expect.arrayContaining([
        "skill-product-architect",
        "agent-frontend",
        "agent-backend",
        "agent-qa",
        "template-spec-blueprint-yaml",
        "template-task-graph-yaml",
        "template-prd-draft",
        "template-product-spec-yaml",
        "template-feature-draft"
      ])
    );
    expect(productArchitectSkill?.sourcePath).toBe(
      "assets/skills/product-architect/SKILL.md"
    );
    expect(productArchitectSkill?.dependsOn).toEqual(
      expect.arrayContaining([
        "template-spec-blueprint-yaml",
        "template-task-graph-yaml",
        "template-prd-draft",
        "template-product-spec-yaml",
        "template-feature-draft"
      ])
    );
    expect(specEditorAgent?.dependsOn).toEqual(
      expect.arrayContaining(["template-feature-draft", "template-task-graph-yaml"])
    );
    expect(specBlueprintTemplate?.contentFiles?.[".prd/_template/product/spec-blueprint.template.yaml"]).toBe(
      "assets/templates/specs/template-spec-blueprint-yaml/spec-blueprint.template.yaml"
    );
    expect(taskGraphTemplate?.contentFiles?.[".issues/task-graph.yaml"]).toBe(
      "assets/templates/specs/template-task-graph-yaml/task-graph.template.yaml"
    );
    expect(prdTemplate?.contentFiles?.[".prd/_template/product/prd-draft.template.md"]).toBe(
      "assets/templates/specs/template-prd-draft/prd-draft.template.md"
    );
    expect(productSpecTemplate?.contentFiles?.[".prd/_template/product/product-spec.template.yaml"]).toBe(
      "assets/templates/specs/template-product-spec-yaml/product-spec.template.yaml"
    );
    expect(frontendAgent?.contentFiles?.["ai/agents/frontend-agent.md"]).toBe(
      "assets/agents/roles/agent-frontend/frontend-agent.md"
    );
    expect(backendAgent?.contentFiles?.["ai/agents/backend-agent.md"]).toBe(
      "assets/agents/roles/agent-backend/backend-agent.md"
    );
    expect(qaAgent?.contentFiles?.["ai/agents/qa-agent.md"]).toBe(
      "assets/agents/roles/agent-qa/qa-agent.md"
    );
  });

  it("keeps Product Architect templates aligned with required sections and fields", async () => {
    const catalog = await loadCatalogAssets();
    const specBlueprintTemplate = catalog.find((asset) => asset.id === "template-spec-blueprint-yaml");
    const taskGraphTemplate = catalog.find((asset) => asset.id === "template-task-graph-yaml");
    const prdTemplate = catalog.find((asset) => asset.id === "template-prd-draft");
    const productSpecTemplate = catalog.find((asset) => asset.id === "template-product-spec-yaml");
    const featureTemplate = catalog.find((asset) => asset.id === "template-feature-draft");

    expect(specBlueprintTemplate?.draftHints?.join(" ")).toEqual(
      expect.stringContaining("Product、Architecture、Database、API 和 UI")
    );
    expect(specBlueprintTemplate?.sampleOutput).toContain("Task Graph IR");
    expect(taskGraphTemplate?.sampleOutput).toContain("sourceSpecRefs");
    expect(taskGraphTemplate?.draftHints?.join(" ")).toEqual(
      expect.stringContaining("Canonical Spec")
    );
    expect(prdTemplate?.sampleOutput).toContain("PRD");
    expect(prdTemplate?.draftHints?.join(" ")).toEqual(
      expect.stringContaining("背景、目标、用户画像、用户故事、功能列表、业务流程、边界条件、风险和里程碑")
    );
    expect(productSpecTemplate?.draftHints?.join(" ")).toEqual(
      expect.stringContaining("product、actors、flows、constraints、apis、data、risks 和 acceptance")
    );
    expect(featureTemplate?.sampleOutput).toContain("接口、数据库、埋点、异常情况和验收标准");
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
      "assets/agents/roles/agent-go-pack-orchestrator/orchestrator.md"
    );
    expect(orchestratorAgent?.files).toEqual(["ai/agents/orchestrator.md"]);
    expect(orchestratorAgent?.contentFiles?.["ai/agents/orchestrator.md"]).toBe(
      "assets/agents/roles/agent-go-pack-orchestrator/orchestrator.md"
    );

    expect(apiGovernanceSkill?.type).toBe("skill");
    expect(apiGovernanceSkill?.sourcePath).toBe(
      "assets/skills/api-contract-governance/SKILL.md"
    );
    expect(apiGovernanceSkill?.files).toContain(
      "skills/developer/api-contract-governance/references/api-contract-rules.md"
    );
    expect(apiGovernanceSkill?.categories).toEqual(["backend"]);
    expect(apiGovernanceSkill?.summaryZh).toContain("接口契约治理");

    expect(backendGovernanceSkill?.type).toBe("skill");
    expect(backendGovernanceSkill?.sourcePath).toBe(
      "assets/skills/go-backend-governance/SKILL.md"
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
      "assets/skills/go-time-governance/SKILL.md"
    );
    expect(timeGovernanceSkill?.files).toContain(
      "skills/developer/go-time-governance/references/clock-and-business-time.md"
    );
    expect(timeGovernanceSkill?.categories).toEqual(["backend"]);
    expect(timeGovernanceSkill?.summaryZh).toContain("时间治理");

    expect(routingTemplate?.type).toBe("spec_template");
    expect(routingTemplate?.sourcePath).toBe(
      "assets/templates/specs/template-go-pack-routing/routing.md"
    );
    expect(routingTemplate?.files).toEqual(["ai/templates/routing.md"]);
  });

  it("loads the Go engineering pack from its dedicated pack directory", async () => {
    const catalog = await loadCatalogAssets();
    const engineeringPack = catalog.find((asset) => asset.id === "engineering-pack-go");

    expect(engineeringPack?.type).toBe("engineering_pack");
    expect(engineeringPack?.sourcePath).toBe(
      "assets/engineering-packs/go/constraints/go-engineering-base-2026.md"
    );
    expect(engineeringPack?.files).toContain("rules/go-engineering-base-2026.md");
    expect(engineeringPack?.contentFiles?.["rules/go-engineering-base-2026.md"]).toBe(
      "assets/engineering-packs/go/constraints/go-engineering-base-2026.md"
    );
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
      "skill-spec-to-test"
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
          prdTemplateId: "template-react-feature",
          prdPath: "spec-web-ui/workspace/projects/rewards-platform/prd.md",
          exportTargets: ["docs/", "current/", "rules/", ".features/_template/", "ai/agents/", "agent-teams/", "project-manifest.yaml"]
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

    expect(featured.map((asset) => asset.id)).toEqual(["agent-openapi", "skill-spec-to-test"]);
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
