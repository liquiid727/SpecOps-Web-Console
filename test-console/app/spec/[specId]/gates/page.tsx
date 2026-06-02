import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { buildReadinessSummary, getSpecBundle } from "@/lib/data";

export default async function GateReportPage({
  params,
}: {
  params: Promise<{ specId: string }>;
}) {
  const { specId } = await params;
  const { plan, latestRun } = await getSpecBundle(specId);

  if (!latestRun) {
    notFound();
  }

  const readiness = buildReadinessSummary(plan, latestRun);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <Link href={`/spec/${specId}`} className="text-sm text-indigo-300">← 返回 Spec 详情</Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white">Gate Report</h1>
            <p className="mt-2 text-sm text-muted">{latestRun.specId} · v{latestRun.specVersion} · {latestRun.runId}</p>
          </div>
          <StatusPill label={readiness.decision} />
        </div>
      </header>

      <SectionCard title="Required Gates">
        <div className="space-y-3">
          {readiness.requiredGates.map((gate) => (
            <div key={gate.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-medium text-white">{gate.id}</div>
                <StatusPill label={gate.blocking ? "blocked" : "warning"} />
              </div>
              <div className="mt-2 text-sm text-muted">{gate.type}</div>
              <div className="mt-2 text-sm text-slate-300">required: {gate.requiredTestTypes.join(", ")}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Missing Evidence">
          <ul className="space-y-3 text-sm">
            {readiness.missingEvidence.map((item) => (
              <li key={item} className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-amber-100">{item}</li>
            ))}
            {readiness.missingEvidence.length === 0 ? <li className="text-muted">No missing evidence.</li> : null}
          </ul>
        </SectionCard>
        <SectionCard title="Blockers">
          <ul className="space-y-3 text-sm">
            {readiness.blockers.map((item) => (
              <li key={item} className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-3 text-rose-100">{item}</li>
            ))}
            {readiness.blockers.length === 0 ? <li className="text-muted">No blockers.</li> : null}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Standard Compliance">
        <div className="space-y-3">
          {readiness.standardCompliance.map((item) => (
            <div key={`${item.requirementId}-${item.summary}`} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-white">{item.requirementId}</div>
                  <div className="mt-1 text-muted">{item.riskTier} · {item.ownerAgent} · {item.gateImpact}</div>
                </div>
                <StatusPill label={item.status === "passed" ? "pass" : item.status === "failed" ? "fail" : item.status === "missing" ? "warning" : "warning"} />
              </div>
              <div className="mt-2 text-slate-300">{item.summary}</div>
            </div>
          ))}
          {readiness.standardCompliance.length === 0 ? <div className="text-sm text-muted">No standard compliance evidence.</div> : null}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Risk Summary">
          <div className="grid gap-3 md:grid-cols-3">
            {(["P0", "P1", "P2"] as const).map((risk) => (
              <div key={risk} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm">
                <div className="text-lg font-semibold text-white">{risk}</div>
                <div className="mt-2 text-slate-300">passed: {readiness.riskSummary[risk].passed}</div>
                <div className="text-slate-300">failed: {readiness.riskSummary[risk].failed}</div>
                <div className="text-slate-300">missing: {readiness.riskSummary[risk].missing}</div>
                <div className="text-rose-200">blocked: {readiness.riskSummary[risk].blocked}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Agent Evidence Summary">
          <div className="space-y-3">
            {readiness.agentEvidenceSummary.map((item) => (
              <div key={item.ownerAgent} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm">
                <div className="font-medium text-white">{item.ownerAgent}</div>
                <div className="mt-2 text-slate-300">passed {item.passed} · failed {item.failed} · missing {item.missing}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
