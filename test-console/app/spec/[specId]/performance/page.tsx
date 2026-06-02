import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { buildReadinessSummary, getSpecBundle } from "@/lib/data";

export default async function PerformancePage({
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
  const items = latestRun.items.filter((item) => item.testType === "performance" || item.testType === "latency");

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <Link href={`/spec/${specId}`} className="text-sm text-indigo-300">← 返回 Spec 详情</Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-white">Performance / Latency</h1>
          <StatusPill label={readiness.performanceStatus} />
        </div>
      </header>

      <SectionCard title="SLO Results">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={`${item.testType}-${item.target}`} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-medium text-white">{item.target}</div>
                  <div className="mt-1 text-sm text-muted">{item.testType} · {item.gateImpact ?? "informational"}</div>
                </div>
                <StatusPill label={item.status} />
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <div className="rounded-lg border border-slate-800 p-3">p50: {item.metrics?.p50Ms ?? "—"} ms</div>
                <div className="rounded-lg border border-slate-800 p-3">p95: {item.metrics?.p95Ms ?? item.slo?.p95Ms ?? "—"} ms</div>
                <div className="rounded-lg border border-slate-800 p-3">p99: {item.metrics?.p99Ms ?? item.slo?.p99Ms ?? "—"} ms</div>
                <div className="rounded-lg border border-slate-800 p-3">error: {item.metrics?.errorRate ?? item.slo?.errorRate ?? "—"}</div>
              </div>
              <div className="mt-3 text-xs text-slate-300">
                owner: {item.ownerAgent ?? "performance-test-agent"} · requirement: {item.requirementId ?? "pending"} · baseline: {latestRun.baselineRunId ?? "none"} · evidence: {item.artifactRefs?.map((ref) => ref.type).join(", ") ?? "missing"}
              </div>
              <p className="mt-3 text-sm text-muted">{item.summary}</p>
            </div>
          ))}
          {items.length === 0 ? (
            <div className="text-sm text-muted">
              No performance or latency result yet. owner: performance-test-agent
            </div>
          ) : null}
        </div>
      </SectionCard>
    </main>
  );
}
