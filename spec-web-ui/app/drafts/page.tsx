import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { loadProjectDraft, listProjects } from "@/lib/projects";

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
      <div className="space-y-3">
        <Badge>Draft Studio</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">Project drafts</h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Open any workspace draft, continue editing its structured markdown, and review rule-based
          guidance.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
              <pre className="line-clamp-6 rounded-3xl bg-slate-50 p-4 font-mono text-sm leading-7 text-slate-700">
                {draft}
              </pre>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
