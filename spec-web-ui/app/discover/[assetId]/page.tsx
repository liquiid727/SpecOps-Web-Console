import { notFound } from "next/navigation";

import { setProjectAssetSelectionAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-panel p-6">
        <div className="flex flex-wrap gap-2">
          <Badge>{asset.type.replace("_", " ")}</Badge>
          <Badge>{asset.direction}</Badge>
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-accent">
          {buildShellCommandTitle("cat", asset.sourcePath)}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{asset.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{asset.summary}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">applies to</p>
              <p className="mt-2 text-sm text-slate-300">{asset.appliesTo.join(", ")}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">tech stacks</p>
              <p className="mt-2 text-sm text-slate-300">{asset.stacks.join(", ")}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">dependencies</p>
              <p className="mt-2 text-sm text-slate-300">
                {asset.dependsOn.length ? asset.dependsOn.join(", ") : "none"}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">conflicts</p>
              <p className="mt-2 text-sm text-slate-300">
                {asset.conflictsWith.length ? asset.conflictsWith.join(", ") : "none"}
              </p>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">source path</p>
            <p className="mt-2 rounded-xl border border-line bg-canvas px-4 py-3 font-mono text-sm text-slate-300">
              {asset.sourcePath}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
              {buildShellCommandTitle("preview", "example-output")}
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-[#09090b] p-5 text-sm leading-7 text-slate-100">
              {exampleOutputPreview.preview}
            </pre>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">bundle footprint</p>
            <div className="mt-3 space-y-2">
              {asset.files.map((file) => (
                <div
                  key={file}
                  className="rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-slate-300"
                >
                  {file}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {buildShellCommandTitle("cat", "project.context")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">composition preview</h2>
          </div>
          <form action={`/discover/${asset.id}`} className="space-y-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-300">preview in project</span>
              <select
                name="projectId"
                defaultValue={activeProject?.id ?? ""}
                className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-slate-300 hover:bg-sand"
            >
              update preview
            </button>
          </form>

          {activeProject && compositionPreview ? (
            <div className="space-y-4 rounded-xl border border-line bg-canvas p-5">
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
                      className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent-strong"
                    >
                      {directory}/
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                  remaining missing dependencies
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {compositionPreview.remainingMissingDependencies.length
                    ? compositionPreview.remainingMissingDependencies.join(", ")
                    : "none"}
                </p>
              </div>
              <div>
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
          ) : null}

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {buildShellCommandTitle("ls", "projects/")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">send to a project workspace</h2>
          </div>
          <div className="space-y-3">
            {projects.map((project) => (
              <form key={project.id} action={setProjectAssetSelectionAction} className="space-y-3">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="assetId" value={asset.id} />
                <input type="hidden" name="enabled" value="true" />
                <input type="hidden" name="redirectTo" value={`/discover/${asset.id}?projectId=${project.id}`} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-xl border border-line bg-canvas px-4 py-3 text-left text-sm font-medium text-ink hover:bg-sand"
                >
                  <span>{project.name}</span>
                  <span className="text-slate-500">{project.stacks.join(" / ")}</span>
                </button>
              </form>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          {buildShellCommandTitle("cat", "source.preview")}
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-[#09090b] p-6 text-sm leading-7 text-slate-100">
          {preview}
        </pre>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            {buildShellCommandTitle("ls", "related/")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">good companions for this asset</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {catalog
            .filter((candidate) => candidate.id !== asset.id)
            .filter((candidate) => candidate.stacks.some((stack) => asset.stacks.includes(stack)))
            .slice(0, 3)
            .map((candidate) => (
              <Card key={candidate.id} className="space-y-3 bg-canvas">
                <div className="flex flex-wrap gap-2">
                  <Badge>{candidate.type.replace("_", " ")}</Badge>
                </div>
                <h3 className="text-lg font-semibold text-ink">{candidate.title}</h3>
                <p className="text-sm leading-6 text-slate-400">{candidate.summary}</p>
              </Card>
            ))}
        </div>
      </Card>
    </div>
  );
}
