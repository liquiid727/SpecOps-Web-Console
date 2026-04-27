import { notFound } from "next/navigation";

import { setProjectAssetSelectionAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WindowSection } from "@/components/ui/window-section";
import { loadAssetSourcePreview, loadCatalogAsset, loadCatalogAssets } from "@/lib/catalog";
import { buildExportDiffPreview } from "@/lib/export";
import { buildAssetCompositionPreview, listProjects, loadProjectWorkspace } from "@/lib/projects";
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

  const [preview, projects, catalog] = await Promise.all([
    loadAssetSourcePreview(asset),
    listProjects(),
    loadCatalogAssets()
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
    <div className="space-y-6 md:space-y-8">
      <WindowSection
        eyebrow={buildShellCommandTitle("cat", asset.sourcePath)}
        title={asset.title}
        description={asset.summary}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge>{asset.type.replace("_", " ")}</Badge>
            <Badge>{asset.direction}</Badge>
          </div>
        }
        contentClassName="pt-0"
      />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <WindowSection
          eyebrow={buildShellCommandTitle("ls", "asset-manifest/")}
          title="Asset manifest"
          description="Scope, dependencies, generated footprint, and example output for this reusable unit."
          contentClassName="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-base surface-field rounded-2xl px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">applies to</p>
              <p className="mt-2 text-sm text-slate-300">{asset.appliesTo.join(", ")}</p>
            </div>
            <div className="surface-base surface-field rounded-2xl px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">tech stacks</p>
              <p className="mt-2 text-sm text-slate-300">{asset.stacks.join(", ")}</p>
            </div>
            <div className="surface-base surface-field rounded-2xl px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">dependencies</p>
              <p className="mt-2 text-sm text-slate-300">
                {asset.dependsOn.length ? asset.dependsOn.join(", ") : "none"}
              </p>
            </div>
            <div className="surface-base surface-field rounded-2xl px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">conflicts</p>
              <p className="mt-2 text-sm text-slate-300">
                {asset.conflictsWith.length ? asset.conflictsWith.join(", ") : "none"}
              </p>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">source path</p>
            <p className="surface-base surface-field mt-2 rounded-xl px-4 py-3 font-mono text-sm text-slate-300">
              {asset.sourcePath}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
              {buildShellCommandTitle("preview", "example-output")}
            </p>
            <pre className="surface-base surface-field mt-3 overflow-x-auto rounded-xl px-5 py-4 text-sm leading-7 text-slate-200">
              {exampleOutputPreview.preview}
            </pre>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">bundle footprint</p>
            <div className="mt-3 space-y-2">
              {asset.files.map((file) => (
                <div key={file} className="surface-base surface-row rounded-xl px-4 py-3 text-sm text-slate-300">
                  {file}
                </div>
              ))}
            </div>
          </div>
        </WindowSection>

        <div className="space-y-6">
          <WindowSection
            eyebrow={buildShellCommandTitle("cat", "project.context")}
            title="Composition preview"
            description="Preview this asset inside an active project workspace before selecting it."
            contentClassName="space-y-4"
          >
            {projects.length ? (
              <form action={`/discover/${asset.id}`} className="space-y-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-300">preview in project</span>
                  <select
                    name="projectId"
                    defaultValue={activeProject?.id ?? ""}
                    className="surface-field w-full rounded-[18px] px-4 py-3 text-sm text-ink outline-none"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                  <button type="submit" className="control control-primary w-full rounded-md px-4 py-2 text-sm font-medium sm:w-auto">
                    update preview
                  </button>
              </form>
            ) : (
              <div className="surface-base surface-field rounded-xl px-4 py-4 text-sm text-slate-400">
                no projects available yet. create a workspace first to preview composition.
              </div>
            )}

            {activeProject && compositionPreview ? (
              <div className="surface-base surface-panel space-y-4 rounded-xl p-5">
                <div>
                  <p className="text-sm font-semibold text-ink">{activeProject.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    If you add this asset, the workspace will grow to {compositionPreview.selectedAssetCount} selected assets.
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">export directories</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {compositionPreview.exportDirectories.map((directory) => (
                      <span
                        key={directory}
                        className="rounded-md border border-line px-3 py-1 font-mono text-[11px] text-slate-300"
                      >
                        {directory}/
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="surface-base surface-field rounded-xl px-4 py-3">
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                      remaining missing dependencies
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {compositionPreview.remainingMissingDependencies.length
                        ? compositionPreview.remainingMissingDependencies.join(", ")
                        : "none"}
                    </p>
                  </div>
                  <div className="surface-base surface-field rounded-xl px-4 py-3">
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
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
          </WindowSection>

          <WindowSection
            eyebrow={buildShellCommandTitle("ls", "projects/")}
            title="Send To Workspace"
            description="Push this asset into a project workspace with one action."
            contentClassName="space-y-3"
          >
            {projects.length ? (
              projects.map((project) => (
                <form key={project.id} action={setProjectAssetSelectionAction} className="space-y-3">
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="assetId" value={asset.id} />
                  <input type="hidden" name="enabled" value="true" />
                  <input type="hidden" name="redirectTo" value={`/discover/${asset.id}?projectId=${project.id}`} />
                  <button
                    type="submit"
                    className="surface-base surface-row flex w-full flex-col items-start gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium text-ink sm:flex-row sm:items-center sm:justify-between"
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
          </WindowSection>
        </div>
      </div>

      <WindowSection
        eyebrow={buildShellCommandTitle("cat", "source.preview")}
        title="Source preview"
        description="Raw source content loaded from the catalog entry."
        contentClassName="pt-0"
      >
        <pre className="surface-base surface-field overflow-x-auto rounded-xl px-6 py-5 text-sm leading-7 text-slate-200">
          {preview}
        </pre>
      </WindowSection>

      <WindowSection
        eyebrow={buildShellCommandTitle("ls", "related/")}
        title="Good companions for this asset"
        description="Other catalog entries that share overlapping stacks and usually travel together."
        contentClassName="grid gap-4 lg:grid-cols-3"
      >
        {catalog
          .filter((candidate) => candidate.id !== asset.id)
          .filter((candidate) => candidate.stacks.some((stack) => asset.stacks.includes(stack)))
          .slice(0, 3)
          .map((candidate) => (
            <Card key={candidate.id} className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{candidate.type.replace("_", " ")}</Badge>
              </div>
              <h3 className="text-lg font-semibold text-ink">{candidate.title}</h3>
              <p className="text-sm leading-6 text-slate-400">{candidate.summary}</p>
            </Card>
          ))}
      </WindowSection>
    </div>
  );
}
