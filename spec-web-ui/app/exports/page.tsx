import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WindowSection } from "@/components/ui/window-section";
import { loadGeneratedExportBundle } from "@/lib/export";
import { listProjects } from "@/lib/projects";
import { buildShellCommandTitle } from "@/lib/shell";

export default async function ExportsPage() {
  const projects = await listProjects();
  const exports = await Promise.all(
    projects.map(async (project) => ({
      project,
      bundle: await loadGeneratedExportBundle(project.id)
    }))
  );

  return (
    <div className="space-y-8">
      <WindowSection
        eyebrow={buildShellCommandTitle("ls", "exports/")}
        title="Export snapshots"
        description="Review which project workspaces already generated bundle snapshots and jump into their detailed export previews."
        contentClassName="pt-0"
      />

      <WindowSection
        eyebrow={buildShellCommandTitle("ls", "bundle-reviews/")}
        title="Workspace exports"
        description="Generated bundles and preview-only workspaces in one place."
        contentClassName="grid gap-4 lg:grid-cols-2"
      >
        {exports.map(({ project, bundle }) => (
          <Link key={project.id} href={`/projects/${project.id}/exports`}>
            <Card className="space-y-4 transition hover:bg-sand">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    {project.projectType} / {project.architecture}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">{project.name}</h2>
                </div>
                <Badge className={bundle ? "border-accent/40 bg-accent/10 text-accent-strong" : "text-slate-400"}>
                  {bundle ? "generated" : "preview only"}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-slate-400">
                {bundle
                  ? `${bundle.files.length} files exported at ${new Date(bundle.generatedAt).toLocaleString()}`
                  : "No export snapshot generated yet. Open to review the preview and create one."}
              </p>
            </Card>
          </Link>
        ))}
      </WindowSection>
    </div>
  );
}
