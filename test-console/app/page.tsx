import React from "react";
import Link from "next/link";
import { RunTriggerForm } from "@/components/run-trigger-form";
import { SectionCard } from "@/components/section-card";
import { StatusIcon } from "@/components/status-icon";
import { StatusPill } from "@/components/status-pill";
import { getAllTestPlans, getLatestRunsBySpec } from "@/lib/data";
import { asPercent, statusPanelTone } from "@/lib/format";

export default async function Page() {
  const [plans, latestRuns] = await Promise.all([
    getAllTestPlans(),
    getLatestRunsBySpec(),
  ]);
  const latestRun = latestRuns[0];

  if (!latestRun) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">
            SpecOS Test Console
          </p>
          <h1 className="text-4xl font-semibold text-white">验证总览</h1>
          <p className="text-sm text-muted">
            还没有发现 `tests/results/*.json`。请先运行测试 runner 生成规范化结果。
          </p>
        </header>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">
          SpecOS Test Console
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-white">验证总览</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              围绕 accepted spec 展示 API 与业务场景验证结果。默认先给出结论和风险，下钻时再看接口、步骤、分支和证据。
            </p>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              可直接在下方手动选择 spec 和运行范围，触发 runner 生成新的 `tests/results/*.json` 结果。
            </p>
          </div>
          <Link
            href={`/runs/${latestRun.runId}`}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            查看最近运行
          </Link>
        </div>
      </header>

      {plans.length > 0 ? (
        <RunTriggerForm plans={plans} defaultSpecId={latestRun.specId} />
      ) : null}

      <SectionCard
        title="最新一次运行摘要"
        description="给开发者一个一眼能判断是否需要处理的结果面板。"
      >
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className={`rounded-2xl border p-5 ${statusPanelTone(latestRun.status)}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.2em] text-muted">Latest Run</div>
                <div className="mt-2 text-2xl font-semibold text-white">{latestRun.featureName}</div>
                <div className="mt-2 text-sm text-muted">
                  {latestRun.runId} · {latestRun.specId} · v{latestRun.specVersion}
                </div>
              </div>
              <StatusIcon status={latestRun.status} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                <div className="text-xs uppercase tracking-wide text-muted">发布结论</div>
                <div className="mt-2">
                  <StatusPill label={latestRun.releaseDecision} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                <div className="text-xs uppercase tracking-wide text-muted">API 通过率</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {asPercent(latestRun.summary.apiPassRate)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                <div className="text-xs uppercase tracking-wide text-muted">场景通过率</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {asPercent(latestRun.summary.scenarioPassRate)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5">
            <div className="text-sm font-medium text-white">当前阻塞项</div>
            <div className="mt-4 space-y-3">
              {latestRun.blockers.length > 0 ? (
                latestRun.blockers.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border border-amber-900/40 bg-slate-950/30 p-3">
                    <StatusIcon status="warning" compact />
                    <div className="text-sm text-slate-100">{item}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted">暂无阻塞项</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/20 p-5">
            <div className="text-sm font-medium text-white">高风险场景</div>
            <div className="mt-4 space-y-3">
              {latestRun.highRiskScenarios.length > 0 ? (
                latestRun.highRiskScenarios.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border border-rose-900/40 bg-slate-950/30 p-3">
                    <StatusIcon status="fail" compact />
                    <div className="text-sm text-slate-100">{item}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted">暂无高风险场景</div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-4">
        <SectionCard title="Spec" description="当前展示的 accepted spec">
          <div className="space-y-2 text-sm">
            <div className="font-medium text-white">{latestRun.featureName}</div>
            <div className="text-muted">
              {latestRun.specId} · v{latestRun.specVersion}
            </div>
            <StatusPill label={latestRun.status} />
          </div>
        </SectionCard>
        <SectionCard title="发布结论">
          <div className="space-y-2 text-sm">
            <StatusPill label={latestRun.releaseDecision} />
            <p className="text-muted">阻塞项 {latestRun.blockers.length} 个</p>
          </div>
        </SectionCard>
        <SectionCard title="API 通过率">
          <div className="space-y-2 text-sm">
            <div className="text-3xl font-semibold text-white">
              {asPercent(latestRun.summary.apiPassRate)}
            </div>
            <p className="text-muted">
              {latestRun.summary.totalEndpoints} 个接口纳入本轮验证
            </p>
          </div>
        </SectionCard>
        <SectionCard title="场景通过率">
          <div className="space-y-2 text-sm">
            <div className="text-3xl font-semibold text-white">
              {asPercent(latestRun.summary.scenarioPassRate)}
            </div>
            <p className="text-muted">
              {latestRun.summary.totalScenarios} 个业务场景纳入本轮验证
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Spec 总览"
        description="按 spec/feature 呈现最近一次验证状态，而不是按测试框架拆散。"
      >
        <div className="mb-4 rounded-xl border border-indigo-900/50 bg-indigo-950/30 p-3 text-sm text-indigo-100">
          本次新生成结果：{latestRun.featureName} · {latestRun.runId}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="pb-3">Feature / Spec</th>
                <th className="pb-3">最近运行</th>
                <th className="pb-3">API</th>
                <th className="pb-3">Scenario</th>
                <th className="pb-3">阻塞</th>
                <th className="pb-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {latestRuns.map((run) => (
                <tr key={run.runId} className="border-t border-slate-800">
                  <td className="py-4">
                    <div className="font-medium text-white">{run.featureName}</div>
                    <div className="text-muted">
                      {run.specId} · v{run.specVersion}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="text-white">{run.endedAt}</div>
                    <StatusPill label={run.status} />
                  </td>
                  <td className="py-4">{asPercent(run.summary.apiPassRate)}</td>
                  <td className="py-4">{asPercent(run.summary.scenarioPassRate)}</td>
                  <td className="py-4 text-amber-300">{run.blockers.join("；") || "—"}</td>
                  <td className="py-4">
                    <Link href={`/spec/${run.specId}`} className="text-indigo-300">
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="高风险场景">
          <ul className="space-y-3 text-sm">
            {latestRun.highRiskScenarios.map((item) => (
              <li key={item} className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-3">
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="覆盖缺口">
          <ul className="space-y-3 text-sm">
            {latestRun.coverageGaps.map((item) => (
              <li key={item} className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-3">
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </main>
  );
}
