import fs from "node:fs/promises";
import path from "node:path";

export {
  buildCatalogComparison,
  filterCatalogAssets,
  getCatalogFilterOptions,
  getFeaturedAssets,
  getMarketplaceRecommendations,
  getWorkspaceAssetState,
  sortCatalogAssetsForWorkspace
} from "@specos/catalog";
import type { CatalogAsset } from "@/lib/types";
import { ensureRelativeRepoPath, repoRoot } from "@/lib/server-paths";

const catalogRegistryPath = path.join(repoRoot, "packages", "catalog", "config", "catalog-assets.json");
const catalogDirectories = [
  path.join(repoRoot, "assets", "templates", "specs"),
  path.join(repoRoot, "assets", "agents", "roles"),
  path.join(repoRoot, "assets", "skills")
];

async function readCatalogAssetsFromDirectory(directoryPath: string) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const assetPath = path.join(directoryPath, entry.name, "asset.json");

        try {
          const raw = await fs.readFile(assetPath, "utf8");
          return JSON.parse(raw) as CatalogAsset;
        } catch (error) {
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            return null;
          }

          throw error;
        }
      })
  );

  return manifests.filter((asset): asset is CatalogAsset => Boolean(asset));
}

export async function loadCatalogAssets() {
  const raw = await fs.readFile(catalogRegistryPath, "utf8");
  const registryCatalog = JSON.parse(raw) as CatalogAsset[];
  const directoryCatalogs = await Promise.all(catalogDirectories.map(readCatalogAssetsFromDirectory));
  const catalog = [...registryCatalog, ...directoryCatalogs.flat()];
  const assetMap = new Map<string, CatalogAsset>();

  for (const asset of catalog) {
    assetMap.set(asset.id, asset);
  }

  return [...assetMap.values()].sort((left, right) => left.title.localeCompare(right.title));
}

export async function loadCatalogAsset(assetId: string) {
  const assets = await loadCatalogAssets();

  return assets.find((asset) => asset.id === assetId) ?? null;
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
