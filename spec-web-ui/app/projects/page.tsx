import Link from "next/link";

import { createProjectAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { loadCatalogAssets } from "@/lib/catalog";
import { listProjects, resolveProjectWorkspace } from "@/lib/projects";

export default async function ProjectsPage() {
  const [projects, catalog] = await Promise.all([listProjects(), loadCatalogAssets()]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Badge>Projects</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">Workspace assembly</h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Each project collects selected assets, draft bindings, and export expectations in a
          Git-backed manifest.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              New project
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Create a workspace</h2>
          </div>
          <form action={createProjectAction} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Name</span>
              <input
                name="name"
                placeholder="Fraud Review Console"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Project type</span>
              <select
                name="projectType"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm"
                defaultValue="mixed"
              >
                <option value="backend">backend</option>
                <option value="frontend">frontend</option>
                <option value="mixed">mixed</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Architecture</span>
              <input
                name="architecture"
                defaultValue="modular-monolith"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Stacks</span>
              <input
                name="stacks"
                defaultValue="go, react"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-ink px-4 py-3 text-sm font-bold text-white"
            >
              Create project
            </button>
          </form>
        </Card>

        <div className="grid gap-4">
          {projects.map((project) => {
            const workspace = resolveProjectWorkspace(project, catalog);

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="space-y-4 transition hover:-translate-y-0.5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-ink">{project.name}</h2>
                      <p className="mt-2 text-sm text-slate-600">{project.architecture}</p>
                    </div>
                    <Badge className="bg-coral/10 text-coral">{project.projectType}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.stacks.map((stack) => (
                      <span
                        key={stack}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {stack}
                      </span>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Selected
                      </p>
                      <p className="mt-2 text-2xl font-bold text-ink">
                        {workspace.selectedAssets.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Missing deps
                      </p>
                      <p className="mt-2 text-2xl font-bold text-ink">
                        {workspace.missingDependencies.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Conflicts
                      </p>
                      <p className="mt-2 text-2xl font-bold text-ink">{workspace.conflicts.length}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
