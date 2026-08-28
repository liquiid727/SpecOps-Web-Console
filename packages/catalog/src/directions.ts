import type {
  CatalogAsset,
  CatalogAssetType,
  CatalogDirectionGroup,
  CatalogDirectionGroupDefinition,
  CatalogDirectionManifest
} from "./types.js";

export const catalogDirectionGroups: CatalogDirectionGroup[] = [
  "product",
  "business",
  "frontend",
  "backend",
  "operations",
  "qa"
];

type DirectionAssetKey = "agents" | "rules" | "skills";

const directionAssetTypes: Record<DirectionAssetKey, CatalogAssetType> = {
  agents: "agent_role",
  rules: "rule",
  skills: "skill"
};

function isDirectionGroup(value: string): value is CatalogDirectionGroup {
  return catalogDirectionGroups.includes(value as CatalogDirectionGroup);
}

function assertAssetList(
  direction: CatalogDirectionGroup,
  key: keyof CatalogDirectionGroupDefinition,
  value: unknown
): asserts value is string[] {
  if (!Array.isArray(value) || value.some((assetId) => typeof assetId !== "string" || !assetId.trim())) {
    throw new Error(`Invalid direction manifest: ${direction}.${key} must be a list of asset IDs`);
  }
}

export function validateCatalogDirectionManifest(
  manifest: CatalogDirectionManifest,
  assets: CatalogAsset[]
) {
  if (!manifest || manifest.version !== 1 || !manifest.directions || typeof manifest.directions !== "object") {
    throw new Error("Invalid direction manifest: expected version 1 and directions");
  }

  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  for (const direction of catalogDirectionGroups) {
    const definition = manifest.directions[direction];

    if (!definition || typeof definition.label !== "string" || typeof definition.description !== "string") {
      throw new Error(`Invalid direction manifest: missing ${direction} label or description`);
    }

    for (const key of ["agents", "rules", "skills"] as const) {
      assertAssetList(direction, key, definition[key]);

      const expectedType = directionAssetTypes[key];
      for (const assetId of definition[key]) {
        const asset = assetMap.get(assetId);

        if (!asset) {
          throw new Error(`Invalid direction manifest: ${direction}.${key} references unknown asset ${assetId}`);
        }

        if (asset.type !== expectedType) {
          throw new Error(
            `Invalid direction manifest: ${assetId} is ${asset.type}, expected ${expectedType} in ${direction}.${key}`
          );
        }
      }
    }
  }
}

export function applyCatalogDirectionManifest(
  assets: CatalogAsset[],
  manifest: CatalogDirectionManifest
) {
  validateCatalogDirectionManifest(manifest, assets);

  const groupsByAssetId = new Map<string, CatalogDirectionGroup[]>();

  for (const direction of catalogDirectionGroups) {
    const definition = manifest.directions[direction];

    for (const assetId of [...definition.agents, ...definition.rules, ...definition.skills]) {
      const groups = groupsByAssetId.get(assetId) ?? [];
      groups.push(direction);
      groupsByAssetId.set(assetId, groups);
    }
  }

  return assets.map((asset) => ({
    ...asset,
    directionGroups: groupsByAssetId.get(asset.id) ?? []
  }));
}

export function getCatalogDirectionOptions(assets: CatalogAsset[]) {
  const activeGroups = new Set(assets.flatMap((asset) => asset.directionGroups ?? []));

  return catalogDirectionGroups.filter((direction) => activeGroups.has(direction));
}
