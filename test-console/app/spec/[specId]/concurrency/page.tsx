import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { buildReadinessSummary, getSpecBundle } from "@/lib/data";

export default async function ConcurrencyPage({
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
  const items = latestRun.items.filter((item) => item.testType === "concurrency");

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <Link href={`/spec/${specId}`} className="text-sm text-indigo-300">← 返回 Spec 详情</Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-white">Concurrency / Consistency</h1>
          <StatusPill label={readiness.concurrencyStatus} />
        </div>
      </header>

      <SectionCard title="Invariant Results">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={`${item.testType}-${item.target}`} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-medium text-white">{item.target}</div>
                  <div className="mt-1 text-sm text-muted">{item.gateImpact ?? "informational"}</div>
                </div>
                <StatusPill label={item.status} />
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg border border-slate-800 p-3">actors: {item.concurrencyProfile?.actors ?? "—"}</div>
                <div className="rounded-lg border border-slate-800 p-3">requests: {item.concurrencyProfile?.requests ?? "—"}</div>
                <div className="rounded-lg border border-slate-800 p-3">expected: {item.concurrencyProfile?.expectedFinalState ?? "—"}</div>
                <div className="rounded-lg border border-slate-800 p-3">observed: {item.concurrencyProfile?.observedFinalState ?? "—"}</div>
              </div>
              <div className="mt-3 text-xs text-slate-300">
                owner: {item.ownerAgent ?? "concurrency-test-agent"} · requirement: {item.requirementId ?? "pending"} · evidence: {item.artifactRefs?.map((ref) => ref.type).join(", ") ?? "missing"}
              </div>
              <p className="mt-3 text-sm text-muted">Invariant: {item.concurrencyProfile?.invariant ?? "—"}</p>
              <p className="mt-2 text-sm text-muted">{item.summary}</p>
            </div>
          ))}
          {items.length === 0 ? (
            <div className="text-sm text-muted">No concurrency result yet. owner: concurrency-test-agent</div>
          ) : null}
        </div>
      </SectionCard>
    </main>
  );
}
