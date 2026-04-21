import { notFound } from "next/navigation";
import Link from "next/link";

import { saveDraftAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { analyzeDraftProgress, collectDraftAdvice, getDefaultSections } from "@/lib/draft";
import { loadProjectDraft, loadProjectWorkspace } from "@/lib/projects";

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
      <div className="space-y-8">
        <div className="space-y-3">
          <Badge>Draft Studio</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink">
            {workspace.project.name}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Edit the Git-backed markdown draft while reviewing rule injections, missing sections,
            and selected asset guidance.
          </p>
        </div>

        <Card className="overflow-hidden bg-ink text-white">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <Badge className="bg-white/10 text-white">Draft progress</Badge>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">
                  {progress.completionPercent}% complete
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  This draft currently has {progress.completedSections.length} completed sections and{" "}
                  {progress.incompleteSections.length} sections that still need content or are missing.
                </p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${progress.completionPercent}%` }}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Completed
                </p>
                <p className="mt-3 text-3xl font-extrabold">{progress.completedSections.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Missing
                </p>
                <p className="mt-3 text-3xl font-extrabold">{advice.missingSections.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Rule hints
                </p>
                <p className="mt-3 text-3xl font-extrabold">{advice.ruleHints.length}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[220px_1fr_320px]">
          <Card className="h-fit space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sections
            </p>
            <ol className="space-y-2 text-sm text-slate-700">
              {sections.map((section) => (
                <li
                  key={section}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 font-medium"
                >
                  <span>{section}</span>
                  <span
                    className={
                      progress.completedSections.includes(section)
                        ? "text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong"
                        : "text-xs font-semibold uppercase tracking-[0.14em] text-coral"
                    }
                  >
                    {progress.completedSections.includes(section) ? "done" : "needs work"}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <form action={saveDraftAction} className="space-y-4">
              <input type="hidden" name="projectId" value={projectId} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Markdown draft
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">
                    Structured, human-editable spec draft
                  </h2>
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  Save draft
                </button>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/projects/${projectId}`}
                  className="rounded-full border border-line px-4 py-2 font-semibold text-ink"
                >
                  Back to workspace
                </Link>
                <Link
                  href={`/projects/${projectId}/exports`}
                  className="rounded-full border border-line px-4 py-2 font-semibold text-ink"
                >
                  Review exports
                </Link>
              </div>
              <textarea
                name="content"
                defaultValue={draft}
                className="min-h-[900px] w-full rounded-[28px] border border-line bg-[#fffefb] p-5 font-mono text-sm leading-7 text-slate-800 shadow-inner"
              />
            </form>
          </Card>

          <div className="space-y-6">
            <Card className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Next actions
              </p>
              <div className="space-y-2">
                {progress.incompleteSections.slice(0, 4).map((section) => (
                  <div key={section} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Complete section: {section}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Missing sections
              </p>
              {advice.missingSections.length ? (
                <div className="space-y-2">
                  {advice.missingSections.map((section) => (
                    <div key={section} className="rounded-2xl bg-coral/10 px-4 py-3 text-sm">
                      {section}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">All default sections are present.</p>
              )}
            </Card>

            <Card className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Rule injections
              </p>
              <div className="space-y-2">
                {advice.ruleHints.map((hint) => (
                  <div key={hint} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {hint}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Selected assets
              </p>
              <div className="space-y-3">
                {workspace.selectedAssets.map((asset) => (
                  <div key={asset.id} className="rounded-2xl border border-line/70 p-4">
                    <p className="text-sm font-semibold text-ink">{asset.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{asset.summary}</p>
                  </div>
                ))}
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
