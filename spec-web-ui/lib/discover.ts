import fs from "node:fs/promises";
import path from "node:path";

import type {
  CatalogAsset,
  DiscoverPreferences,
  PresetBundle,
  SavedCompareSet
} from "@/lib/types";
import { appRoot } from "@/lib/server-paths";
import { createSlug, uniq } from "@/lib/utils";

const preferencesDirectory = path.join(appRoot, "workspace", "preferences");
const preferencesPath = path.join(preferencesDirectory, "discover-preferences.json");
const presetBundlesPath = path.join(appRoot, "catalog", "preset-bundles.json");

const defaultPreferences: DiscoverPreferences = {
  favoriteEntries: [],
  compareSets: [],
  presetDisplays: []
};

const discoverScopeLabels = {
  compareSets: "saved compare sets",
  favorites: "favorites",
  presets: "preset bundles"
} as const;

function moveEntryBefore<T>(
  entries: T[],
  matchesEntry: (entry: T) => boolean,
  matchesTarget?: (entry: T) => boolean
) {
  const sourceIndex = entries.findIndex(matchesEntry);
  const targetIndex = matchesTarget ? entries.findIndex(matchesTarget) : -1;

  if (sourceIndex < 0) {
    return entries;
  }

  const nextEntries = [...entries];
  const [movedEntry] = nextEntries.splice(sourceIndex, 1);

  if (targetIndex < 0) {
    nextEntries.push(movedEntry);
    return nextEntries;
  }

  if (sourceIndex === targetIndex) {
    return entries;
  }

  const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  nextEntries.splice(adjustedTargetIndex, 0, movedEntry);

  return nextEntries;
}

export function normalizeDiscoverPreferences(input: Partial<DiscoverPreferences> & { favoriteAssetIds?: string[] }) {
  return {
    favoriteEntries:
      input.favoriteEntries ??
      (input.favoriteAssetIds ?? []).map((assetId) => ({
        assetId
      })),
    compareSets: input.compareSets ?? [],
    presetDisplays: input.presetDisplays ?? []
  } satisfies DiscoverPreferences;
}

export function toggleFavoriteAssetIds(assetIds: string[], assetId: string) {
  return assetIds.includes(assetId)
    ? assetIds.filter((candidate) => candidate !== assetId)
    : [...assetIds, assetId].sort((left, right) => left.localeCompare(right));
}

export function createSavedCompareSet(input: {
  assetIds: string[];
  projectId?: string;
  name?: string;
  catalog: CatalogAsset[];
  nowIso?: string;
}): SavedCompareSet {
  const normalizedAssetIds = uniq(input.assetIds);
  const assetIds = [...normalizedAssetIds].sort((left, right) => left.localeCompare(right));
  const titles = normalizedAssetIds
    .map((assetId) => input.catalog.find((asset) => asset.id === assetId)?.title)
    .filter((title): title is string => Boolean(title));
  const name = input.name?.trim() || titles.slice(0, 2).join(" + ") || "Saved compare";
  const createdAt = input.nowIso ?? new Date().toISOString();

  return {
    id: `${createSlug(name)}-${createdAt.slice(0, 10)}`,
    name,
    assetIds,
    projectId: input.projectId,
    createdAt
  };
}

export function buildPresetBundlePreview(bundle: PresetBundle, catalog: CatalogAsset[]) {
  const assets = bundle.assetIds
    .map((assetId) => catalog.find((asset) => asset.id === assetId))
    .filter((asset): asset is CatalogAsset => Boolean(asset));

  return {
    assetCount: assets.length,
    assetTypeCounts: assets.reduce<Record<CatalogAsset["type"], number>>(
      (accumulator, asset) => {
        accumulator[asset.type] = (accumulator[asset.type] ?? 0) + 1;
        return accumulator;
      },
      {
        agent_team: 0,
        agent_role: 0,
        rule: 0,
        skill: 0,
        spec_template: 0
      }
    ),
    exportDirectories: uniq(assets.flatMap((asset) => asset.files.map((file) => file.split("/")[0]))).sort(
      (left, right) => left.localeCompare(right)
    )
  };
}

async function ensurePreferencesFile() {
  await fs.mkdir(preferencesDirectory, { recursive: true });

  try {
    await fs.access(preferencesPath);
  } catch {
    await fs.writeFile(preferencesPath, JSON.stringify(defaultPreferences, null, 2), "utf8");
  }
}

export async function loadDiscoverPreferences() {
  await ensurePreferencesFile();
  const raw = await fs.readFile(preferencesPath, "utf8");
  return normalizeDiscoverPreferences(JSON.parse(raw));
}

export async function saveDiscoverPreferences(preferences: DiscoverPreferences) {
  await ensurePreferencesFile();
  await fs.writeFile(preferencesPath, JSON.stringify(preferences, null, 2), "utf8");
}

export async function toggleFavoriteAsset(assetId: string) {
  const preferences = await loadDiscoverPreferences();
  const favoriteAssetIds = preferences.favoriteEntries.map((entry) => entry.assetId);
  const nextFavoriteAssetIds = toggleFavoriteAssetIds(favoriteAssetIds, assetId);
  const nextPreferences: DiscoverPreferences = {
    ...preferences,
    favoriteEntries: nextFavoriteAssetIds.map((nextAssetId) => {
      const existing = preferences.favoriteEntries.find((entry) => entry.assetId === nextAssetId);
      return existing ?? { assetId: nextAssetId };
    })
  };

  await saveDiscoverPreferences(nextPreferences);

  return nextPreferences;
}

export async function saveCompareSet(input: {
  assetIds: string[];
  projectId?: string;
  name?: string;
  catalog: CatalogAsset[];
}) {
  const preferences = await loadDiscoverPreferences();
  const compareSet = createSavedCompareSet(input);
  const nextPreferences: DiscoverPreferences = {
    ...preferences,
    compareSets: [
      compareSet,
      ...preferences.compareSets.filter((candidate) => candidate.id !== compareSet.id)
    ]
  };

  await saveDiscoverPreferences(nextPreferences);

  return compareSet;
}

export async function loadPresetBundles() {
  const raw = await fs.readFile(presetBundlesPath, "utf8");
  const bundles = JSON.parse(raw) as PresetBundle[];

  return bundles.sort((left, right) => left.title.localeCompare(right.title));
}

export function renameFavoriteEntry(
  preferences: DiscoverPreferences,
  assetId: string,
  label: string
) {
  return {
    ...preferences,
    favoriteEntries: preferences.favoriteEntries.map((entry) =>
      entry.assetId === assetId ? { ...entry, label } : entry
    )
  };
}

export function reorderFavoriteEntries(
  preferences: DiscoverPreferences,
  assetId: string,
  direction: "up" | "down"
) {
  const entries = [...preferences.favoriteEntries];
  const index = entries.findIndex((entry) => entry.assetId === assetId);

  if (index < 0) {
    return preferences;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= entries.length) {
    return preferences;
  }

  [entries[index], entries[targetIndex]] = [entries[targetIndex], entries[index]];

  return {
    ...preferences,
    favoriteEntries: entries
  };
}

export function removeFavoriteEntry(preferences: DiscoverPreferences, assetId: string) {
  return {
    ...preferences,
    favoriteEntries: preferences.favoriteEntries.filter((entry) => entry.assetId !== assetId)
  };
}

export function removeFavoriteEntries(preferences: DiscoverPreferences, assetIds: string[]) {
  const selected = new Set(assetIds);

  return {
    ...preferences,
    favoriteEntries: preferences.favoriteEntries.filter((entry) => !selected.has(entry.assetId))
  };
}

export function moveFavoriteEntriesToFront(
  preferences: DiscoverPreferences,
  assetIds: string[]
) {
  const selected = new Set(assetIds);
  const prioritized = preferences.favoriteEntries.filter((entry) => selected.has(entry.assetId));
  const remaining = preferences.favoriteEntries.filter((entry) => !selected.has(entry.assetId));

  return {
    ...preferences,
    favoriteEntries: [...prioritized, ...remaining]
  };
}

export function moveFavoriteEntryBefore(
  preferences: DiscoverPreferences,
  assetId: string,
  beforeAssetId?: string
) {
  return {
    ...preferences,
    favoriteEntries: moveEntryBefore(
      preferences.favoriteEntries,
      (entry) => entry.assetId === assetId,
      beforeAssetId ? (entry) => entry.assetId === beforeAssetId : undefined
    )
  };
}

export function removeCompareSet(preferences: DiscoverPreferences, compareSetId: string) {
  return {
    ...preferences,
    compareSets: preferences.compareSets.filter((compareSet) => compareSet.id !== compareSetId)
  };
}

export function removeCompareSets(preferences: DiscoverPreferences, compareSetIds: string[]) {
  const selected = new Set(compareSetIds);

  return {
    ...preferences,
    compareSets: preferences.compareSets.filter((compareSet) => !selected.has(compareSet.id))
  };
}

export function renameCompareSet(
  preferences: DiscoverPreferences,
  compareSetId: string,
  name: string
) {
  return {
    ...preferences,
    compareSets: preferences.compareSets.map((compareSet) =>
      compareSet.id === compareSetId ? { ...compareSet, name } : compareSet
    )
  };
}

export function reorderCompareSets(
  preferences: DiscoverPreferences,
  compareSetId: string,
  direction: "up" | "down"
) {
  const compareSets = [...preferences.compareSets];
  const index = compareSets.findIndex((compareSet) => compareSet.id === compareSetId);

  if (index < 0) {
    return preferences;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= compareSets.length) {
    return preferences;
  }

  [compareSets[index], compareSets[targetIndex]] = [compareSets[targetIndex], compareSets[index]];

  return {
    ...preferences,
    compareSets
  };
}

export function moveCompareSetsToFront(
  preferences: DiscoverPreferences,
  compareSetIds: string[]
) {
  const selected = new Set(compareSetIds);
  const prioritized = preferences.compareSets.filter((compareSet) => selected.has(compareSet.id));
  const remaining = preferences.compareSets.filter((compareSet) => !selected.has(compareSet.id));

  return {
    ...preferences,
    compareSets: [...prioritized, ...remaining]
  };
}

export function moveCompareSetBefore(
  preferences: DiscoverPreferences,
  compareSetId: string,
  beforeCompareSetId?: string
) {
  return {
    ...preferences,
    compareSets: moveEntryBefore(
      preferences.compareSets,
      (compareSet) => compareSet.id === compareSetId,
      beforeCompareSetId ? (compareSet) => compareSet.id === beforeCompareSetId : undefined
    )
  };
}

function ensurePresetDisplayEntry(preferences: DiscoverPreferences, presetId: string) {
  const existing = preferences.presetDisplays.find((entry) => entry.presetId === presetId);

  if (existing) {
    return existing;
  }

  return { presetId };
}

export function renamePresetDisplay(
  preferences: DiscoverPreferences,
  presetId: string,
  label: string
) {
  const presetDisplays = preferences.presetDisplays.some((entry) => entry.presetId === presetId)
    ? preferences.presetDisplays.map((entry) =>
        entry.presetId === presetId ? { ...entry, label } : entry
      )
    : [...preferences.presetDisplays, { presetId, label }];

  return {
    ...preferences,
    presetDisplays
  };
}

export function reorderPresetDisplays(
  preferences: DiscoverPreferences,
  presetId: string,
  direction: "up" | "down"
) {
  const presetDisplays = preferences.presetDisplays.some((entry) => entry.presetId === presetId)
    ? [...preferences.presetDisplays]
    : [...preferences.presetDisplays, ensurePresetDisplayEntry(preferences, presetId)];
  const index = presetDisplays.findIndex((entry) => entry.presetId === presetId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= presetDisplays.length) {
    return {
      ...preferences,
      presetDisplays
    };
  }

  [presetDisplays[index], presetDisplays[targetIndex]] = [
    presetDisplays[targetIndex],
    presetDisplays[index]
  ];

  return {
    ...preferences,
    presetDisplays
  };
}

export function removePresetDisplay(preferences: DiscoverPreferences, presetId: string) {
  return {
    ...preferences,
    presetDisplays: preferences.presetDisplays.filter((entry) => entry.presetId !== presetId)
  };
}

export function movePresetDisplaysToFront(
  preferences: DiscoverPreferences,
  presetIds: string[]
) {
  const seededPreferences = presetIds.reduce(
    (current, presetId) =>
      current.presetDisplays.some((entry) => entry.presetId === presetId)
        ? current
        : {
            ...current,
            presetDisplays: [...current.presetDisplays, ensurePresetDisplayEntry(current, presetId)]
          },
    preferences
  );
  const selected = new Set(presetIds);
  const prioritized = seededPreferences.presetDisplays.filter((entry) => selected.has(entry.presetId));
  const remaining = seededPreferences.presetDisplays.filter((entry) => !selected.has(entry.presetId));

  return {
    ...seededPreferences,
    presetDisplays: [...prioritized, ...remaining]
  };
}

export function movePresetDisplayBefore(
  preferences: DiscoverPreferences,
  presetId: string,
  beforePresetId?: string
) {
  const seededPreferences = [presetId, beforePresetId].filter(
    (currentPresetId): currentPresetId is string => Boolean(currentPresetId)
  ).reduce(
    (current, currentPresetId) =>
      current.presetDisplays.some((entry) => entry.presetId === currentPresetId)
        ? current
        : {
            ...current,
            presetDisplays: [...current.presetDisplays, ensurePresetDisplayEntry(current, currentPresetId)]
          },
    preferences
  );

  return {
    ...seededPreferences,
    presetDisplays: moveEntryBefore(
      seededPreferences.presetDisplays,
      (entry) => entry.presetId === presetId,
      beforePresetId ? (entry) => entry.presetId === beforePresetId : undefined
    )
  };
}

export function buildDiscoverReorderFeedback(input: {
  scope: keyof typeof discoverScopeLabels;
  label: string;
  itemId: string;
  undoBeforeId?: string;
}) {
  return {
    title: `Reordered ${input.label}`,
    description: `Updated inside ${discoverScopeLabels[input.scope]}.`,
    undo: {
      scope: input.scope,
      itemId: input.itemId,
      beforeId: input.undoBeforeId ?? ""
    }
  };
}

export function setPresetDisplayHidden(
  preferences: DiscoverPreferences,
  presetId: string,
  hidden: boolean
) {
  const presetDisplays = preferences.presetDisplays.some((entry) => entry.presetId === presetId)
    ? preferences.presetDisplays.map((entry) =>
        entry.presetId === presetId ? { ...entry, hidden } : entry
      )
    : [...preferences.presetDisplays, { presetId, hidden }];

  return {
    ...preferences,
    presetDisplays
  };
}

export function setPresetDisplaysHiddenBatch(
  preferences: DiscoverPreferences,
  presetIds: string[],
  hidden: boolean
) {
  return presetIds.reduce(
    (current, presetId) => setPresetDisplayHidden(current, presetId, hidden),
    preferences
  );
}

export async function updateDiscoverPreferences(
  mutator: (preferences: DiscoverPreferences) => DiscoverPreferences
) {
  const preferences = await loadDiscoverPreferences();
  const nextPreferences = mutator(preferences);
  await saveDiscoverPreferences(nextPreferences);
  return nextPreferences;
}
