import React from "react";

import { WindowSection } from "@/components/ui/window-section";
import { buildNeoSurfaceClassName } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function TestUiDemoPanel({
  copy
}: {
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    summary: readonly { label: string; value: string; tone: "blue" | "amber" | "mint" }[];
    flowLabel: string;
    columns: readonly string[];
    columnNotes: readonly string[];
    flows: readonly {
      spec: string;
      scenario: string;
      chain: string;
      standard: string;
      result: string;
      status: string;
    }[];
  };
}) {
  return (
    <WindowSection
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      variant="plain"
      tint="mint"
      contentClassName="space-y-4"
    >
      <div className={cn(buildNeoSurfaceClassName("panel", "neutral"), "p-3")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">SpecOS Test Console</p>
            <h3 className="mt-1 text-base font-medium text-ink">reward-order · run-2026-04-24</h3>
          </div>
          <span className="neo-status neo-status-blocked">
            blocked
          </span>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {copy.summary.map((item) => (
            <div key={item.label} className={cn(buildNeoSurfaceClassName("row", item.tone), "px-3 py-3")}>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-line bg-canvas/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-ink">{copy.flowLabel}</h4>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              <span>pass</span>
              <span className="h-2 w-2 rounded-full bg-rose-400/70" />
              <span>fail</span>
              <span className="h-2 w-2 rounded-full bg-amber-400/70" />
              <span>blocked</span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto pb-1">
            <div className="min-w-[960px]">
              <div className="grid grid-cols-5 gap-3">
                {copy.columns.map((column, index) => (
                  <div key={column} className="space-y-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">{column}</div>
                    <div className="text-[11px] leading-4 text-slate-500">{copy.columnNotes[index]}</div>
                  </div>
                ))}
              </div>

              <div className="mt-2 space-y-2">
                {copy.flows.map((flow, index) => {
                  const tone =
                    flow.status === "pass" ? "mint" : flow.status === "fail" ? "amber" : "neutral";
                    const statusClassName =
                      flow.status === "pass"
                      ? "neo-status neo-status-pass"
                      : flow.status === "fail"
                        ? "neo-status neo-status-fail"
                        : "neo-status neo-status-blocked";

                  return (
                    <div key={`${flow.scenario}-${flow.chain}`} className="grid grid-cols-5 items-stretch gap-3">
                      {[flow.spec, flow.scenario, flow.chain, flow.standard, flow.result].map((value, valueIndex) => (
                        <div key={`${value}-${valueIndex}`} className="relative">
                          {valueIndex > 0 ? (
                            <span className="absolute -left-3 top-1/2 h-px w-3 bg-line" aria-hidden="true" />
                          ) : null}
                          {valueIndex < 4 ? (
                            <span className="absolute -right-3 top-1/2 h-px w-3 bg-line" aria-hidden="true" />
                          ) : null}
                          <div
                            className={cn(
                              buildNeoSurfaceClassName("row", valueIndex === 4 ? tone : "neutral"),
                              "flex min-h-[72px] items-center px-3 py-2 text-sm leading-5 text-ink",
                              valueIndex === 0 && index > 0 ? "opacity-55" : null
                            )}
                          >
                            <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                              {valueIndex === 0
                                ? "input"
                                : valueIndex === 1
                                  ? "split"
                                  : valueIndex === 2
                                    ? "chain"
                                    : valueIndex === 3
                                      ? "rule"
                                      : "result"}
                            </span>
                            <span>{value}</span>
                            {valueIndex === 4 ? (
                              <span className={cn("ml-auto shrink-0 rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]", statusClassName)}>
                                {flow.status}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WindowSection>
  );
}
