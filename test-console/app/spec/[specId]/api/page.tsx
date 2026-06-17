import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getSpecBundle } from "@/lib/data";

export default async function ApiTestPage({
  params,
}: {
  params: Promise<{ specId: string }>;
}) {
  const { specId } = await params;
  const { plan, latestRun } = await getSpecBundle(specId);

  if (!latestRun) {
    notFound();
  }

  const apiItems = latestRun.items.filter((item) => item.testType === "api");

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-10">
      <header>
        <Link href={`/spec/${specId}`} className="text-sm text-indigo-300">← 返回 Spec 详情</Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">API Test View</h1>
        <p className="mt-2 text-sm text-muted">
          Swagger-like endpoint visibility with SpecOS test semantics.
        </p>
      </header>

      <SectionCard title="API Assertions" description="接口文档、分支覆盖、性能摘要和证据都来自 normalized result。">
        <div className="space-y-4">
          {(plan?.endpoints ?? []).map((endpoint) => {
            const target = `${endpoint.method} ${endpoint.path}`;
            const runItem = apiItems.find((item) => item.target === target);
            return (
              <div key={target} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-medium text-white">{endpoint.name}</div>
                    <div className="mt-1 text-sm text-muted">{target}</div>
                  </div>
                  <StatusPill label={runItem?.status ?? "pending"} />
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-lg border border-slate-800 p-3">branches: {endpoint.branches.join(", ")}</div>
                  <div className="rounded-lg border border-slate-800 p-3">p95: {runItem?.endpoint?.p95Ms ?? "—"} ms</div>
                  <div className="rounded-lg border border-slate-800 p-3">error: {runItem?.endpoint?.errorRate ?? "—"}</div>
                  <div className="rounded-lg border border-slate-800 p-3">rule: {endpoint.relatedRule}</div>
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-lg border border-slate-800 p-3">request: {runItem?.evidence?.requestSummary ?? endpoint.preconditions.join("; ")}</div>
                  <div className="rounded-lg border border-slate-800 p-3">response: {runItem?.evidence?.responseSummary ?? endpoint.expectedResults.join("; ")}</div>
                  <div className="rounded-lg border border-slate-800 p-3">security: {plan?.securityPolicy?.baseline ?? "not configured"}</div>
                </div>
                <div className="mt-3 text-xs text-slate-300">
                  owner: {runItem?.ownerAgent ?? "test-editor"} · requirement: {runItem?.requirementId ?? "pending"} · evidence: {runItem?.artifactRefs?.map((ref) => ref.type).join(", ") ?? "missing"}
                </div>
                <p className="mt-3 text-sm text-muted">{runItem?.summary ?? "No API run evidence yet."}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </main>
  );
}
