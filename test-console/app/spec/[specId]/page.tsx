import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RerunSpecForm } from "@/components/rerun-spec-form";
import { SectionCard } from "@/components/section-card";
import { StatusIcon } from "@/components/status-icon";
import { StatusPill } from "@/components/status-pill";
import {
  buildApiTopologyTree,
  buildBusinessFlowMapFromPlan,
  buildReadinessSummary,
  buildScenarioChains,
  getSpecBundle,
} from "@/lib/data";
import { statusPanelTone } from "@/lib/format";

export default async function SpecPage({
  params,
}: {
  params: Promise<{ specId: string }>;
}) {
  const { specId } = await params;
  const { plan, latestRun: run, allRuns, allSessions } = await getSpecBundle(specId);

  if (!run) {
    notFound();
  }

  const apiItems = run.items.filter((item) => item.testType === "api");
  const scenarioChains = buildScenarioChains(plan, run);
  const businessFlow = buildBusinessFlowMapFromPlan(plan, scenarioChains, run);
  const apiTopology = buildApiTopologyTree(plan, run, businessFlow);
  const readiness = buildReadinessSummary(plan, run);
  const performanceItems = run.items.filter((item) => item.testType === "performance" || item.testType === "latency");
  const concurrencyItems = run.items.filter((item) => item.testType === "concurrency");
  const isLatestGenerated = allRuns[0]?.runId === run.runId;
  const latestSession = allSessions[0];
  const failedCompliance = readiness.standardCompliance.filter((item) => item.status === "failed" || item.status === "missing");
  const sessionState = !latestSession
    ? "empty"
    : latestSession.specVersion !== run.specVersion || latestSession.changeId !== run.changeId
      ? "stale"
      : latestSession.scope !== "all" && readiness.decision !== "ready"
        ? "partial"
        : latestSession.status;
  const nextStep =
    failedCompliance[0]?.ownerAgent
      ? `Rerun ${failedCompliance[0].ownerAgent.replace("-agent", "")} scope after fixing ${failedCompliance[0].requirementId}.`
      : readiness.decision === "ready"
        ? "Gate is ready. Review evidence before promote/release."
        : "Run all scopes to refresh normalized evidence.";

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3">
        <Link href="/" className="text-sm text-indigo-300">
          ← 返回总览
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">{run.featureName}</h1>
            <p className="mt-2 text-sm text-muted">
              {run.specId} · v{run.specVersion} · 围绕业务场景与接口状态展示，不暴露底层框架细节。
              {plan ? ` 当前 plan 含 ${plan.endpoints.length} 个接口、${plan.scenarios.length} 个场景。` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusPill label={run.releaseDecision} />
            <div className="text-sm text-muted">Use the Run Panel below for scoped reruns.</div>
          </div>
        </div>
      </header>

      {isLatestGenerated ? (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-sm text-emerald-100">
          当前展示的是该 Spec 最新生成结果：{run.runId}
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-sm">
        <Link href={`/spec/${run.specId}/plan`} className="text-indigo-300">Test Plan</Link>
        <Link href={`/spec/${run.specId}/api`} className="text-indigo-300">API Tests</Link>
        <Link href={`/spec/${run.specId}/scenario`} className="text-indigo-300">Scenario / E2E</Link>
        <Link href={`/spec/${run.specId}/performance`} className="text-indigo-300">Performance</Link>
        <Link href={`/spec/${run.specId}/concurrency`} className="text-indigo-300">Concurrency</Link>
        <Link href={`/spec/${run.specId}/gates`} className="text-indigo-300">Gate Report</Link>
      </nav>

      <SectionCard title="Summary" description="先看结论和阻塞，再决定是否下钻。">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-sm text-muted">总体状态</div>
            <div className="mt-2">
              <StatusPill label={run.status} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-sm text-muted">Gate 结论</div>
            <div className="mt-2">
              <StatusPill label={readiness.decision} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-sm text-muted">阻塞原因</div>
            <ul className="mt-2 space-y-2 text-sm text-white">
              {readiness.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
              {readiness.blockers.length === 0 ? <li className="text-muted">暂无阻塞项</li> : null}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-sm text-muted">缺失证据</div>
            <ul className="mt-2 space-y-2 text-sm text-white">
              {readiness.missingEvidence.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
              {readiness.missingEvidence.length === 0 ? <li className="text-muted">暂无缺失证据</li> : null}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Developer Test Loop" description="开发者本地闭环：选择 scope、运行受控命令、查看 session、定位失败、按最小范围重跑。">
        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr_1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-sm font-medium text-white">Run Panel</div>
            <p className="mt-2 text-sm text-muted">
              支持 unit、API、Scenario/E2E、Performance、Concurrency、Gate 和 All scopes。
            </p>
            <div className="mt-4">
              <RerunSpecForm specId={run.specId} specVersion={run.specVersion} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Current Session</div>
                <div className="mt-1 text-sm text-muted">
                  {latestSession ? `${latestSession.runId} · ${latestSession.scope}` : "No run session yet"}
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="text-xs uppercase tracking-wide text-muted">Session State</div>
                <StatusPill label={sessionState} />
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-lg border border-slate-800 p-3">exit: {latestSession?.exitCode ?? "—"}</div>
              <div className="rounded-lg border border-slate-800 p-3">commands: {latestSession?.commands.length ?? 0}</div>
              <div className="rounded-lg border border-slate-800 p-3">artifacts: {latestSession?.resultArtifacts.length ?? 0}</div>
              <div className="rounded-lg border border-slate-800 p-3">gate: {latestSession?.gateReportPath ?? "—"}</div>
            </div>
            {latestSession?.stderrSummary ? (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg border border-rose-900/40 bg-rose-950/20 p-3 text-xs text-rose-100">
                {latestSession.stderrSummary}
              </pre>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-sm font-medium text-white">Failure Inspector</div>
            <p className="mt-2 text-sm text-muted">{nextStep}</p>
            <div className="mt-4 space-y-3">
              {failedCompliance.slice(0, 3).map((item) => (
                <div key={`${item.requirementId}-${item.summary}`} className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3 text-sm">
                  <div className="font-medium text-amber-100">{item.requirementId}</div>
                  <div className="mt-1 text-amber-100">{item.ownerAgent} · {item.riskTier} · {item.gateImpact}</div>
                  <div className="mt-2 text-slate-200">{item.summary}</div>
                  <div className="mt-2 text-xs text-indigo-200">rerun: {item.ownerAgent.includes("performance") ? "performance" : item.ownerAgent.includes("concurrency") ? "concurrency" : item.ownerAgent.includes("bruno") ? "api" : "scenario"}</div>
                </div>
              ))}
              {failedCompliance.length === 0 ? <div className="text-sm text-muted">No failed or missing standard evidence.</div> : null}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Run Session Timeline" description="按最近运行展示本地控制台命令、状态和生成 artifact。">
        <div className="space-y-3">
          {allSessions.slice(0, 5).map((session) => (
            <div key={session.runId} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-white">{session.runId}</div>
                  <div className="mt-1 text-muted">{session.scope} · {session.startedAt} → {session.endedAt}</div>
                </div>
                <StatusPill label={session.status} />
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {session.commands.map((command) => (
                  <div key={`${session.runId}-${command.scope}-${command.startedAt}`} className="rounded-lg border border-slate-800 p-3">
                    <div className="font-medium text-white">{command.scope}</div>
                    <div className="mt-1 text-muted">exit {command.exitCode}</div>
                    <div className="mt-1 text-xs text-slate-300">{command.command} {command.args.join(" ")}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {allSessions.length === 0 ? <div className="text-sm text-muted">No run session artifacts yet.</div> : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Test Plan Matrix"
        description="从 spec 派生出的测试设计，不从具体实现或框架输出反推。"
      >
        {plan ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-sm font-medium text-white">Endpoints</div>
              <div className="mt-3 space-y-3">
                {plan.endpoints.map((endpoint) => (
                  <div key={`${endpoint.method}-${endpoint.path}`} className="rounded-lg border border-slate-800 p-3 text-sm">
                    <div className="font-medium text-white">{endpoint.name}</div>
                    <div className="mt-1 text-muted">{endpoint.method} {endpoint.path}</div>
                    <div className="mt-2 text-xs text-slate-300">branches: {endpoint.branches.join(", ")}</div>
                    <div className="mt-1 text-xs text-slate-300">rule: {endpoint.relatedRule}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-sm font-medium text-white">Scenarios</div>
              <div className="mt-3 space-y-3">
                {plan.scenarios.map((scenario) => (
                  <div key={scenario.name} className="rounded-lg border border-slate-800 p-3 text-sm">
                    <div className="font-medium text-white">{scenario.name}</div>
                    <div className="mt-1 text-muted">{scenario.priority} · {scenario.branches.join(", ")}</div>
                    <div className="mt-2 text-xs text-slate-300">steps: {scenario.steps.join(" → ")}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-sm font-medium text-white">Release Gates</div>
              <div className="mt-3 space-y-3">
                {readiness.requiredGates.map((gate) => (
                  <div key={gate.id} className="rounded-lg border border-slate-800 p-3 text-sm">
                    <div className="font-medium text-white">{gate.id}</div>
                    <div className="mt-1 text-muted">{gate.type} · {gate.blocking ? "blocking" : "non-blocking"}</div>
                    <div className="mt-2 text-xs text-slate-300">required: {gate.requiredTestTypes.join(", ")}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted">没有找到对应的 test-plan。</div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Performance / Latency"
          description="展示 SLO、p95/p99、错误率和原始报告证据。"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm text-muted">当前状态</div>
            <StatusPill label={readiness.performanceStatus} />
          </div>
          <div className="space-y-3">
            {performanceItems.map((item) => (
              <div key={`${item.testType}-${item.target}`} className={`rounded-xl border p-4 ${statusPanelTone(item.status === "running" ? "warning" : item.status)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{item.target}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-muted">{item.testType} · {item.gateImpact ?? "informational"}</div>
                  </div>
                  <StatusPill label={item.status} />
                </div>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-lg border border-slate-800 p-3">p95: {item.metrics?.p95Ms ?? item.slo?.p95Ms ?? "—"} ms</div>
                  <div className="rounded-lg border border-slate-800 p-3">p99: {item.metrics?.p99Ms ?? item.slo?.p99Ms ?? "—"} ms</div>
                  <div className="rounded-lg border border-slate-800 p-3">error: {item.metrics?.errorRate ?? item.slo?.errorRate ?? "—"}</div>
                </div>
                <p className="mt-3 text-sm text-muted">{item.summary}</p>
              </div>
            ))}
            {performanceItems.length === 0 ? <div className="text-sm text-muted">本轮没有 performance/latency 结果。</div> : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Concurrency / Consistency"
          description="展示并发 actor、请求数、不变量和最终状态证据。"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm text-muted">当前状态</div>
            <StatusPill label={readiness.concurrencyStatus} />
          </div>
          <div className="space-y-3">
            {concurrencyItems.map((item) => (
              <div key={`${item.testType}-${item.target}`} className={`rounded-xl border p-4 ${statusPanelTone(item.status === "running" ? "warning" : item.status)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{item.target}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-muted">{item.gateImpact ?? "informational"}</div>
                  </div>
                  <StatusPill label={item.status} />
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="text-slate-100">Invariant: {item.concurrencyProfile?.invariant ?? "—"}</div>
                  <div className="text-muted">Actors / Requests: {item.concurrencyProfile?.actors ?? "—"} / {item.concurrencyProfile?.requests ?? "—"}</div>
                  <div className="text-muted">Expected: {item.concurrencyProfile?.expectedFinalState ?? "—"}</div>
                  <div className="text-muted">Observed: {item.concurrencyProfile?.observedFinalState ?? "—"}</div>
                </div>
                <p className="mt-3 text-sm text-muted">{item.summary}</p>
              </div>
            ))}
            {concurrencyItems.length === 0 ? <div className="text-sm text-muted">本轮没有 concurrency 结果。</div> : null}
          </div>
        </SectionCard>
      </div>

      {businessFlow ? (
        <SectionCard
          title="Business Flow Map"
          description="把多个场景链条聚成更高层的业务验证地图，方便先看全流程风险。"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-medium text-white">{businessFlow.name}</div>
              <div className="text-sm text-muted">
                将场景步骤归并为统一业务阶段，先看链路卡点，再下钻到具体 scenario。
              </div>
            </div>
            <StatusPill label={businessFlow.status} />
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="flex min-w-max items-stretch gap-4">
            {businessFlow.stages.map((stage, index) => (
              <React.Fragment key={stage.name}>
                <div className={`w-[320px] shrink-0 rounded-2xl border p-4 ${statusPanelTone(stage.status)}`}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted">Stage {index + 1}</div>
                      <div className="mt-1 text-base font-semibold text-white">{stage.name}</div>
                    </div>
                    <StatusIcon status={stage.status} />
                  </div>

                  <div className="space-y-3">
                    {stage.scenarios.map((scenario) => (
                      <div
                        key={`${stage.name}-${scenario.name}`}
                        className={`rounded-xl border p-3 ${statusPanelTone(scenario.status)}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-slate-100">{scenario.name}</div>
                          <StatusIcon status={scenario.status} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {index < businessFlow.stages.length - 1 ? (
                  <div className="flex items-center justify-center text-2xl text-slate-600">→</div>
                ) : null}
              </React.Fragment>
            ))}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="API Topology"
        description="按业务阶段 -> 场景 -> 关联接口展示接口树，方便顺着业务链看接口健康度。"
      >
        {apiTopology ? (
          <div className="space-y-5">
            {apiTopology.stages.map((stage) => (
              <div key={stage.name} className={`rounded-2xl border p-4 ${statusPanelTone(stage.status)}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-base font-semibold text-white">{stage.name}</div>
                  <StatusPill label={stage.status} />
                </div>

                <div className="space-y-4">
                  {stage.scenarios.map((scenario) => (
                    <div key={`${stage.name}-${scenario.name}`} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="text-slate-500">└</div>
                          <div className="text-sm font-medium text-white">{scenario.name}</div>
                        </div>
                        <StatusPill label={scenario.status} />
                      </div>

                      <div className="mt-4 space-y-3 pl-6">
                        {scenario.endpoints.map((endpoint) => (
                          <div
                            key={`${scenario.name}-${endpoint.method}-${endpoint.path}`}
                            className={`rounded-xl border p-4 ${statusPanelTone(endpoint.status)}`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="text-slate-500">└─</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <StatusIcon status={endpoint.status} compact />
                                    <div className="text-sm font-semibold text-white">{endpoint.name}</div>
                                  </div>
                                  <div className="mt-1 text-xs text-muted">
                                    {endpoint.method} {endpoint.path}
                                  </div>
                                </div>
                              </div>
                              <StatusPill label={endpoint.status} />
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm">
                              <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
                                <div className="text-xs uppercase tracking-wide text-muted">Avg</div>
                                <div className="mt-2 text-white">{endpoint.avgMs ?? "—"} ms</div>
                              </div>
                              <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
                                <div className="text-xs uppercase tracking-wide text-muted">P95</div>
                                <div className="mt-2 text-white">{endpoint.p95Ms ?? "—"} ms</div>
                              </div>
                              <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
                                <div className="text-xs uppercase tracking-wide text-muted">错误率</div>
                                <div className="mt-2 text-white">
                                  {endpoint.errorRate !== undefined ? `${Math.round(endpoint.errorRate * 100)}%` : "—"}
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
                                <div className="text-xs uppercase tracking-wide text-muted">Rule</div>
                                <div className="mt-2 text-white">{endpoint.relatedRule ?? "—"}</div>
                              </div>
                            </div>

                            <p className="mt-3 text-sm text-muted">{endpoint.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted">当前 run 没有关联的 API 拓扑结果。</div>
        )}
      </SectionCard>

      <SectionCard
        title="Scenario Results"
        description="按业务场景链条展示步骤推进、分支命中和当前阻塞点。"
      >
        <div className="space-y-4">
          {scenarioChains.map((chain) => (
            <div key={chain.name} className={`rounded-xl border p-4 ${statusPanelTone(chain.overallStatus)}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-medium text-white">{chain.name}</div>
                  <div className="text-sm text-muted">
                    优先级：{chain.priority} · 分支：{chain.branches.join(" / ")}
                  </div>
                </div>
                <StatusPill label={chain.overallStatus} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted">前置条件</div>
                  <ul className="mt-2 space-y-2 text-sm text-white">
                    {chain.preconditions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-sm text-muted">预期结果</div>
                  <ul className="mt-2 space-y-2 text-sm text-white">
                    {chain.expectedResults.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-muted">场景链条</div>
                <div className="mt-3 flex flex-wrap items-stretch gap-3">
                  {chain.steps.map((step, index) => (
                    <React.Fragment key={step.name}>
                      <div className={`min-w-[220px] flex-1 rounded-xl border p-3 ${statusPanelTone(step.status)}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-200">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-sm font-medium text-white">{step.name}</div>
                              <div className="flex items-center gap-2">
                                <StatusIcon status={step.status} compact />
                                <StatusPill label={step.status} />
                              </div>
                            </div>
                            {step.note ? <div className="mt-2 text-sm text-muted">{step.note}</div> : null}
                            {step.traceId ? (
                              <div className="mt-1 text-xs text-indigo-300">trace: {step.traceId}</div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {index < chain.steps.length - 1 ? (
                        <div className="flex items-center justify-center text-xl text-slate-600">→</div>
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
                {chain.branchRuns.map((item) => (
                  <span key={`${chain.name}-${item.branchType}-${item.stepName}`} className="rounded-full border border-slate-700 px-3 py-1">
                    {item.branchType} · {item.status}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div>
        <Link href={`/runs/${run.runId}`} className="text-sm text-indigo-300">
          查看 Run Detail →
        </Link>
      </div>
    </main>
  );
}
