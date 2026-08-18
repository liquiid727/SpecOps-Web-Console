import { describe, expect, it } from "vitest";

import { filterCatalogAssets, getWorkspaceAssetState } from "./index.js";
import type { CatalogAsset } from "./types.js";

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
  it("filters assets without application dependencies", () => {
    expect(filterCatalogAssets([asset], { query: "example", types: ["agent_team"] })).toEqual([asset]);
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
