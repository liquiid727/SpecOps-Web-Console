import { notFound } from "next/navigation";
import Link from "next/link";

import { saveDraftAction } from "@/app/actions";
import { CatalogAssetSummary } from "@/components/catalog/asset-summary";
import { Badge } from "@/components/ui/badge";
import { WindowSection } from "@/components/ui/window-section";
import { analyzeDraftProgress, collectDraftAdvice, getDefaultSections } from "@/lib/draft";
import { loadProjectDraft, loadProjectWorkspace } from "@/lib/projects";
import { buildShellCommandTitle } from "@/lib/shell";

export default async function ProjectDraftPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  try {
    const workspace = await loadProjectWorkspace(projectId);
    const draft = await loadProjectDraft(workspace.project);
    const advice = collectDraftAdvice(workspace.project, workspace.selectedAssets, draft);
    const sections = getDefaultSections();
    const progress = analyzeDraftProgress(draft);

    return (
      <div className="space-y-6 md:space-y-8">
        <WindowSection
          eyebrow={buildShellCommandTitle("edit", workspace.project.draftPath)}
          title={workspace.project.name}
          description="Edit the Git-backed markdown draft while reviewing rule injections, missing sections, and selected asset guidance."
          actions={<Badge>Draft Studio</Badge>}
          contentClassName="space-y-5"
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <Badge>Draft progress</Badge>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-ink">
                  {progress.completionPercent}% complete
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  This draft currently has {progress.completedSections.length} completed sections and{" "}
                  {progress.incompleteSections.length} sections that still need content or are missing.
                </p>
              </div>
              <div className="h-3 overflow-hidden rounded-full border border-line bg-sand">
                <div
                  className="h-full rounded-full bg-ink transition-all"
                  style={{ width: `${progress.completionPercent}%` }}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="surface-base surface-field rounded-3xl p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Completed
                </p>
                <p className="mt-3 text-3xl font-extrabold text-ink">{progress.completedSections.length}</p>
              </div>
              <div className="surface-base surface-field rounded-3xl p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Missing
                </p>
                <p className="mt-3 text-3xl font-extrabold text-ink">{advice.missingSections.length}</p>
              </div>
              <div className="surface-base surface-field rounded-3xl p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Rule hints
                </p>
                <p className="mt-3 text-3xl font-extrabold text-ink">{advice.ruleHints.length}</p>
              </div>
            </div>
          </div>
        </WindowSection>

        <div className="grid gap-4 md:gap-6 xl:grid-cols-[220px_1fr_320px]">
          <WindowSection
            eyebrow={buildShellCommandTitle("ls", "sections/")}
            title="Sections"
            description="Default sections and completion status."
            className="h-fit"
            contentClassName="pt-0"
          >
            <ol className="space-y-2 text-sm text-slate-700">
              {sections.map((section) => (
                <li
                  key={section}
                  className="surface-base surface-row flex items-center justify-between rounded-2xl px-3 py-2 font-medium"
                >
                  <span>{section}</span>
                  <span
                    className={
                      progress.completedSections.includes(section)
                        ? "text-xs font-semibold uppercase tracking-[0.14em] text-ink"
                        : "text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                    }
                  >
                    {progress.completedSections.includes(section) ? "done" : "needs work"}
                  </span>
                </li>
              ))}
            </ol>
          </WindowSection>

          <WindowSection
            eyebrow={buildShellCommandTitle("cat", "draft.md")}
            title="Structured, human-editable spec draft"
            description="Primary editing surface for the project markdown draft."
            actions={
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/projects/${projectId}`}
                  className="control control-secondary rounded-full px-4 py-2 font-semibold"
                >
                  Back to workspace
                </Link>
                <Link
                  href={`/projects/${projectId}/exports`}
                  className="control control-secondary rounded-full px-4 py-2 font-semibold"
                >
                  Review exports
                </Link>
              </div>
            }
          >
            <form action={saveDraftAction} className="space-y-4">
              <input type="hidden" name="projectId" value={projectId} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Markdown draft
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">Ready for direct editing</h2>
                </div>
                <button
                  type="submit"
                  className="control control-primary w-full rounded-full px-4 py-2 text-sm font-semibold sm:w-auto"
                >
                  Save draft
                </button>
              </div>
              <textarea
                name="content"
                defaultValue={draft}
                className="surface-field min-h-[70vh] w-full rounded-[28px] p-4 font-mono text-sm leading-7 text-ink outline-none md:min-h-[900px] md:p-5"
              />
            </form>
          </WindowSection>

          <WindowSection
            eyebrow={buildShellCommandTitle("cat", "draft.guidance")}
            title="Guidance"
            description="Priority next steps, rule hints, and selected asset context while editing."
            contentClassName="space-y-5"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Next actions</p>
              {progress.incompleteSections.slice(0, 4).length ? (
                progress.incompleteSections.slice(0, 4).map((section) => (
                  <div key={section} className="surface-base surface-row rounded-2xl px-4 py-3 text-sm text-slate-400">
                    Complete section: {section}
                  </div>
                ))
              ) : (
                <div className="surface-base surface-field rounded-2xl px-4 py-3 text-sm text-slate-400">
                  all default sections currently have content.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Missing sections</p>
              {advice.missingSections.length ? (
                advice.missingSections.map((section) => (
                  <div key={section} className="rounded-2xl border border-emerald-500/30 px-4 py-3 text-sm text-slate-300">
                    {section}
                  </div>
                ))
              ) : (
                <div className="surface-base surface-field rounded-2xl px-4 py-3 text-sm text-slate-400">
                  all default sections are present.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Rule injections</p>
              {advice.ruleHints.length ? (
                advice.ruleHints.map((hint) => (
                  <div key={hint} className="surface-base surface-row rounded-2xl px-4 py-3 text-sm text-slate-400">
                    {hint}
                  </div>
                ))
              ) : (
                <div className="surface-base surface-field rounded-2xl px-4 py-3 text-sm text-slate-400">
                  no additional rule hints right now.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Selected assets</p>
              {workspace.selectedAssets.length ? (
                workspace.selectedAssets.map((asset) => (
                  <div key={asset.id} className="surface-base surface-row rounded-2xl p-4">
                    <p className="text-sm font-semibold text-ink">{asset.title}</p>
                    <div className="mt-2">
                      <CatalogAssetSummary
                        asset={asset}
                        englishClassName="text-sm text-slate-400"
                        chineseClassName="text-sm text-slate-300"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="surface-base surface-field rounded-2xl px-4 py-3 text-sm text-slate-400">
                  no assets selected yet.
                </div>
              )}
            </div>
          </WindowSection>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
