import Link from "next/link";
import { notFound } from "next/navigation";

import { setProjectAssetSelectionAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { loadProjectWorkspace } from "@/lib/projects";

export default async function ProjectWorkspacePage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  try {
    const workspace = await loadProjectWorkspace(projectId);

    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <Badge>Project workspace</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink">
            {workspace.project.name}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Compose project norms, draft bindings, and export expectations with immediate
            dependency and conflict visibility.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Selected assets
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">
                    {workspace.selectedAssets.length} assets in this workspace
                  </h2>
                </div>
                <Link
                  href={`/projects/${projectId}/draft`}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  Open Draft Studio
                </Link>
              </div>
              <div className="space-y-3">
                {workspace.selectedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex flex-col gap-4 rounded-2xl border border-line/70 bg-white/80 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{asset.type.replace("_", " ")}</Badge>
                        <Badge className="bg-slate-100 text-slate-700">{asset.direction}</Badge>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-ink">{asset.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{asset.summary}</p>
                    </div>
                    <form action={setProjectAssetSelectionAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="assetId" value={asset.id} />
                      <input type="hidden" name="enabled" value="false" />
                      <input type="hidden" name="redirectTo" value={`/projects/${projectId}`} />
                      <button
                        type="submit"
                        className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Recommendations
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">Suggested additions</h2>
                </div>
                <Link href="/discover" className="text-sm font-semibold text-accent-strong">
                  Browse catalog
                </Link>
              </div>
              <div className="space-y-3">
                {workspace.recommendedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-2xl border border-dashed border-line bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-ink">{asset.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{asset.summary}</p>
                      </div>
                      <form action={setProjectAssetSelectionAction}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="assetId" value={asset.id} />
                        <input type="hidden" name="enabled" value="true" />
                        <input type="hidden" name="redirectTo" value={`/projects/${projectId}`} />
                        <button
                          type="submit"
                          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                        >
                          Add asset
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Workspace status
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Architecture
                  </p>
                  <p className="mt-2 text-lg font-bold text-ink">
                    {workspace.project.architecture}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Stacks
                  </p>
                  <p className="mt-2 text-lg font-bold text-ink">
                    {workspace.project.stacks.join(" / ")}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Missing dependencies
              </p>
              {workspace.missingDependencies.length ? (
                <div className="space-y-3">
                  {workspace.missingDependencies.map((issue) => (
                    <div key={issue.assetId} className="rounded-2xl bg-coral/10 p-4 text-sm">
                      <p className="font-semibold text-ink">{issue.assetId}</p>
                      <p className="mt-2 text-slate-700">
                        Missing: {issue.missingAssetIds.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No unresolved dependencies.</p>
              )}
            </Card>

            <Card className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Conflicts
              </p>
              {workspace.conflicts.length ? (
                <div className="space-y-3">
                  {workspace.conflicts.map((issue) => (
                    <div key={issue.assetId} className="rounded-2xl bg-amber-100/70 p-4 text-sm">
                      <p className="font-semibold text-ink">{issue.assetId}</p>
                      <p className="mt-2 text-slate-700">
                        Conflicts with: {issue.conflictingAssetIds.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No active conflicts.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
