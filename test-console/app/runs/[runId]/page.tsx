import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getAllTestRuns, getRunById } from "@/lib/data";

export default async function RunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const [run, allRuns] = await Promise.all([getRunById(runId), getAllTestRuns()]);

  if (!run) {
    notFound();
  }

  const isNewestRun = allRuns[0]?.runId === run.runId;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3">
        <Link href={`/spec/${run.specId}`} className="text-sm text-indigo-300">
          ← 返回 Spec 详情
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Run Detail</h1>
            <p className="mt-2 text-sm text-muted">
              {run.runId} · {run.featureName} · {run.startedAt} ~ {run.endedAt}
            </p>
          </div>
          <StatusPill label={run.status} />
        </div>
      </header>

      {isNewestRun ? (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              这是本次新生成结果，已写入选中 Spec Package 的 `evidence/artifacts/` 并成为当前最新 run。
        </div>
      ) : null}

      <SectionCard
        title="证据详情"
        description="只有在需要追查时再看底层证据，不强迫开发者先读日志。"
      >
        <div className="space-y-4">
          {run.items.map((item) => (
            <div key={`${item.testType}-${item.target}-${item.stepName ?? "root"}`} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm uppercase tracking-wide text-muted">{item.testType}</div>
                  <div className="text-lg font-medium text-white">{item.target}</div>
                  <div className="text-sm text-muted">{item.summary}</div>
                </div>
                <StatusPill label={item.status} />
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 p-3">
                  <div className="text-muted">请求摘要</div>
                  <div className="mt-1 text-white">{item.evidence?.requestSummary ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-slate-800 p-3">
                  <div className="text-muted">响应摘要</div>
                  <div className="mt-1 text-white">{item.evidence?.responseSummary ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-slate-800 p-3">
                  <div className="text-muted">Trace / 日志</div>
                  <div className="mt-1 text-white">{item.evidence?.traceId ?? "—"}</div>
                  <div className="mt-1 text-indigo-300">{item.evidence?.logUrl ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-slate-800 p-3">
                  <div className="text-muted">其他证据</div>
                  <div className="mt-1 text-white">{item.evidence?.note ?? "—"}</div>
                  <div className="mt-1 text-indigo-300">{item.evidence?.screenshotUrl ?? item.evidence?.videoUrl ?? "—"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </main>
  );
}
