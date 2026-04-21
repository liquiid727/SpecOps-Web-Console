import { notFound } from "next/navigation";

import { generateExportAction } from "@/app/actions";
import { ExportReviewClient } from "@/components/exports/export-review-client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  buildExportBundle,
  buildExportDiffPreview,
  buildExportFileTree,
  getReviewOwnersForFile,
  getDiffLineEntries,
  groupExportFilesByDirectory,
  loadExportReview,
  loadGeneratedExportBundle,
  summarizeExportReviewDecisions
} from "@/lib/export";
import { loadProjectWorkspace } from "@/lib/projects";
import { buildShellCommandTitle } from "@/lib/shell";

export default async function ProjectExportsPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  try {
    const workspace = await loadProjectWorkspace(projectId);
    const preview = buildExportBundle(workspace.project, workspace.selectedAssets, {
      conflictCount: workspace.conflicts.length,
      missingDependencyCount: workspace.missingDependencies.length
    });
    const generatedBundle = await loadGeneratedExportBundle(projectId);
    const groupedFiles = groupExportFilesByDirectory(preview.files);
    const exportTree = buildExportFileTree(preview.files);
    const rawReviewGroups = await loadExportReview(projectId, preview);
    const reviewGroups = rawReviewGroups.map((group) => ({
      ...group,
      files: group.files.map((file) => ({
        ...file,
        owners: getReviewOwnersForFile(file, workspace.selectedAssets).map((asset) => ({
          id: asset.id,
          title: asset.title
        }))
      }))
    }));
    const manifestDiff = buildExportDiffPreview({
      sourcePath: "project-manifest.yaml",
      targetPath: "project-manifest.yaml",
      sourceContent: preview.manifestYaml,
      generatedContent: generatedBundle?.manifestYaml ?? null
    });
    const reviewStats = reviewGroups
      .flatMap((group) => group.files)
      .reduce(
        (accumulator, file) => {
          accumulator[file.diff.status] += 1;
          return accumulator;
        },
        { new: 0, changed: 0, removed: 0, synced: 0 }
      );
    const decisionStats = summarizeExportReviewDecisions(reviewGroups);
    const notedFileCount = reviewGroups.flatMap((group) => group.files).filter((file) => file.note?.trim()).length;

    return (
      <div className="space-y-8">
        <section className="rounded-2xl border border-line bg-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                {buildShellCommandTitle("review", `exports/${workspace.project.id}`)}
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-ink">{workspace.project.name}</h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-400">
                Inspect the generated bundle, review file-level diffs, annotate handoff notes, and
                generate a repo-backed snapshot when the bundle is ready.
              </p>
            </div>
            <div className="space-y-2 font-mono text-xs text-slate-500">
              <p>project: {workspace.project.id}</p>
              <p>draft: {workspace.project.draftPath}</p>
              <p>snapshot: {generatedBundle ? "generated" : "preview only"}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "directories", value: groupedFiles.length },
              { label: "new", value: reviewStats.new },
              { label: "changed", value: reviewStats.changed },
              { label: "removed", value: reviewStats.removed },
              { label: "notes", value: notedFileCount }
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-line bg-canvas p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                    {buildShellCommandTitle("ls", "bundle/")}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-ink">{preview.summary}</h2>
                </div>
                <form action={generateExportAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <button
                    type="submit"
                    className="rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent-strong hover:bg-accent/15"
                  >
                    Generate export snapshot
                  </button>
                </form>
              </div>
              <ExportReviewClient
                projectId={projectId}
                reviewGroups={reviewGroups}
                exportTree={exportTree}
                manifestPreview={{
                  status: manifestDiff.status,
                  lines: getDiffLineEntries(manifestDiff.preview)
                }}
              />
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="space-y-4">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                {buildShellCommandTitle("cat", "snapshot.status")}
              </p>
              {generatedBundle ? (
                <div className="space-y-3 text-sm text-slate-300">
                  <p>Generated at: {new Date(generatedBundle.generatedAt).toLocaleString()}</p>
                  <p>{generatedBundle.summary}</p>
                  <p>Synced files: {reviewStats.synced}</p>
                  <p>Removed files: {reviewStats.removed}</p>
                  <p>Accepted reviews: {decisionStats.accepted}</p>
                  <p>Review notes: {notedFileCount}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No export snapshot generated yet. Preview is available on the left.
                </p>
              )}
            </Card>

            <Card className="space-y-4">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                {buildShellCommandTitle("cat", "review.decisions")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-canvas p-4 text-sm text-slate-300">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Pending
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{decisionStats.pending}</p>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-4 text-sm text-slate-300">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Accepted
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{decisionStats.accepted}</p>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-4 text-sm text-slate-300">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Needs work
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{decisionStats.needs_work}</p>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-4 text-sm text-slate-300">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Blocked
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{decisionStats.blocked}</p>
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                {buildShellCommandTitle("cat", "validation.log")}
              </p>
              <div className="space-y-2 text-sm text-slate-300">
                <p>Conflicts: {workspace.conflicts.length}</p>
                <p>Missing dependencies: {workspace.missingDependencies.length}</p>
                <p>Selected assets: {workspace.selectedAssets.length}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
