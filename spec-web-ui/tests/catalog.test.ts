import { describe, expect, it } from "vitest";

import {
  buildCatalogComparison,
  filterCatalogAssets,
  getCatalogFilterOptions,
  getFeaturedAssets,
  getMarketplaceRecommendations,
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
    expect(filterCatalogAssets(assets, {})).toHaveLength(5);
  });

  it("matches source paths while searching catalog assets", () => {
    const result = filterCatalogAssets(assets, { query: ".skills/tool-config-ui" });

    expect(result.map((asset) => asset.id)).toEqual(["skill-tool-config-ui"]);
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
      tags: ["api", "auth", "ci", "config", "errors", "openapi", "react", "routing", "skill", "team", "ui"],
      types: ["agent_role", "agent_team", "rule", "skill", "spec_template"]
    });
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
      limit: 1
    });

    expect(recommendations.map((asset) => asset.id)).toEqual(["agent-openapi"]);
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
          exportTargets: ["rules/", "specs/_template/", "ai/agents/", "agent-teams/", "project-manifest.yaml"]
        },
        selectedAssets: assets.filter((asset) => asset.id !== "agent-openapi"),
        missingDependencies: [],
        conflicts: [],
        recommendedAssets: []
      },
      assets.find((asset) => asset.id === "agent-openapi")!
    );

    expect(preview.selectedAssetCount).toBe(5);
    expect(preview.exportDirectories).toEqual(["ai"]);
    expect(preview.remainingMissingDependencies).toEqual([]);
  });
});

describe("getFeaturedAssets", () => {
  it("surfaces a small featured set with strong stack and tag signals", () => {
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
