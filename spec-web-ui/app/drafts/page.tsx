import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WindowSection } from "@/components/ui/window-section";
import { loadProjectDraft, listProjects } from "@/lib/projects";
import { buildShellCommandTitle } from "@/lib/shell";

export default async function DraftsPage() {
  const projects = await listProjects();
  const drafts = await Promise.all(
    projects.map(async (project) => ({
      project,
      draft: await loadProjectDraft(project)
    }))
  );

  return (
    <div className="space-y-8">
      <WindowSection
        eyebrow={buildShellCommandTitle("ls", "drafts/")}
        title="Project drafts"
        description="Open any workspace draft, continue editing its structured markdown, and review rule-based guidance."
        contentClassName="pt-0"
      />

      <WindowSection
        eyebrow={buildShellCommandTitle("cat", "draft-preview/")}
        title="Draft previews"
        description="Scan the current structured markdown before opening a workspace."
        contentClassName="grid gap-4 lg:grid-cols-2"
      >
        {drafts.map(({ project, draft }) => (
          <Link key={project.id} href={`/projects/${project.id}/draft`}>
            <Card className="space-y-4 transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-ink">{project.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{project.architecture}</p>
                </div>
                <Badge className="bg-coral/10 text-coral">{project.projectType}</Badge>
              </div>
              <pre className="line-clamp-6 rounded-3xl border border-line bg-canvas p-4 font-mono text-sm leading-7 text-slate-600">
                {draft}
              </pre>
            </Card>
          </Link>
        ))}
      </WindowSection>
    </div>
  );
}
