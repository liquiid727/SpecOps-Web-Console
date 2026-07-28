import { notFound } from "next/navigation";
import React from "react";

import { setProjectAssetSelectionAction } from "@/app/actions";
import { CatalogAssetSummary } from "@/components/catalog/asset-summary";
import { Badge } from "@/components/ui/badge";
import { loadAssetSourcePreview, loadCatalogAsset, loadCatalogAssets } from "@/features/catalog/server";
import { buildExportDiffPreview } from "@/features/exports/server";
import { buildAssetCompositionPreview, listProjects, loadProjectWorkspace } from "@/lib/projects";
import { isReadOnlyMode } from "@/lib/runtime";
import { buildShellCommandTitle } from "@/lib/shell";

export default async function AssetDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ assetId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ assetId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const asset = await loadCatalogAsset(assetId);

  if (!asset) {
    notFound();
  }

  const readOnly = isReadOnlyMode();
  const [preview, catalog, projects] = await Promise.all([
    loadAssetSourcePreview(asset),
    loadCatalogAssets(),
    readOnly ? Promise.resolve([]) : listProjects()
  ]);
  const requestedProjectId =
    typeof resolvedSearchParams.projectId === "string" ? resolvedSearchParams.projectId : "";
  const activeProject = projects.find((project) => project.id === requestedProjectId) ?? projects[0] ?? null;
  const activeWorkspace = activeProject ? await loadProjectWorkspace(activeProject.id) : null;
  const compositionPreview =
    activeWorkspace && asset ? buildAssetCompositionPreview(activeWorkspace, asset) : null;
  const exampleOutputPreview = buildExportDiffPreview({
    sourcePath: asset.sourcePath,
    targetPath: asset.files[0] ?? asset.sourcePath,
    sourceContent: `# Example Output\n\n${asset.sampleOutput ?? "Catalog asset output preview"}\n`,
    generatedContent: null
  });

  return (
    <div className="grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <main>
        <section className="surface-base surface-panel rounded-xl border border-line">
          <div className="space-y-3 border-b border-line px-5 py-4 md:px-6">
            <p className="break-all font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
              {buildShellCommandTitle("cat", asset.sourcePath)}
            </p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-ink">{asset.title}</h1>
                <div className="mt-2 max-w-3xl">
                  <CatalogAssetSummary
                    asset={asset}
                    englishClassName="text-sm leading-6 text-slate-400"
                    chineseClassName="text-sm leading-6 text-slate-300"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{asset.type.replace("_", " ")}</Badge>
                <Badge>{asset.direction}</Badge>
                {asset.tier ? <Badge>{asset.tier === "main" ? "main agent" : "specialist"}</Badge> : null}
                {asset.managedBy ? <Badge>managed by {asset.managedBy}</Badge> : null}
              </div>
            </div>
          </div>
          <pre className="max-h-[calc(100vh-220px)] whitespace-pre-wrap break-words overflow-auto px-5 py-5 text-sm leading-7 text-ink md:px-6">
            {preview}
          </pre>
        </section>
      </main>

      <aside className="space-y-3 lg:sticky lg:top-6">
        <details className="surface-base surface-panel group rounded-xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
            Asset manifest
            <span className="font-mono text-xs text-slate-500 group-open:hidden">open</span>
            <span className="hidden font-mono text-xs text-slate-500 group-open:inline">close</span>
          </summary>
          <div className="space-y-4 border-t border-line px-4 py-4">
            <div className="grid gap-3">
              <div className="surface-base surface-field rounded-xl px-3 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">applies to</p>
                <p className="mt-2 text-sm text-slate-300">{asset.appliesTo.join(", ")}</p>
              </div>
              <div className="surface-base surface-field rounded-xl px-3 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">tech stacks</p>
                <p className="mt-2 text-sm text-slate-300">{asset.stacks.join(", ")}</p>
              </div>
              <div className="surface-base surface-field rounded-xl px-3 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">dependencies</p>
                <p className="mt-2 text-sm text-slate-300">
                  {asset.dependsOn.length ? asset.dependsOn.join(", ") : "none"}
                </p>
              </div>
              <div className="surface-base surface-field rounded-xl px-3 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">conflicts</p>
                <p className="mt-2 text-sm text-slate-300">
                  {asset.conflictsWith.length ? asset.conflictsWith.join(", ") : "none"}
                </p>
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">source path</p>
              <p className="surface-base surface-field mt-2 break-all rounded-xl px-3 py-3 font-mono text-xs text-slate-300">
                {asset.sourcePath}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                {buildShellCommandTitle("preview", "example-output")}
              </p>
              <pre className="surface-base surface-field mt-3 max-h-56 whitespace-pre-wrap break-words overflow-auto rounded-xl px-4 py-3 text-xs leading-6 text-ink">
                {exampleOutputPreview.preview}
              </pre>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">bundle footprint</p>
              <div className="mt-3 space-y-2">
                {asset.files.map((file) => (
                  <div key={file} className="surface-base surface-row break-all rounded-xl px-3 py-3 text-xs text-slate-300">
                    {file}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>

        <details className="surface-base surface-panel group rounded-xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
            Composition preview
            <span className="font-mono text-xs text-slate-500 group-open:hidden">open</span>
            <span className="hidden font-mono text-xs text-slate-500 group-open:inline">close</span>
          </summary>
          <div className="space-y-4 border-t border-line px-4 py-4">
            {readOnly ? (
              <div className="surface-base surface-field rounded-xl px-4 py-4 text-sm text-slate-400">
                This deployment is a read-only catalog preview. Workspace composition is available in the local workspace build.
              </div>
            ) : projects.length ? (
              <form action={`/discover/${asset.id}`} className="space-y-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-300">preview in project</span>
                  <select
                    name="projectId"
                    defaultValue={activeProject?.id ?? ""}
                    className="surface-field w-full rounded-[14px] px-3 py-2.5 text-sm text-ink outline-none"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="control control-primary w-full rounded-md px-3 py-2 text-sm font-medium">
                  update preview
                </button>
              </form>
            ) : (
              <div className="surface-base surface-field rounded-xl px-4 py-4 text-sm text-slate-400">
                no projects available yet. create a workspace first to preview composition.
              </div>
            )}

            {activeProject && compositionPreview ? (
              <div className="surface-base surface-panel space-y-4 rounded-xl p-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{activeProject.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    If you add this asset, the workspace will grow to {compositionPreview.selectedAssetCount} selected assets.
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">export directories</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {compositionPreview.exportDirectories.map((directory) => (
                      <span
                        key={directory}
                        className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-slate-300"
                      >
                        {directory}/
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="surface-base surface-field rounded-xl px-3 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      remaining missing dependencies
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {compositionPreview.remainingMissingDependencies.length
                        ? compositionPreview.remainingMissingDependencies.join(", ")
                        : "none"}
                    </p>
                  </div>
                  <div className="surface-base surface-field rounded-xl px-3 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      introduced conflicts
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {compositionPreview.introducedConflicts.length
                        ? compositionPreview.introducedConflicts.join(", ")
                        : "none"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </details>

        {!readOnly ? (
          <details className="surface-base surface-panel group rounded-xl border border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
              Send To Workspace
              <span className="font-mono text-xs text-slate-500 group-open:hidden">open</span>
              <span className="hidden font-mono text-xs text-slate-500 group-open:inline">close</span>
            </summary>
            <div className="space-y-3 border-t border-line px-4 py-4">
              {projects.length ? (
                projects.map((project) => (
                  <form key={project.id} action={setProjectAssetSelectionAction} className="space-y-3">
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="assetId" value={asset.id} />
                    <input type="hidden" name="enabled" value="true" />
                    <input type="hidden" name="redirectTo" value={`/discover/${asset.id}?projectId=${project.id}`} />
                    <button
                      type="submit"
                      className="surface-base surface-row flex w-full flex-col items-start gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium text-ink"
                    >
                      <span>{project.name}</span>
                      <span className="text-slate-500">{project.stacks.join(" / ")}</span>
                    </button>
                  </form>
                ))
              ) : (
                <div className="surface-base surface-field rounded-xl px-4 py-4 text-sm text-slate-400">
                  create a project workspace before assigning catalog assets.
                </div>
              )}
            </div>
          </details>
        ) : null}

        <details className="surface-base surface-panel group rounded-xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
            Good companions
            <span className="font-mono text-xs text-slate-500 group-open:hidden">open</span>
            <span className="hidden font-mono text-xs text-slate-500 group-open:inline">close</span>
          </summary>
          <div className="space-y-3 border-t border-line px-4 py-4">
            {catalog
              .filter((candidate) => candidate.id !== asset.id)
              .filter((candidate) => candidate.stacks.some((stack) => asset.stacks.includes(stack)))
              .slice(0, 3)
              .map((candidate) => (
                <div key={candidate.id} className="surface-base surface-row space-y-2 rounded-xl px-3 py-3">
                  <Badge>{candidate.type.replace("_", " ")}</Badge>
                  <h3 className="text-sm font-semibold text-ink">{candidate.title}</h3>
                  <CatalogAssetSummary
                    asset={candidate}
                    englishClassName="text-sm leading-6 text-slate-400"
                    chineseClassName="text-sm leading-6 text-slate-300"
                  />
                </div>
              ))}
          </div>
        </details>
      </aside>
    </div>
  );
}
