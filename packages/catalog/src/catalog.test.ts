import { describe, expect, it } from "vitest";
import catalogAssets from "../config/catalog-assets.json";

import {
  applyCatalogDirectionManifest,
  filterCatalogAssets,
  getCatalogDirectionOptions,
  getWorkspaceAssetState,
  validateCatalogDirectionManifest
} from "./index.js";
import type { CatalogAsset, CatalogDirectionManifest } from "./types.js";

const asset: CatalogAsset = {
  id: "team-example",
  type: "agent_team",
  title: "Example Team",
  summary: "Reusable team",
  direction: "fullstack",
  categories: ["operations"],
  stacks: ["go"],
  tags: ["team"],
  appliesTo: ["backend"],
  dependsOn: [],
  conflictsWith: [],
  sourcePath: "assets/agents/teams/example/README.md",
  files: ["agent-teams/example/README.md"],
  version: "1.0.0"
};

describe("catalog interface", () => {
  it("ships only GoalSpec template assets", () => {
    const templates = (catalogAssets as CatalogAsset[]).filter((asset) => asset.type === "spec_template");
    const ids = templates.map((asset) => asset.id);

    expect(ids).toContain("template-requirement-workspace");
    expect(ids).toContain("template-spec-package");
    expect(ids).toContain("template-issue");
    expect(ids).not.toEqual(expect.arrayContaining([
      "template-feature-draft",
      "template-feature-spec",
      "template-test-spec"
    ]));
    expect(templates.flatMap((asset) => Object.keys(asset.contentFiles ?? {}))).toEqual(
      expect.arrayContaining([
        ".requirements/templates/prd.md",
        ".requirements/templates/spec-package/spec.md",
        ".requirements/templates/spec-package/issues/ISSUE-R001-S01-001-example.md"
      ])
    );
  });
  it("filters assets without application dependencies", () => {
    expect(filterCatalogAssets([asset], { query: "example", types: ["agent_team"] })).toEqual([asset]);
  });

  it("applies a validated direction manifest and filters by direction group", () => {
    const agentAsset: CatalogAsset = { ...asset, id: "agent-example", type: "agent_role" };
    const directionManifest: CatalogDirectionManifest = {
      version: 1,
      directions: {
        product: { label: "产品", description: "", agents: [], rules: [], skills: [] },
        business: { label: "商业", description: "", agents: [], rules: [], skills: [] },
        frontend: { label: "前端", description: "", agents: [], rules: [], skills: [] },
        backend: { label: "后端", description: "", agents: [], rules: [], skills: [] },
        operations: { label: "运维", description: "", agents: [], rules: [], skills: [] },
        qa: { label: "测试 / QA", description: "", agents: [], rules: [], skills: [] }
      }
    };
    directionManifest.directions.operations.agents = [agentAsset.id];
    const classifiedAssets = applyCatalogDirectionManifest([agentAsset], directionManifest);

    expect(classifiedAssets[0].directionGroups).toEqual(["operations"]);
    expect(filterCatalogAssets(classifiedAssets, { directionGroups: ["operations"] })).toEqual(classifiedAssets);
    expect(getCatalogDirectionOptions(classifiedAssets)).toEqual(["operations"]);
  });

  it("rejects direction references to missing or mismatched asset types", () => {
    const invalidManifest = {
      version: 1,
      directions: {
        product: { label: "产品", description: "", agents: ["missing-agent"], rules: [], skills: [] },
        business: { label: "商业", description: "", agents: [], rules: [], skills: [] },
        frontend: { label: "前端", description: "", agents: [], rules: [], skills: [] },
        backend: { label: "后端", description: "", agents: [], rules: [], skills: [] },
        operations: { label: "运维", description: "", agents: [], rules: [], skills: [] },
        qa: { label: "测试 / QA", description: "", agents: [], rules: [], skills: [] }
      }
    } as CatalogDirectionManifest;

    expect(() => validateCatalogDirectionManifest(invalidManifest, [asset])).toThrow("unknown asset missing-agent");
    invalidManifest.directions.product.agents = [asset.id];
    expect(() => validateCatalogDirectionManifest(invalidManifest, [asset])).toThrow("expected agent_role");
  });

  it("prioritizes selected workspace assets", () => {
    expect(
      getWorkspaceAssetState(asset, {
        selectedAssetIds: [asset.id],
        requiredAssetIds: [],
        recommendedAssetIds: [],
        conflictingAssetIds: []
      })
    ).toBe("selected");
  });
});
