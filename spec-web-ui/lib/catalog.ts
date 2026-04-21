import fs from "node:fs/promises";
import path from "node:path";

import type { CatalogAsset, CatalogFilterOptions, CatalogFilters } from "@/lib/types";
import { appRoot, ensureRelativeRepoPath } from "@/lib/server-paths";
import { sortStrings, uniq } from "@/lib/utils";

const catalogRegistryPath = path.join(appRoot, "catalog", "catalog-assets.json");

export async function loadCatalogAssets() {
  const raw = await fs.readFile(catalogRegistryPath, "utf8");
  const catalog = JSON.parse(raw) as CatalogAsset[];

  return catalog.sort((left, right) => left.title.localeCompare(right.title));
}

export async function loadCatalogAsset(assetId: string) {
  const assets = await loadCatalogAssets();

  return assets.find((asset) => asset.id === assetId) ?? null;
}

export function filterCatalogAssets(assets: CatalogAsset[], filters: CatalogFilters) {
  const query = filters.query?.trim().toLowerCase();

  return assets.filter((asset) => {
    if (query) {
      const haystacks = [
        asset.title,
        asset.summary,
        asset.id,
        ...asset.tags,
        ...asset.stacks
      ]
        .join(" ")
        .toLowerCase();

      if (!haystacks.includes(query)) {
        return false;
      }
    }

    if (filters.types?.length && !filters.types.includes(asset.type)) {
      return false;
    }

    if (filters.directions?.length && !filters.directions.includes(asset.direction)) {
      return false;
    }

    if (filters.stacks?.length && !filters.stacks.every((stack) => asset.stacks.includes(stack))) {
      return false;
    }

    if (filters.tags?.length && !filters.tags.every((tag) => asset.tags.includes(tag))) {
      return false;
    }

    return true;
  });
}

export function getCatalogFilterOptions(assets: CatalogAsset[]): CatalogFilterOptions {
  return {
    directions: sortStrings(uniq(assets.map((asset) => asset.direction))) as CatalogFilterOptions["directions"],
    stacks: sortStrings(uniq(assets.flatMap((asset) => asset.stacks))),
    tags: sortStrings(uniq(assets.flatMap((asset) => asset.tags))),
    types: sortStrings(uniq(assets.map((asset) => asset.type))) as CatalogFilterOptions["types"]
  };
}

export function getWorkspaceAssetState(
  asset: CatalogAsset,
  workspaceContext?: {
    selectedAssetIds: string[];
    requiredAssetIds: string[];
    recommendedAssetIds: string[];
    conflictingAssetIds: string[];
  }
) {
  if (!workspaceContext) {
    return "available" as const;
  }

  if (workspaceContext.selectedAssetIds.includes(asset.id)) {
    return "selected" as const;
  }

  if (workspaceContext.requiredAssetIds.includes(asset.id)) {
    return "required" as const;
  }

  if (workspaceContext.recommendedAssetIds.includes(asset.id)) {
    return "recommended" as const;
  }

  if (workspaceContext.conflictingAssetIds.includes(asset.id)) {
    return "conflict" as const;
  }

  return "available" as const;
}

export function sortCatalogAssetsForWorkspace(
  assets: CatalogAsset[],
  workspaceContext?: {
    selectedAssetIds: string[];
    requiredAssetIds: string[];
    recommendedAssetIds: string[];
    conflictingAssetIds: string[];
  }
) {
  const priority: Record<ReturnType<typeof getWorkspaceAssetState>, number> = {
    selected: 0,
    required: 1,
    recommended: 2,
    conflict: 3,
    available: 4
  };

  return [...assets].sort((left, right) => {
    const leftPriority = priority[getWorkspaceAssetState(left, workspaceContext)];
    const rightPriority = priority[getWorkspaceAssetState(right, workspaceContext)];

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.title.localeCompare(right.title);
  });
}

export function getMarketplaceRecommendations(
  assets: CatalogAsset[],
  context?: {
    activeStacks?: string[];
    selectedAssetIds?: string[];
    limit?: number;
  }
) {
  const selectedIds = new Set(context?.selectedAssetIds ?? []);
  const activeStacks = context?.activeStacks ?? [];
  const limit = context?.limit ?? 3;

  return [...assets]
    .filter((asset) => !selectedIds.has(asset.id))
    .map((asset) => ({
      asset,
      score:
        (asset.stacks.some((stack) => activeStacks.includes(stack)) ? 3 : 0) +
        (asset.type === "rule" ? 1 : 0) +
        Math.min(asset.dependsOn.length, 2)
    }))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.asset.title.localeCompare(right.asset.title);
    })
    .slice(0, limit)
    .map((entry) => entry.asset);
}

export function getFeaturedAssets(
  assets: CatalogAsset[],
  context?: {
    limit?: number;
    preferredTags?: string[];
  }
) {
  const preferredTags = context?.preferredTags ?? [];
  const limit = context?.limit ?? 4;

  return [...assets]
    .map((asset) => ({
      asset,
      score:
        preferredTags.filter((tag) => asset.tags.includes(tag)).length * 3 +
        (asset.type === "agent_role" ? 2 : asset.type === "spec_template" ? 1 : 0) +
        asset.stacks.length
    }))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.asset.title.localeCompare(right.asset.title);
    })
    .slice(0, limit)
    .map((entry) => entry.asset);
}

export function buildCatalogComparison(assets: CatalogAsset[], assetIds: string[]) {
  const selectedAssets = assetIds
    .map((assetId) => assets.find((asset) => asset.id === assetId))
    .filter((asset): asset is CatalogAsset => Boolean(asset));

  const sharedStacks = uniq(
    selectedAssets.reduce<string[]>((shared, asset, index) => {
      if (index === 0) {
        return [...asset.stacks];
      }

      return shared.filter((stack) => asset.stacks.includes(stack));
    }, [])
  ).sort((left, right) => left.localeCompare(right));

  const exportDirectories = uniq(
    selectedAssets.flatMap((asset) => asset.files.map((file) => file.split("/")[0]))
  ).sort((left, right) => left.localeCompare(right));

  return {
    assets: selectedAssets,
    sharedStacks,
    exportDirectories
  };
}

export async function loadAssetSourcePreview(asset: CatalogAsset) {
  const absolutePath = ensureRelativeRepoPath(asset.sourcePath);
  const content = await fs.readFile(absolutePath, "utf8");

  return content.split("\n").slice(0, 28).join("\n");
}

export async function loadAssetFilePreview(relativePath: string) {
  const absolutePath = ensureRelativeRepoPath(relativePath);
  return fs.readFile(absolutePath, "utf8");
}
