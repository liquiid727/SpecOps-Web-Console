import Link from "next/link";
import { notFound } from "next/navigation";

import { setProjectAssetSelectionAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { WindowSection } from "@/components/ui/window-section";
import { buildShellCommandTitle } from "@/lib/shell";
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
      <div className="space-y-6 md:space-y-8">
        <WindowSection
          eyebrow={buildShellCommandTitle("ls", `workspace/${workspace.project.id}/`)}
          title={workspace.project.name}
          description="Compose project norms, draft bindings, and export expectations with immediate dependency and conflict visibility."
          actions={
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Badge>Project workspace</Badge>
              <Link
                href={`/projects/${projectId}/draft`}
                className="control control-primary w-full rounded-full px-4 py-2 text-center text-sm font-semibold sm:w-auto"
              >
                Open Draft Studio
              </Link>
              <Link
                href={`/projects/${projectId}/exports`}
                className="control control-secondary w-full rounded-full px-4 py-2 text-center text-sm font-semibold sm:w-auto"
              >
                Review exports
              </Link>
            </div>
          }
          contentClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="surface-base surface-field rounded-2xl px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">selected</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{workspace.selectedAssets.length}</p>
          </div>
          <div className="surface-base surface-field rounded-2xl px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">missing deps</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{workspace.missingDependencies.length}</p>
          </div>
          <div className="surface-base surface-field rounded-2xl px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">conflicts</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{workspace.conflicts.length}</p>
          </div>
        </WindowSection>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <WindowSection
              eyebrow={buildShellCommandTitle("ls", "selected-assets/")}
              title={`${workspace.selectedAssets.length} assets in this workspace`}
              description="Current assets bound into this project container."
              contentClassName="space-y-3"
            >
              {workspace.selectedAssets.length ? (
                workspace.selectedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="surface-base surface-row flex flex-col gap-4 rounded-2xl p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{asset.type.replace("_", " ")}</Badge>
                        <Badge className="border-line bg-transparent text-slate-500">{asset.direction}</Badge>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-ink">{asset.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{asset.summary}</p>
                    </div>
                    <form action={setProjectAssetSelectionAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="assetId" value={asset.id} />
                      <input type="hidden" name="enabled" value="false" />
                      <input type="hidden" name="redirectTo" value={`/projects/${projectId}`} />
                      <button
                        type="submit"
                        className="control control-secondary w-full rounded-full px-4 py-2 text-sm font-semibold sm:w-auto"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <div className="surface-base surface-field rounded-2xl px-4 py-4 text-sm text-slate-400">
                  no assets selected yet. open discover to add rules, templates, and agents.
                </div>
              )}
            </WindowSection>

            <WindowSection
              eyebrow={buildShellCommandTitle("ls", "recommended-assets/")}
              title="Suggested additions"
              description="Workspace-aware assets that fill common gaps or strengthen coverage."
              actions={
                <Link href="/discover" className="control control-secondary rounded-full px-4 py-2 text-sm font-semibold">
                  Browse catalog
                </Link>
              }
              contentClassName="space-y-3"
            >
              {workspace.recommendedAssets.length ? (
                workspace.recommendedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="surface-base surface-field rounded-2xl border-dashed p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-ink">{asset.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{asset.summary}</p>
                      </div>
                      <form action={setProjectAssetSelectionAction}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="assetId" value={asset.id} />
                        <input type="hidden" name="enabled" value="true" />
                        <input type="hidden" name="redirectTo" value={`/projects/${projectId}`} />
                        <button
                          type="submit"
                        className="control control-primary w-full rounded-full px-4 py-2 text-sm font-semibold sm:w-auto"
                        >
                          Add asset
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <div className="surface-base surface-field rounded-2xl px-4 py-4 text-sm text-slate-400">
                  no recommendations right now. this workspace already has a coherent set.
                </div>
              )}
            </WindowSection>
          </div>

          <div className="space-y-6">
            <WindowSection
              eyebrow={buildShellCommandTitle("cat", "workspace.status")}
              title="Workspace status"
              description="Project metadata and composition context."
              contentClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"
            >
              <div className="surface-base surface-field rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Architecture
                </p>
                <p className="mt-2 text-lg font-bold text-ink">{workspace.project.architecture}</p>
              </div>
              <div className="surface-base surface-field rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Stacks
                </p>
                <p className="mt-2 text-lg font-bold text-ink">{workspace.project.stacks.join(" / ")}</p>
              </div>
            </WindowSection>

            <WindowSection
              eyebrow={buildShellCommandTitle("cat", "missing-dependencies.log")}
              title="Missing dependencies"
              description="Unresolved requirements introduced by the current asset mix."
              contentClassName="space-y-3"
            >
              {workspace.missingDependencies.length ? (
                workspace.missingDependencies.map((issue) => (
                  <div key={issue.assetId} className="rounded-2xl border border-emerald-500/30 px-4 py-4 text-sm">
                    <p className="font-semibold text-ink">{issue.assetId}</p>
                    <p className="mt-2 text-slate-400">Missing: {issue.missingAssetIds.join(", ")}</p>
                  </div>
                ))
              ) : (
                <div className="surface-base surface-field rounded-2xl px-4 py-4 text-sm text-slate-400">
                  no unresolved dependencies.
                </div>
              )}
            </WindowSection>

            <WindowSection
              eyebrow={buildShellCommandTitle("cat", "conflicts.log")}
              title="Conflicts"
              description="Collisions detected between currently selected assets."
              contentClassName="space-y-3"
            >
              {workspace.conflicts.length ? (
                workspace.conflicts.map((issue) => (
                  <div key={issue.assetId} className="rounded-2xl border border-amber-500/30 px-4 py-4 text-sm">
                    <p className="font-semibold text-ink">{issue.assetId}</p>
                    <p className="mt-2 text-slate-400">
                      Conflicts with: {issue.conflictingAssetIds.join(", ")}
                    </p>
                  </div>
                ))
              ) : (
                <div className="surface-base surface-field rounded-2xl px-4 py-4 text-sm text-slate-400">
                  no active conflicts.
                </div>
              )}
            </WindowSection>
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
