import { describe, expect, it } from "vitest";

import * as discover from "@/features/catalog/preferences";
import type { CatalogAsset, DiscoverPreferences, PresetBundle } from "@/lib/types";

const catalog: CatalogAsset[] = [
  {
    id: "rule-go-backend",
    type: "rule",
    title: "Go Backend Governance",
    summary: "Shared backend delivery rules for Go services.",
    direction: "backend",
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
    id: "team-governance-pack",
    type: "agent_team",
    title: "Governance Team Pack",
    summary: "Reusable team-level governance pack.",
    direction: "fullstack",
    stacks: ["go", "react"],
    tags: ["team", "governance"],
    appliesTo: ["backend", "frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "agent-teams/governance-pack/README.md",
    files: ["agent-teams/governance-pack/README.md"],
    version: "1.0.0"
  },
  {
    id: "skill-spec-to-test",
    type: "skill",
    title: "Spec to Test Skill",
    summary: "Independent Test Specs from approved Feature Specs.",
    direction: "frontend",
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
    id: "agent-openapi",
    type: "agent_role",
    title: "OpenAPI Agent",
    summary: "Produces API contracts and aligns them with spec output.",
    direction: "fullstack",
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

describe("toggleFavoriteAssetIds", () => {
  it("adds and removes favorites deterministically", () => {
    expect(discover.toggleFavoriteAssetIds(["rule-go-backend"], "agent-openapi")).toEqual([
      "agent-openapi",
      "rule-go-backend"
    ]);
    expect(discover.toggleFavoriteAssetIds(["agent-openapi", "rule-go-backend"], "agent-openapi")).toEqual([
      "rule-go-backend"
    ]);
  });
});

describe("createSavedCompareSet", () => {
  it("creates a named compare combination tied to a project", () => {
    const compareSet = discover.createSavedCompareSet({
      assetIds: ["rule-go-backend", "agent-openapi"],
      projectId: "reward-engine",
      name: "",
      catalog,
      nowIso: "2026-04-18T14:00:00.000Z"
    });

    expect(compareSet.projectId).toBe("reward-engine");
    expect(compareSet.assetIds).toEqual(["agent-openapi", "rule-go-backend"]);
    expect(compareSet.name).toBe("Go Backend Governance + OpenAPI Agent");
  });
});

describe("buildPresetBundlePreview", () => {
  it("summarizes preset bundle contents by asset type and directory", () => {
    const preset: PresetBundle = {
      id: "backend-starter",
      title: "Backend Starter",
      summary: "Rule, template, and contract starter bundle.",
      assetIds: ["rule-go-backend", "agent-openapi", "template-react-feature"],
      projectTypes: ["backend", "mixed"]
    };

    const preview = discover.buildPresetBundlePreview(preset, catalog);

    expect(preview.assetCount).toBe(3);
    expect(preview.assetTypeCounts).toEqual({
        agent_role: 1,
        agent_team: 0,
        engineering_pack: 0,
        rule: 1,
        skill: 0,
        spec_template: 1
    });
    expect(preview.exportDirectories).toEqual([".prd", "ai", "rules"]);
  });
});

describe("normalizeDiscoverPreferences", () => {
  it("upgrades older favoriteAssetIds into richer favorite entries", () => {
    const normalized = discover.normalizeDiscoverPreferences({
      favoriteAssetIds: ["rule-go-backend"],
      compareSets: []
    });

    expect(normalized).toEqual({
      favoriteEntries: [{ assetId: "rule-go-backend" }],
      compareSets: [],
      presetDisplays: []
    });
  });
});

describe("favorite and compare management helpers", () => {
  const preferences: DiscoverPreferences = {
    favoriteEntries: [
      { assetId: "rule-go-backend", label: "Backend rules" },
      { assetId: "agent-openapi" }
    ],
    compareSets: [
      {
        id: "compare-a",
        name: "A",
        assetIds: ["rule-go-backend", "agent-openapi"],
        projectId: "reward-engine",
        createdAt: "2026-04-18T14:00:00.000Z"
      },
      {
        id: "compare-b",
        name: "B",
        assetIds: ["template-react-feature", "agent-openapi"],
        projectId: "merchant-console",
        createdAt: "2026-04-18T14:10:00.000Z"
      }
    ],
    presetDisplays: [
      { presetId: "backend-api-starter", label: "Backend API Starter" },
      { presetId: "ui-handoff-starter" }
    ]
  };

  it("renames, removes, and reorders favorite entries", () => {
    expect(discover.renameFavoriteEntry(preferences, "agent-openapi", "API contract helper").favoriteEntries).toEqual([
      { assetId: "rule-go-backend", label: "Backend rules" },
      { assetId: "agent-openapi", label: "API contract helper" }
    ]);

    expect(discover.reorderFavoriteEntries(preferences, "agent-openapi", "up").favoriteEntries.map((entry) => entry.assetId)).toEqual([
      "agent-openapi",
      "rule-go-backend"
    ]);
  });

  it("renames, removes, and reorders compare sets", () => {
    expect(discover.renameCompareSet(preferences, "compare-a", "Backend compare").compareSets[0].name).toBe(
      "Backend compare"
    );
    expect(discover.removeCompareSet(preferences, "compare-b").compareSets).toHaveLength(1);
    expect(discover.reorderCompareSets(preferences, "compare-b", "up").compareSets.map((set) => set.id)).toEqual([
      "compare-b",
      "compare-a"
    ]);
  });

  it("renames and reorders preset display overrides", () => {
    expect(
      discover.renamePresetDisplay(preferences, "ui-handoff-starter", "UI Handoff Favorite").presetDisplays
    ).toEqual([
      { presetId: "backend-api-starter", label: "Backend API Starter" },
      { presetId: "ui-handoff-starter", label: "UI Handoff Favorite" }
    ]);
    expect(discover.reorderPresetDisplays(preferences, "ui-handoff-starter", "up").presetDisplays.map((entry) => entry.presetId)).toEqual([
      "ui-handoff-starter",
      "backend-api-starter"
    ]);
  });

  it("supports batch cleanup and promote actions across favorites, compare sets, and presets", () => {
    const removeFavoriteEntries = (discover as Record<string, unknown>).removeFavoriteEntries as
      | ((prefs: DiscoverPreferences, assetIds: string[]) => DiscoverPreferences)
      | undefined;
    const moveFavoriteEntriesToFront = (discover as Record<string, unknown>).moveFavoriteEntriesToFront as
      | ((prefs: DiscoverPreferences, assetIds: string[]) => DiscoverPreferences)
      | undefined;
    const removeCompareSets = (discover as Record<string, unknown>).removeCompareSets as
      | ((prefs: DiscoverPreferences, compareSetIds: string[]) => DiscoverPreferences)
      | undefined;
    const moveCompareSetsToFront = (discover as Record<string, unknown>).moveCompareSetsToFront as
      | ((prefs: DiscoverPreferences, compareSetIds: string[]) => DiscoverPreferences)
      | undefined;
    const movePresetDisplaysToFront = (discover as Record<string, unknown>).movePresetDisplaysToFront as
      | ((prefs: DiscoverPreferences, presetIds: string[]) => DiscoverPreferences)
      | undefined;
    const setPresetDisplaysHiddenBatch = (discover as Record<string, unknown>).setPresetDisplaysHiddenBatch as
      | ((prefs: DiscoverPreferences, presetIds: string[], hidden: boolean) => DiscoverPreferences)
      | undefined;

    expect(typeof removeFavoriteEntries).toBe("function");
    expect(typeof moveFavoriteEntriesToFront).toBe("function");
    expect(typeof removeCompareSets).toBe("function");
    expect(typeof moveCompareSetsToFront).toBe("function");
    expect(typeof movePresetDisplaysToFront).toBe("function");
    expect(typeof setPresetDisplaysHiddenBatch).toBe("function");

    expect(removeFavoriteEntries?.(preferences, ["agent-openapi"]).favoriteEntries).toEqual([
      { assetId: "rule-go-backend", label: "Backend rules" }
    ]);
    expect(
      moveFavoriteEntriesToFront?.(preferences, ["agent-openapi"]).favoriteEntries.map((entry) => entry.assetId)
    ).toEqual(["agent-openapi", "rule-go-backend"]);
    expect(removeCompareSets?.(preferences, ["compare-a"]).compareSets.map((set) => set.id)).toEqual([
      "compare-b"
    ]);
    expect(moveCompareSetsToFront?.(preferences, ["compare-b"]).compareSets.map((set) => set.id)).toEqual([
      "compare-b",
      "compare-a"
    ]);
    expect(
      movePresetDisplaysToFront?.(preferences, ["ui-handoff-starter"]).presetDisplays.map((entry) => entry.presetId)
    ).toEqual(["ui-handoff-starter", "backend-api-starter"]);
    expect(
      setPresetDisplaysHiddenBatch?.(preferences, ["backend-api-starter", "ui-handoff-starter"], true).presetDisplays
    ).toEqual([
      { presetId: "backend-api-starter", label: "Backend API Starter", hidden: true },
      { presetId: "ui-handoff-starter", hidden: true }
    ]);
  });

  it("moves favorite, compare, and preset entries before a drop target for drag sorting", () => {
    const moveFavoriteEntryBefore = (discover as Record<string, unknown>).moveFavoriteEntryBefore as
      | ((prefs: DiscoverPreferences, assetId: string, beforeAssetId: string) => DiscoverPreferences)
      | undefined;
    const moveCompareSetBefore = (discover as Record<string, unknown>).moveCompareSetBefore as
      | ((prefs: DiscoverPreferences, compareSetId: string, beforeCompareSetId: string) => DiscoverPreferences)
      | undefined;
    const movePresetDisplayBefore = (discover as Record<string, unknown>).movePresetDisplayBefore as
      | ((prefs: DiscoverPreferences, presetId: string, beforePresetId: string) => DiscoverPreferences)
      | undefined;

    expect(typeof moveFavoriteEntryBefore).toBe("function");
    expect(typeof moveCompareSetBefore).toBe("function");
    expect(typeof movePresetDisplayBefore).toBe("function");

    expect(
      moveFavoriteEntryBefore?.(preferences, "agent-openapi", "rule-go-backend").favoriteEntries.map(
        (entry) => entry.assetId
      )
    ).toEqual(["agent-openapi", "rule-go-backend"]);
    expect(
      moveCompareSetBefore?.(preferences, "compare-b", "compare-a").compareSets.map((set) => set.id)
    ).toEqual(["compare-b", "compare-a"]);
    expect(
      movePresetDisplayBefore?.(preferences, "ui-handoff-starter", "backend-api-starter").presetDisplays.map(
        (entry) => entry.presetId
      )
    ).toEqual(["ui-handoff-starter", "backend-api-starter"]);
  });

  it("builds lightweight reorder feedback with undo payload", () => {
    const buildDiscoverReorderFeedback = (discover as Record<string, unknown>).buildDiscoverReorderFeedback as
      | ((input: {
          scope: "favorites" | "compareSets" | "presets";
          label: string;
          itemId: string;
          undoBeforeId?: string;
        }) => {
          title: string;
          description: string;
          undo: {
            scope: string;
            itemId: string;
            beforeId: string;
          };
        })
      | undefined;

    expect(typeof buildDiscoverReorderFeedback).toBe("function");
    expect(
      buildDiscoverReorderFeedback?.({
        scope: "favorites",
        label: "Backend rules",
        itemId: "rule-go-backend",
        undoBeforeId: "agent-openapi"
      })
    ).toEqual({
      title: "Reordered Backend rules",
      description: "Updated inside favorites.",
      undo: {
        scope: "favorites",
        itemId: "rule-go-backend",
        beforeId: "agent-openapi"
      }
    });
  });
});
