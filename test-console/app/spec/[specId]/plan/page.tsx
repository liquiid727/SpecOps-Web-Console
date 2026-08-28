import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { buildReadinessSummary, getSpecBundle } from "@/lib/data";

export default async function TestPlanPage({
  params,
}: {
  params: Promise<{ specId: string }>;
}) {
  const { specId } = await params;
  const { plan, latestRun } = await getSpecBundle(specId);

  if (!plan || !latestRun) {
    notFound();
  }

  const readiness = buildReadinessSummary(plan, latestRun);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-10">
      <header>
        <Link href={`/spec/${specId}`} className="text-sm text-indigo-300">← 返回 Spec 详情</Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">Test Plan Matrix</h1>
        <p className="mt-2 text-sm text-muted">
          {plan.featureName} · {plan.specId} · v{plan.specVersion}
        </p>
      </header>

      <SectionCard title="Release Gates" description="这些 gate 决定当前 change 是否具备发布证据。">
        <div className="grid gap-4 md:grid-cols-2">
          {readiness.requiredGates.map((gate) => (
            <div key={gate.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-white">{gate.id}</div>
                <StatusPill label={gate.blocking ? "blocked" : "warning"} />
              </div>
              <div className="mt-2 text-sm text-muted">{gate.type}</div>
              <div className="mt-3 text-xs text-slate-300">required: {gate.requiredTestTypes.join(", ")}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Production Standard Compliance" description="按 specos-test-standard 展示风险等级、owner agent、证据要求和当前状态。">
        <div className="space-y-3">
          {(plan.standardRequirements ?? []).map((requirement) => {
            const matches = readiness.standardCompliance.filter((item) => item.requirementId === requirement.id);
            const status = matches.some((item) => item.status === "failed")
              ? "fail"
              : matches.some((item) => item.status === "missing")
                ? "warning"
                : matches.length > 0
                  ? "pass"
                  : "pending";
            return (
              <div key={requirement.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{requirement.id}</div>
                    <div className="mt-1 text-muted">{requirement.layer} · owner: {requirement.ownerAgent}</div>
                  </div>
                  <StatusPill label={status} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-800 p-3">risk: {requirement.requiredFor.join(", ")}</div>
                  <div className="rounded-lg border border-slate-800 p-3">evidence: {requirement.requiredEvidence.join(", ")}</div>
                  <div className="rounded-lg border border-slate-800 p-3">impact: {requirement.gateImpact}</div>
                </div>
                <div className="mt-3 text-slate-300">applies to: {requirement.appliesTo.join("; ")}</div>
              </div>
            );
          })}
          {plan.standardRequirements?.length ? null : <div className="text-sm text-muted">No production standard requirements yet.</div>}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Endpoints">
          <div className="space-y-3">
            {plan.endpoints.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm">
                <div className="font-medium text-white">{endpoint.name}</div>
                <div className="mt-1 text-muted">{endpoint.method} {endpoint.path}</div>
                <div className="mt-3 text-slate-300">priority: {endpoint.priority}</div>
                <div className="mt-1 text-slate-300">branches: {endpoint.branches.join(", ")}</div>
                <div className="mt-1 text-slate-300">rule: {endpoint.relatedRule}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Scenarios">
          <div className="space-y-3">
            {plan.scenarios.map((scenario) => (
              <div key={scenario.name} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm">
                <div className="font-medium text-white">{scenario.name}</div>
                <div className="mt-1 text-muted">{scenario.priority} · {scenario.branches.join(", ")}</div>
                <div className="mt-3 text-slate-300">steps: {scenario.steps.join(" -> ")}</div>
                <div className="mt-1 text-slate-300">expected: {scenario.expectedResults.join("; ")}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
