import Link from "next/link";

import {
  applyPresetBundleAction,
  batchUpdateDiscoverCollectionAction,
  moveDiscoverCollectionItemAction,
  saveCompareSetAction,
  setProjectAssetSelectionAction,
  toggleFavoriteAssetAction,
  updateCompareSetAction,
  updateFavoriteEntryAction,
  updatePresetDisplayAction
} from "@/app/actions";
import { SortableCollectionItem } from "@/components/discover/sortable-collection-item";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  buildCatalogComparison,
  filterCatalogAssets,
  getCatalogFilterOptions,
  getFeaturedAssets,
  getMarketplaceRecommendations,
  getWorkspaceAssetState,
  loadCatalogAssets,
  sortCatalogAssetsForWorkspace
} from "@/lib/catalog";
import {
  buildPresetBundlePreview,
  loadDiscoverPreferences,
  loadPresetBundles
} from "@/lib/discover";
import { listProjects, loadProjectWorkspace } from "@/lib/projects";
import { buildShellCommandTitle } from "@/lib/shell";
import type { CatalogAsset, CatalogFilters, FavoriteEntry } from "@/lib/types";

const discoverFeedbackKeys = [
  "toastTitle",
  "toastDescription",
  "undoScope",
  "undoItemId",
  "undoBeforeId"
] as const;

function coerceList(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : value.split(",").filter(Boolean);
}

function toUrlSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value) {
      params.set(key, value);
    }
  }

  return params;
}

function buildDiscoverHref(
  currentSearchParams: Record<string, string | string[] | undefined>,
  updates: Record<string, string | null>
) {
  const params = toUrlSearchParams(currentSearchParams);

  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  return queryString ? `/discover?${queryString}` : "/discover";
}

function omitDiscoverFeedbackParams(
  currentSearchParams: Record<string, string | string[] | undefined>
) {
  return Object.fromEntries(
    Object.entries(currentSearchParams).filter(
      ([key]) => !discoverFeedbackKeys.includes(key as (typeof discoverFeedbackKeys)[number])
    )
  );
}

export default async function DiscoverPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [resolvedSearchParams, catalog, projects] = await Promise.all([
    searchParams,
    loadCatalogAssets(),
    listProjects()
  ]);
  const [preferences, presetBundles] = await Promise.all([
    loadDiscoverPreferences(),
    loadPresetBundles()
  ]);
  const searchParamsWithoutFeedback = omitDiscoverFeedbackParams(resolvedSearchParams);
  const requestedProjectId =
    typeof resolvedSearchParams.projectId === "string" ? resolvedSearchParams.projectId : "";
  const activeProject = projects.find((project) => project.id === requestedProjectId) ?? projects[0] ?? null;
  const activeWorkspace = activeProject ? await loadProjectWorkspace(activeProject.id) : null;
  const sort =
    typeof resolvedSearchParams.sort === "string" ? resolvedSearchParams.sort : "workspace";
  const compareIds = coerceList(resolvedSearchParams.compare);

  const filters: CatalogFilters = {
    query: typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : "",
    types: coerceList(resolvedSearchParams.type) as CatalogFilters["types"],
    directions: coerceList(resolvedSearchParams.direction) as CatalogFilters["directions"],
    stacks: coerceList(resolvedSearchParams.stack),
    tags: coerceList(resolvedSearchParams.tag)
  };
  const options = getCatalogFilterOptions(catalog);
  const selectedFilterValues = {
    type: filters.types?.[0] ?? "",
    direction: filters.directions?.[0] ?? "",
    stack: filters.stacks?.[0] ?? "",
    tag: filters.tags?.[0] ?? ""
  } as const;
  const filterGroups: Array<{
    name: keyof typeof selectedFilterValues;
    label: string;
    values: string[];
  }> = [
    { name: "type", label: "type", values: [...options.types] },
    { name: "direction", label: "direction", values: [...options.directions] },
    { name: "stack", label: "stack", values: options.stacks },
    { name: "tag", label: "tag", values: options.tags }
  ];
  const workspaceContext = activeWorkspace
    ? {
        selectedAssetIds: activeWorkspace.selectedAssets.map((asset) => asset.id),
        requiredAssetIds: activeWorkspace.missingDependencies.flatMap((issue) => issue.missingAssetIds),
        recommendedAssetIds: activeWorkspace.recommendedAssets.map((asset) => asset.id),
        conflictingAssetIds: catalog
          .filter((asset) =>
            activeWorkspace.selectedAssets.some(
              (selectedAsset) =>
                asset.conflictsWith.includes(selectedAsset.id) ||
                selectedAsset.conflictsWith.includes(asset.id)
            )
          )
          .map((asset) => asset.id)
      }
    : undefined;
  const matchingAssets = filterCatalogAssets(catalog, filters);
  const filteredAssets =
    sort === "title"
      ? [...matchingAssets].sort((left, right) => left.title.localeCompare(right.title))
      : sort === "type"
        ? [...matchingAssets].sort((left, right) =>
            `${left.type}-${left.title}`.localeCompare(`${right.type}-${right.title}`)
          )
        : sort === "direction"
          ? [...matchingAssets].sort((left, right) =>
              `${left.direction}-${left.title}`.localeCompare(`${right.direction}-${right.title}`)
            )
          : sortCatalogAssetsForWorkspace(matchingAssets, workspaceContext);
  const marketplaceRecommendations = getMarketplaceRecommendations(catalog, {
    activeStacks: activeProject?.stacks ?? [],
    selectedAssetIds: activeWorkspace?.selectedAssets.map((asset) => asset.id) ?? [],
    limit: 3
  });
  const featuredAssets = getFeaturedAssets(catalog, {
    limit: 4,
    preferredTags: ["workflow", "openapi", "ui", "release"]
  });
  const comparison = buildCatalogComparison(catalog, compareIds);
  const favoriteEntries = preferences.favoriteEntries
    .map((entry) => ({
      entry,
      asset: catalog.find((asset) => asset.id === entry.assetId)
    }))
    .filter(
      (entry): entry is { entry: FavoriteEntry; asset: CatalogAsset } => Boolean(entry.asset)
    );
  const favoriteAssetIds = new Set(favoriteEntries.map(({ entry }) => entry.assetId));
  const favoriteAssets = favoriteEntries;
  const savedCompareSets = preferences.compareSets.filter(
    (compareSet) => !activeProject || !compareSet.projectId || compareSet.projectId === activeProject.id
  );
  const presetDisplayIndex = new Map(
    preferences.presetDisplays.map((entry, index) => [entry.presetId, index])
  );
  const presetPreviews = [...presetBundles]
    .sort((left, right) => {
      const leftIndex = presetDisplayIndex.get(left.id);
      const rightIndex = presetDisplayIndex.get(right.id);

      if (leftIndex !== undefined && rightIndex !== undefined && leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      if (leftIndex !== undefined) {
        return -1;
      }

      if (rightIndex !== undefined) {
        return 1;
      }

      return left.title.localeCompare(right.title);
    })
    .map((bundle) => {
      const display = preferences.presetDisplays.find((entry) => entry.presetId === bundle.id);

      return {
        bundle: {
          ...bundle,
          title: display?.label?.trim() ? display.label : bundle.title
        },
        rawBundle: bundle,
        display,
        preview: buildPresetBundlePreview(bundle, catalog)
      };
    });
  const visiblePresetPreviews = presetPreviews.filter(({ display }) => !display?.hidden);
  const hiddenPresetPreviews = presetPreviews.filter(({ display }) => display?.hidden);
  const quickTags = options.tags.slice(0, 8);
  const workspaceMix = activeWorkspace?.selectedAssets.reduce<Record<string, number>>((accumulator, asset) => {
    accumulator[asset.type] = (accumulator[asset.type] ?? 0) + 1;
    return accumulator;
  }, {});
  const previewExportDirectories = activeWorkspace
    ? [...new Set(activeWorkspace.selectedAssets.flatMap((asset) => asset.files.map((file) => file.split("/")[0])))]
        .sort((left, right) => left.localeCompare(right))
    : [];

  const statusCopy = {
    selected: {
      label: "selected",
      tone: "border-accent/40 bg-accent/10 text-accent-strong",
      detail: "already part of the active workspace"
    },
    required: {
      label: "required",
      tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      detail: "needed to resolve a missing dependency"
    },
    recommended: {
      label: "recommended",
      tone: "border-line bg-sand text-slate-300",
      detail: "fits the current project composition"
    },
    conflict: {
      label: "conflict",
      tone: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      detail: "may collide with something already selected"
    },
    available: {
      label: "available",
      tone: "border-line bg-sand text-slate-300",
      detail: "ready to add to the active project"
    }
  } as const;
  const redirectTo = buildDiscoverHref(searchParamsWithoutFeedback, {});
  const discoverFeedback =
    typeof resolvedSearchParams.toastTitle === "string" &&
    typeof resolvedSearchParams.toastDescription === "string" &&
    typeof resolvedSearchParams.undoScope === "string" &&
    typeof resolvedSearchParams.undoItemId === "string"
      ? {
          title: resolvedSearchParams.toastTitle,
          description: resolvedSearchParams.toastDescription,
          undoScope: resolvedSearchParams.undoScope,
          undoItemId: resolvedSearchParams.undoItemId,
          undoBeforeId:
            typeof resolvedSearchParams.undoBeforeId === "string"
              ? resolvedSearchParams.undoBeforeId
              : ""
        }
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {buildShellCommandTitle("find", "catalog/")}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-ink">discover</h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-400">
              Search reusable rules, spec templates, and agent roles, then compose them into the
              active project workspace.
            </p>
          </div>
          <div className="min-w-[260px] space-y-2 font-mono text-xs text-slate-500">
            <p>catalog: {catalog.length}</p>
            <p>projects: {projects.length}</p>
            <p>active: {activeProject?.name ?? "none"}</p>
          </div>
        </div>

        <form action="/discover" className="mt-6 grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_180px_160px]">
          <select
            name="projectId"
            defaultValue={activeProject?.id ?? ""}
            className="rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={filters.query}
            placeholder="$ search title, tags, stacks..."
            className="rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="workspace">workspace fit</option>
            <option value="title">title</option>
            <option value="type">type</option>
            <option value="direction">direction</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-accent bg-accent/10 px-4 py-3 text-sm font-medium text-accent-strong hover:bg-accent/15"
          >
            Run search
          </button>
        </form>
      </section>

      {discoverFeedback ? (
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-emerald-300">
                {buildShellCommandTitle("echo", "reorder complete")}
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-200">{discoverFeedback.title}</p>
              <p className="mt-1 text-sm text-slate-300">{discoverFeedback.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={moveDiscoverCollectionItemAction}>
                <input type="hidden" name="scope" value={discoverFeedback.undoScope} />
                <input type="hidden" name="itemId" value={discoverFeedback.undoItemId} />
                <input type="hidden" name="beforeId" value={discoverFeedback.undoBeforeId} />
                <input type="hidden" name="undoBeforeId" value={discoverFeedback.undoBeforeId} />
                <input type="hidden" name="suppressToast" value="true" />
                <input type="hidden" name="itemLabel" value="" />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <button
                  type="submit"
                  className="rounded-md border border-line px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-200 hover:bg-sand"
                >
                  Undo
                </button>
              </form>
              <Link
                href={redirectTo}
                className="rounded-md border border-line px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400 hover:bg-sand"
              >
                Clear
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <Card>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {buildShellCommandTitle("ls", "filters/")}
            </p>
            <form className="mt-4 space-y-4" action="/discover">
              <input type="hidden" name="projectId" value={activeProject?.id ?? ""} />
              {filterGroups.map((group) => (
                <label key={group.name} className="block space-y-2">
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                    {group.label}
                  </span>
                  <select
                    name={group.name}
                    defaultValue={selectedFilterValues[group.name]}
                    className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                  >
                    <option value="">all</option>
                    {group.values.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button
                type="submit"
                className="w-full rounded-md border border-line px-4 py-2 text-sm font-medium text-slate-300 hover:bg-sand"
              >
                Apply filters
              </button>
            </form>
          </Card>

          <Card>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {buildShellCommandTitle("ls", "tags/")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickTags.map((tag) => {
                const active = filters.tags?.includes(tag);

                return (
                  <Link
                    key={tag}
                    href={buildDiscoverHref(searchParamsWithoutFeedback, { tag: active ? null : tag })}
                    className={
                      active
                        ? "rounded-md border border-accent bg-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-accent-strong"
                        : "rounded-md border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                    }
                  >
                    {tag}
                  </Link>
                );
              })}
            </div>
          </Card>

          {activeWorkspace ? (
            <Card>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                {buildShellCommandTitle("cat", "workspace.context")}
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <h2 className="text-lg font-medium text-ink">{activeWorkspace.project.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{activeWorkspace.project.architecture}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                      selected
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{activeWorkspace.selectedAssets.length}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                      missing deps
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {activeWorkspace.missingDependencies.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                      conflicts
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{activeWorkspace.conflicts.length}</p>
                  </div>
                </div>
                {workspaceMix ? (
                  <div className="space-y-2 text-sm text-slate-400">
                    {Object.entries(workspaceMix).map(([type, count]) => (
                      <p key={type} className="font-mono text-xs uppercase tracking-[0.12em]">
                        {type}: {count}
                      </p>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {previewExportDirectories.map((directory) => (
                    <span
                      key={directory}
                      className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-slate-300"
                    >
                      {directory}/
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          {favoriteAssets.length ? (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                    {buildShellCommandTitle("ls", "favorites/")}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">pinned assets and renamed shortcuts</p>
                </div>
                <form
                  id="favorite-batch-form"
                  action={batchUpdateDiscoverCollectionAction}
                  className="flex flex-wrap gap-2"
                >
                  <input type="hidden" name="scope" value="favorites" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <button
                    type="submit"
                    name="intent"
                    value="promote"
                    className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                  >
                    top
                  </button>
                  <button
                    type="submit"
                    name="intent"
                    value="remove"
                    className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-300 hover:bg-sand"
                  >
                    remove
                  </button>
                </form>
              </div>
              <div className="space-y-3">
                {favoriteAssets.map(({ asset, entry }, index) => (
                  <SortableCollectionItem
                    key={asset.id}
                    scope="favorites"
                    itemId={asset.id}
                    nextItemId={favoriteAssets[index + 1]?.asset.id}
                    dragLabel={entry.label?.trim() || asset.title}
                    undoBeforeId={favoriteAssets[index + 1]?.asset.id}
                    redirectTo={redirectTo}
                  >
                    <Card className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            name="ids"
                            value={asset.id}
                            form="favorite-batch-form"
                            className="mt-1 h-4 w-4 rounded border-line bg-canvas"
                          />
                          <div>
                            <p className="text-sm font-medium text-ink">
                              {entry.label?.trim() || asset.title}
                            </p>
                            {entry.label?.trim() ? (
                              <p className="mt-1 text-xs text-slate-500">{asset.title}</p>
                            ) : null}
                          </div>
                        </div>
                        <Badge>{asset.type.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm leading-6 text-slate-400">{asset.summary}</p>
                      <form action={updateFavoriteEntryAction} className="space-y-3">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <input
                          type="text"
                          name="label"
                          defaultValue={entry.label ?? ""}
                          placeholder="$ rename favorite"
                          className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            name="intent"
                            value="rename"
                            className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                          >
                            rename
                          </button>
                          <button
                            type="submit"
                            name="intent"
                            value="remove"
                            className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-300 hover:bg-sand"
                          >
                            remove
                          </button>
                        </div>
                      </form>
                    </Card>
                  </SortableCollectionItem>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                  {buildShellCommandTitle("ls", "presets/")}
                </p>
                <p className="mt-2 text-sm text-slate-400">starter bundles for the active project</p>
              </div>
              <form
                id="preset-visible-batch-form"
                action={batchUpdateDiscoverCollectionAction}
                className="flex flex-wrap gap-2"
              >
                <input type="hidden" name="scope" value="presets" />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <button
                  type="submit"
                  name="intent"
                  value="promote"
                  className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                >
                  top
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="hide"
                  className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-300 hover:bg-sand"
                >
                  hide
                </button>
              </form>
            </div>

            <div className="space-y-3">
              {visiblePresetPreviews.map(({ bundle, rawBundle, preview }, index) => (
                <SortableCollectionItem
                  key={bundle.id}
                  scope="presets"
                  itemId={rawBundle.id}
                  nextItemId={visiblePresetPreviews[index + 1]?.rawBundle.id}
                  dragLabel={bundle.title}
                  undoBeforeId={visiblePresetPreviews[index + 1]?.rawBundle.id}
                  redirectTo={redirectTo}
                >
                  <Card className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="ids"
                          value={rawBundle.id}
                          form="preset-visible-batch-form"
                          className="mt-1 h-4 w-4 rounded border-line bg-canvas"
                        />
                        <div>
                          <p className="text-sm font-medium text-ink">{bundle.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{preview.assetCount} assets</p>
                        </div>
                      </div>
                      <Badge>{bundle.featured ? "featured" : "preset"}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-slate-400">{bundle.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {preview.exportDirectories.map((directory) => (
                        <span
                          key={directory}
                          className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-slate-300"
                        >
                          {directory}/
                        </span>
                      ))}
                    </div>
                    {activeProject ? (
                      <form action={applyPresetBundleAction}>
                        <input type="hidden" name="projectId" value={activeProject.id} />
                        <input type="hidden" name="presetId" value={rawBundle.id} />
                        <input type="hidden" name="redirectTo" value={`/discover?projectId=${activeProject.id}`} />
                        <button
                          type="submit"
                          className="rounded-md border border-accent bg-accent/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-accent-strong hover:bg-accent/15"
                        >
                          apply
                        </button>
                      </form>
                    ) : null}
                    <form action={updatePresetDisplayAction} className="space-y-3">
                      <input type="hidden" name="presetId" value={rawBundle.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input
                        type="text"
                        name="label"
                        defaultValue={bundle.title !== rawBundle.title ? bundle.title : ""}
                        placeholder="$ rename preset"
                        className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          name="intent"
                          value="rename"
                          className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                        >
                          rename
                        </button>
                        <button
                          type="submit"
                          name="intent"
                          value="hide"
                          className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-300 hover:bg-sand"
                        >
                          hide
                        </button>
                      </div>
                    </form>
                  </Card>
                </SortableCollectionItem>
              ))}
            </div>

            {hiddenPresetPreviews.length ? (
              <Card className="space-y-3">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                      hidden
                    </p>
                    <p className="mt-1 text-sm text-slate-400">restore hidden bundles</p>
                  </div>
                  <form
                    id="preset-hidden-batch-form"
                    action={batchUpdateDiscoverCollectionAction}
                    className="flex flex-wrap gap-2"
                  >
                    <input type="hidden" name="scope" value="presets" />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button
                      type="submit"
                      name="intent"
                      value="restore"
                      className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                    >
                      restore
                    </button>
                  </form>
                </div>
                <div className="space-y-3">
                  {hiddenPresetPreviews.map(({ rawBundle }) => (
                    <form key={rawBundle.id} action={updatePresetDisplayAction} className="rounded-xl border border-line bg-canvas p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="ids"
                          value={rawBundle.id}
                          form="preset-hidden-batch-form"
                          className="mt-1 h-4 w-4 rounded border-line bg-canvas"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-ink">{rawBundle.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">{rawBundle.summary}</p>
                        </div>
                      </div>
                      <input type="hidden" name="presetId" value={rawBundle.id} />
                      <input type="hidden" name="intent" value="restore" />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button
                        type="submit"
                        className="mt-4 rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                      >
                        restore
                      </button>
                    </form>
                  ))}
                </div>
              </Card>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                  {buildShellCommandTitle("ls", "compare-sets/")}
                </p>
                <p className="mt-2 text-sm text-slate-400">saved compare combinations</p>
              </div>
              <form
                id="compare-batch-form"
                action={batchUpdateDiscoverCollectionAction}
                className="flex flex-wrap gap-2"
              >
                <input type="hidden" name="scope" value="compareSets" />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <button
                  type="submit"
                  name="intent"
                  value="promote"
                  className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                >
                  top
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="remove"
                  className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-300 hover:bg-sand"
                >
                  delete
                </button>
              </form>
            </div>

            {comparison.assets.length >= 2 ? (
              <form action={saveCompareSetAction} className="rounded-xl border border-line bg-panel p-4">
                <input type="hidden" name="projectId" value={activeProject?.id ?? ""} />
                <input
                  type="hidden"
                  name="assetIds"
                  value={comparison.assets.map((asset) => asset.id).join(",")}
                />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <button
                  type="submit"
                  className="rounded-md border border-accent bg-accent/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-accent-strong hover:bg-accent/15"
                >
                  save current compare
                </button>
              </form>
            ) : null}

            {savedCompareSets.length ? (
              <div className="space-y-3">
                {savedCompareSets.map((compareSet, index) => (
                  <SortableCollectionItem
                    key={compareSet.id}
                    scope="compareSets"
                    itemId={compareSet.id}
                    nextItemId={savedCompareSets[index + 1]?.id}
                    dragLabel={compareSet.name}
                    undoBeforeId={savedCompareSets[index + 1]?.id}
                    redirectTo={redirectTo}
                  >
                    <Card className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            name="ids"
                            value={compareSet.id}
                            form="compare-batch-form"
                            className="mt-1 h-4 w-4 rounded border-line bg-canvas"
                          />
                          <div>
                            <p className="text-sm font-medium text-ink">{compareSet.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {compareSet.projectId ? `project: ${compareSet.projectId}` : "global compare set"}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {compareSet.assetIds.length} assets
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {compareSet.assetIds.map((assetId) => (
                          <span
                            key={assetId}
                            className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-slate-300"
                          >
                            {catalog.find((asset) => asset.id === assetId)?.title ?? assetId}
                          </span>
                        ))}
                      </div>
                      <form action={updateCompareSetAction} className="space-y-3">
                        <input type="hidden" name="compareSetId" value={compareSet.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <input
                          type="text"
                          name="name"
                          defaultValue={compareSet.name}
                          placeholder="$ rename compare set"
                          className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            name="intent"
                            value="rename"
                            className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                          >
                            rename
                          </button>
                          <button
                            type="submit"
                            name="intent"
                            value="remove"
                            className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-300 hover:bg-sand"
                          >
                            delete
                          </button>
                          <Link
                            href={buildDiscoverHref(searchParamsWithoutFeedback, {
                              compare: compareSet.assetIds.join(","),
                              projectId: compareSet.projectId ?? activeProject?.id ?? null
                            })}
                            className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                          >
                            load
                          </Link>
                        </div>
                      </form>
                    </Card>
                  </SortableCollectionItem>
                ))}
              </div>
            ) : (
              <Card>
                <p className="font-mono text-xs text-slate-500">no compare sets found</p>
              </Card>
            )}
          </section>
        </aside>

        <main className="space-y-6">
          {comparison.assets.length ? (
            <Card>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                    {buildShellCommandTitle("diff", "compare/")}
                  </p>
                  <h2 className="mt-3 text-xl font-medium text-ink">
                    {comparison.assets.length} assets in comparison
                  </h2>
                </div>
                <Link href={buildDiscoverHref(searchParamsWithoutFeedback, { compare: null })} className="text-sm font-medium text-accent-strong">
                  clear compare
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {comparison.assets.map((asset) => (
                  <span
                    key={asset.id}
                    className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-300"
                  >
                    {asset.title}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    shared stacks
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {comparison.sharedStacks.length ? comparison.sharedStacks.join(", ") : "none"}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    export directories
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comparison.exportDirectories.map((directory) => (
                      <span
                        key={directory}
                        className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-slate-300"
                      >
                        {directory}/
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                    {buildShellCommandTitle("ls", "featured/")}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">team-picked reusable assets</p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-line">
                {featuredAssets.map((asset) => (
                  <Link
                    key={asset.id}
                    href={`/discover/${asset.id}${activeProject ? `?projectId=${activeProject.id}` : ""}`}
                    className="block py-4 transition hover:bg-sand/60"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent-strong">
                        {asset.type}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        {asset.direction}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-ink">{asset.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{asset.summary}</p>
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                    {buildShellCommandTitle("ls", "recommended/")}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">workspace-aware catalog picks</p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-line">
                {marketplaceRecommendations.map((asset) => (
                  <Link
                    key={asset.id}
                    href={`/discover/${asset.id}${activeProject ? `?projectId=${activeProject.id}` : ""}`}
                    className="block py-4 transition hover:bg-sand/60"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent-strong">
                        {asset.type}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        {asset.stacks.join(", ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-ink">{asset.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{asset.summary}</p>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                  {buildShellCommandTitle("ls", "results/")}
                </p>
                <h2 className="mt-3 text-xl font-medium text-ink">{filteredAssets.length} assets</h2>
              </div>
              <p className="font-mono text-xs text-slate-500">
                sort={sort} project={activeProject?.id ?? "none"}
              </p>
            </div>

            {filteredAssets.length ? (
              <div className="mt-4 divide-y divide-line">
                {filteredAssets.map((asset) => {
                  const state = getWorkspaceAssetState(asset, workspaceContext);
                  const inCompare = comparison.assets.some((candidate) => candidate.id === asset.id);

                  return (
                    <div key={asset.id} className="py-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] ${statusCopy[state].tone}`}>
                          {statusCopy[state].label}
                        </span>
                        <Badge>{asset.type.replace("_", " ")}</Badge>
                        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                          {asset.direction}
                        </span>
                        {favoriteAssetIds.has(asset.id) ? (
                          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-300">
                            favorite
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
                        <div className="max-w-3xl">
                          <p className="font-mono text-[11px] text-slate-600">{asset.sourcePath}</p>
                          <h3 className="mt-2 text-xl font-medium text-ink">{asset.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-slate-400">{asset.summary}</p>
                          <p className="mt-2 text-sm text-slate-500">{statusCopy[state].detail}</p>
                        </div>
                        <div className="min-w-[220px] rounded-xl border border-line bg-canvas p-4 text-sm text-slate-400">
                          <p>
                            <span className="font-medium text-slate-300">stacks:</span> {asset.stacks.join(", ")}
                          </p>
                          <p className="mt-2">
                            <span className="font-medium text-slate-300">depends:</span>{" "}
                            {asset.dependsOn.length ? asset.dependsOn.join(", ") : "none"}
                          </p>
                          <p className="mt-2">
                            <span className="font-medium text-slate-300">conflicts:</span>{" "}
                            {asset.conflictsWith.length ? asset.conflictsWith.join(", ") : "none"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {asset.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/discover/${asset.id}${activeProject ? `?projectId=${activeProject.id}` : ""}`}
                          className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                        >
                          detail
                        </Link>
                        <form action={toggleFavoriteAssetAction}>
                          <input type="hidden" name="assetId" value={asset.id} />
                          <input type="hidden" name="redirectTo" value={redirectTo} />
                          <button
                            type="submit"
                            className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                          >
                            {favoriteAssetIds.has(asset.id) ? "unfavorite" : "favorite"}
                          </button>
                        </form>
                        <Link
                          href={buildDiscoverHref(searchParamsWithoutFeedback, {
                            compare: inCompare
                              ? comparison.assets
                                  .filter((candidate) => candidate.id !== asset.id)
                                  .map((candidate) => candidate.id)
                                  .join(",") || null
                              : [...comparison.assets.map((candidate) => candidate.id), asset.id].slice(0, 3).join(",")
                          })}
                          className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                        >
                          {inCompare ? "remove compare" : "add compare"}
                        </Link>
                        {activeProject ? (
                          state === "selected" ? (
                            <Link
                              href={`/projects/${activeProject.id}`}
                              className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                            >
                              open project
                            </Link>
                          ) : (
                            <form action={setProjectAssetSelectionAction}>
                              <input type="hidden" name="projectId" value={activeProject.id} />
                              <input type="hidden" name="assetId" value={asset.id} />
                              <input type="hidden" name="enabled" value="true" />
                              <input type="hidden" name="redirectTo" value={`/discover?projectId=${activeProject.id}`} />
                              <button
                                type="submit"
                                className="rounded-md border border-accent bg-accent/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-accent-strong hover:bg-accent/15"
                              >
                                {state === "required" ? "resolve dependency" : "add to project"}
                              </button>
                            </form>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-line bg-canvas px-4 py-6">
                <p className="font-mono text-sm text-slate-500">no results found</p>
                <p className="mt-2 text-sm text-slate-400">
                  try clearing a filter or removing one of the more specific tags/stacks.
                </p>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}
