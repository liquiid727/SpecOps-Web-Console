import { notFound } from "next/navigation";

import { generateExportAction } from "@/app/actions";
import { ExportReviewClient } from "@/components/exports/export-review-client";
import { WindowSection } from "@/components/ui/window-section";
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
      <div className="space-y-6 md:space-y-8">
        <WindowSection
          eyebrow={buildShellCommandTitle("review", `exports/${workspace.project.id}`)}
          title={workspace.project.name}
          description="Inspect the generated bundle, review file-level diffs, annotate handoff notes, and generate a repo-backed snapshot when the bundle is ready."
          actions={
            <div className="space-y-2 font-mono text-xs text-slate-500">
              <p>project: {workspace.project.id}</p>
              <p>draft: {workspace.project.draftPath}</p>
              <p>snapshot: {generatedBundle ? "generated" : "preview only"}</p>
            </div>
          }
          contentClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {[
            { label: "directories", value: groupedFiles.length },
            { label: "new", value: reviewStats.new },
            { label: "changed", value: reviewStats.changed },
            { label: "removed", value: reviewStats.removed },
            { label: "notes", value: notedFileCount }
          ].map((item) => (
            <div key={item.label} className="surface-base surface-field rounded-xl p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-semibold text-ink">{item.value}</p>
            </div>
          ))}
        </WindowSection>

        <div className="grid gap-4 md:gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <WindowSection
              eyebrow={buildShellCommandTitle("ls", "bundle/")}
              title={preview.summary}
              description="Review every generated file, directory tree, and manifest diff before snapshot creation."
              actions={
                <form action={generateExportAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <button
                    type="submit"
                    className="control control-primary w-full rounded-md px-4 py-2 text-sm font-medium sm:w-auto"
                  >
                    Generate export snapshot
                  </button>
                </form>
              }
            >
              <ExportReviewClient
                projectId={projectId}
                reviewGroups={reviewGroups}
                exportTree={exportTree}
                manifestPreview={{
                  status: manifestDiff.status,
                  lines: getDiffLineEntries(manifestDiff.preview)
                }}
              />
            </WindowSection>
          </div>

          <div className="space-y-6">
            <WindowSection
              eyebrow={buildShellCommandTitle("cat", "snapshot.status")}
              title="Snapshot status"
              description="State of the persisted export bundle and latest generation data."
              contentClassName="space-y-3"
            >
              {generatedBundle ? (
                <>
                  <div className="surface-base surface-field rounded-xl px-4 py-3 text-sm text-slate-300">
                    Generated at: {new Date(generatedBundle.generatedAt).toLocaleString()}
                  </div>
                  <div className="surface-base surface-field rounded-xl px-4 py-3 text-sm text-slate-300">
                    {generatedBundle.summary}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="surface-base surface-row rounded-xl px-4 py-3 text-sm text-slate-300">
                      Synced files: {reviewStats.synced}
                    </div>
                    <div className="surface-base surface-row rounded-xl px-4 py-3 text-sm text-slate-300">
                      Removed files: {reviewStats.removed}
                    </div>
                    <div className="surface-base surface-row rounded-xl px-4 py-3 text-sm text-slate-300">
                      Accepted reviews: {decisionStats.accepted}
                    </div>
                    <div className="surface-base surface-row rounded-xl px-4 py-3 text-sm text-slate-300">
                      Review notes: {notedFileCount}
                    </div>
                  </div>
                </>
              ) : (
                <div className="surface-base surface-field rounded-xl px-4 py-4 text-sm text-slate-400">
                  no export snapshot generated yet. preview is available on the left.
                </div>
              )}
            </WindowSection>

            <WindowSection
              eyebrow={buildShellCommandTitle("cat", "review.decisions")}
              title="Review decisions"
              description="Decision totals across every file review group."
              contentClassName="grid gap-3 sm:grid-cols-2"
            >
              {[
                { label: "Pending", value: decisionStats.pending },
                { label: "Accepted", value: decisionStats.accepted },
                { label: "Needs work", value: decisionStats.needs_work },
                { label: "Blocked", value: decisionStats.blocked }
              ].map((item) => (
                <div key={item.label} className="surface-base surface-field rounded-xl p-4 text-sm text-slate-300">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </WindowSection>

            <WindowSection
              eyebrow={buildShellCommandTitle("cat", "validation.log")}
              title="Validation log"
              description="Workspace readiness signals that inform export quality."
              contentClassName="space-y-2"
            >
              <div className="surface-base surface-field rounded-xl px-4 py-3 text-sm text-slate-300">
                Conflicts: {workspace.conflicts.length}
              </div>
              <div className="surface-base surface-field rounded-xl px-4 py-3 text-sm text-slate-300">
                Missing dependencies: {workspace.missingDependencies.length}
              </div>
              <div className="surface-base surface-field rounded-xl px-4 py-3 text-sm text-slate-300">
                Selected assets: {workspace.selectedAssets.length}
              </div>
            </WindowSection>
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
