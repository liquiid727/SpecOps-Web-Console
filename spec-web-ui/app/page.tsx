import Link from "next/link";

import { loadCatalogAssets, getCatalogFilterOptions } from "@/lib/catalog";
import { buildShellCommandTitle } from "@/lib/shell";
import { buildGlassInteractiveClassName, buildGlassSurfaceClassName } from "@/lib/theme";
import { listProjects } from "@/lib/projects";

export default async function HomePage() {
  const [catalog, projects] = await Promise.all([loadCatalogAssets(), listProjects()]);
  const options = getCatalogFilterOptions(catalog);
  const featuredAssets = catalog.slice(0, 8);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={`${buildGlassSurfaceClassName("hero")} rounded-[30px] p-6`}>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            {buildShellCommandTitle("cat", "README.md")}
          </p>
          <div className="mt-4 space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-ink">
              Build project-ready spec bundles from reusable rules, templates, and agent roles.
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-400">
              Search the repo-backed catalog, compose project context, refine drafts, and review
              export bundles without leaving the workspace.
            </p>
          </div>
          <form action="/discover" className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                {buildShellCommandTitle("search", "catalog")}
              </span>
              <input
                name="q"
                placeholder="$ search rules, spec templates, agent roles..."
                className={`${buildGlassSurfaceClassName("input")} w-full rounded-[22px] px-4 py-4 text-base text-ink outline-none transition placeholder:text-slate-500 focus:border-emerald-300/30`}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent-strong hover:bg-accent/15"
              >
                Open discover
              </button>
              <Link
                href="/projects"
                className={`${buildGlassInteractiveClassName("neutral")} rounded-[16px] px-4 py-2 text-sm font-medium`}
              >
                Open projects
              </Link>
            </div>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "catalog assets", value: String(catalog.length) },
            { label: "projects", value: String(projects.length) },
            {
              label: "rules",
              value: String(catalog.filter((asset) => asset.type === "rule").length)
            },
            {
              label: "agent roles",
              value: String(catalog.filter((asset) => asset.type === "agent_role").length)
            }
          ].map((stat) => (
            <div key={stat.label} className={`${buildGlassSurfaceClassName("panel")} rounded-[24px] p-5`}>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                {buildShellCommandTitle("echo", stat.label)}
              </p>
              <p className="mt-4 text-4xl font-semibold text-ink">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-6">
          <div className={`${buildGlassSurfaceClassName("panel")} rounded-[24px] p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {buildShellCommandTitle("ls", "filters/")}
            </p>
            <form action="/discover" className="mt-4 space-y-4">
              <label className="block space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                  direction
                </span>
                <select
                  name="direction"
                  className={`${buildGlassSurfaceClassName("input")} w-full rounded-[18px] px-4 py-3 text-sm text-ink outline-none`}
                >
                  <option value="">all</option>
                  {options.directions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                  type
                </span>
                <select
                  name="type"
                  className={`${buildGlassSurfaceClassName("input")} w-full rounded-[18px] px-4 py-3 text-sm text-ink outline-none`}
                >
                  <option value="">all</option>
                  {options.types.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                  stack
                </span>
                <select
                  name="stack"
                  className={`${buildGlassSurfaceClassName("input")} w-full rounded-[18px] px-4 py-3 text-sm text-ink outline-none`}
                >
                  <option value="">all</option>
                  {options.stacks.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                  tag
                </span>
                <select
                  name="tag"
                  className={`${buildGlassSurfaceClassName("input")} w-full rounded-[18px] px-4 py-3 text-sm text-ink outline-none`}
                >
                  <option value="">all</option>
                  {options.tags.slice(0, 12).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className={`${buildGlassInteractiveClassName("neutral")} rounded-[16px] px-4 py-2 text-sm font-medium`}
              >
                Run query
              </button>
            </form>
          </div>

          <div className={`${buildGlassSurfaceClassName("panel")} rounded-[24px] p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {buildShellCommandTitle("ls", "tags/")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {options.tags.slice(0, 10).map((tag) => (
                <Link
                  key={tag}
                  href={`/discover?tag=${tag}`}
                  className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <section className={`${buildGlassSurfaceClassName("panel")} rounded-[24px] p-5`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                {buildShellCommandTitle("ls", "catalog/")}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">Starter results</h2>
            </div>
            <Link href="/discover" className="text-sm font-medium text-accent-strong">
              open full search
            </Link>
          </div>
          <div className="mt-5 divide-y divide-line">
            {featuredAssets.map((asset) => (
              <Link
                key={asset.id}
                href={`/discover/${asset.id}`}
                className={`${buildGlassSurfaceClassName("result")} block rounded-[24px] px-5 py-4 transition`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent-strong">
                    {asset.type}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    {asset.direction}
                  </span>
                  <span className="font-mono text-[11px] text-slate-600">{asset.sourcePath}</span>
                </div>
                <h3 className="mt-2 text-lg font-medium text-ink">{asset.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">{asset.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {asset.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className={`${buildGlassSurfaceClassName("panel")} rounded-[24px] p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {buildShellCommandTitle("ls", "resources/")}
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <Link href="/discover" className="block hover:text-ink">
                discover catalog assets
              </Link>
              <Link href="/projects" className="block hover:text-ink">
                inspect project workspaces
              </Link>
              <Link href="/drafts" className="block hover:text-ink">
                open draft studio
              </Link>
              <Link href="/exports" className="block hover:text-ink">
                review export snapshots
              </Link>
            </div>
          </div>

          <div className={`${buildGlassSurfaceClassName("panel")} rounded-[24px] p-5`}>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {buildShellCommandTitle("ls", "projects/")}
            </p>
            <div className="mt-4 space-y-4">
              {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`${buildGlassSurfaceClassName("result")} block rounded-[22px] px-4 py-4`}
              >
                  <p className="text-sm font-medium text-ink">{project.name}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    {project.projectType} / {project.architecture}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{project.stacks.join(", ")}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className={`${buildGlassSurfaceClassName("hero")} rounded-[30px] p-6`}>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          {buildShellCommandTitle("cat", "workflow.md")}
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 text-sm leading-7 text-slate-400">
            <p>
              `spec-web-ui` is a catalog-first workspace. The catalog stays repo-backed. Projects
              consume rules, templates, and agent roles as composable assets.
            </p>
            <p>
              The product loop is intentionally narrow: discover assets, assemble a project,
              refine the draft, then review export diffs before handoff.
            </p>
          </div>
          <div className="space-y-2 font-mono text-sm text-slate-300">
            <p>1. discover - search reusable assets</p>
            <p>2. workspace - assemble project composition</p>
            <p>3. draft - write the structured spec</p>
            <p>4. export - review the generated bundle</p>
          </div>
        </div>
      </section>
    </div>
  );
}
