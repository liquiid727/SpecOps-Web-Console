import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { buildScenarioChains, getSpecBundle } from "@/lib/data";
import { statusPanelTone } from "@/lib/format";

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ specId: string }>;
}) {
  const { specId } = await params;
  const { plan, latestRun } = await getSpecBundle(specId);

  if (!latestRun) {
    notFound();
  }

  const chains = buildScenarioChains(plan, latestRun);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-10">
      <header>
        <Link href={`/spec/${specId}`} className="text-sm text-indigo-300">← 返回 Spec 详情</Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">Scenario / E2E View</h1>
        <p className="mt-2 text-sm text-muted">
          Business journeys rendered from normalized scenario results, not raw Playwright output.
        </p>
      </header>

      <SectionCard title="Scenario Chains" description="按业务场景链条展示步骤推进、分支命中和当前证据。">
        <div className="space-y-4">
          {chains.map((chain) => (
            <div key={chain.name} className={`rounded-xl border p-4 ${statusPanelTone(chain.overallStatus)}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-medium text-white">{chain.name}</div>
                  <div className="mt-1 text-sm text-muted">{chain.priority} · {chain.branches.join(", ")}</div>
                </div>
                <StatusPill label={chain.overallStatus} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-800 p-3 text-sm">
                  <div className="font-medium text-white">Preconditions</div>
                  <div className="mt-2 text-muted">{chain.preconditions.join("; ") || "—"}</div>
                </div>
                <div className="rounded-lg border border-slate-800 p-3 text-sm">
                  <div className="font-medium text-white">Expected Results</div>
                  <div className="mt-2 text-muted">{chain.expectedResults.join("; ") || "—"}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {chain.steps.map((step, index) => (
                  <div key={`${chain.name}-${step.name}`} className={`min-w-[220px] flex-1 rounded-xl border p-3 ${statusPanelTone(step.status)}`}>
                    <div className="text-xs uppercase tracking-wide text-muted">Step {index + 1}</div>
                    <div className="mt-1 text-sm font-medium text-white">{step.name}</div>
                    <div className="mt-2"><StatusPill label={step.status} /></div>
                    {step.note ? <div className="mt-2 text-sm text-muted">{step.note}</div> : null}
                    {step.traceId ? <div className="mt-1 text-xs text-indigo-300">trace: {step.traceId}</div> : null}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-slate-800 p-3 text-xs text-slate-300">
                E2E evidence: {chain.branchRuns.flatMap((item) => item.artifactRefs?.map((ref) => ref.type) ?? []).join(", ") || "missing"}
              </div>
            </div>
          ))}
          {chains.length === 0 ? <div className="text-sm text-muted">No scenario evidence yet.</div> : null}
        </div>
      </SectionCard>
    </main>
  );
}
