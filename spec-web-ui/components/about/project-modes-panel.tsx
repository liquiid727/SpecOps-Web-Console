import React from "react";

import { WindowSection } from "@/components/ui/window-section";
import { buildGlassSurfaceClassName } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ProjectMode = {
  name: string;
  typeLabel: string;
  typeValue: string;
  treeLabel: string;
  treeCommand: string;
  tree: readonly {
    text: string;
    note?: string;
  }[];
  loadLabel: string;
  loadPath: readonly string[];
  loadNote: string;
  purposeLabel: string;
  purposeValue: string;
  structureLabel: string;
  structure: readonly string[];
  fitLabel: string;
  fit: readonly string[];
};

export function ProjectModesPanel({
  copy
}: {
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    sharedLabel: string;
    sharedPoints: readonly string[];
    modes: readonly ProjectMode[];
    decisionLabel: string;
    decision: string;
  };
}) {
  return (
    <WindowSection
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      variant="plain"
      tint="violet"
      contentClassName="space-y-4"
    >
      <div className="grid gap-3 xl:grid-cols-2">
        {copy.modes.map((mode, index) => (
          <article
            key={mode.name}
            className={cn(
              buildGlassSurfaceClassName("panel", index === 0 ? "blue" : "amber"),
              "rounded-lg p-4"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{mode.name}</p>
                <h3 className="mt-1 text-base font-medium text-ink">
                  {mode.typeLabel}: {mode.typeValue}
                </h3>
              </div>
              <span className="rounded-full border border-line bg-canvas/40 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                {mode.typeValue}
              </span>
            </div>

            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{mode.treeLabel}</dt>
                <dd className="mt-2">
                  <div className={cn(buildGlassSurfaceClassName("row", "neutral"), "overflow-x-auto rounded-lg px-3 py-3")}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">{mode.treeCommand}</p>
                    <div className="mt-2 min-w-max space-y-1 font-mono text-[11px] leading-5 text-ink">
                      {mode.tree.map((entry) => (
                        <div key={`${mode.name}-${entry.text}`} className="flex flex-wrap items-baseline gap-x-3">
                          <span>{entry.text}</span>
                          {entry.note ? <span className="text-[10px] text-slate-500">{entry.note}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </dd>
              </div>

              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{mode.loadLabel}</dt>
                <dd className="mt-2">
                  <div className={cn(buildGlassSurfaceClassName("row", index === 0 ? "blue" : "amber"), "rounded-lg px-3 py-3")}>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] leading-5 text-ink">
                      {mode.loadPath.map((step, stepIndex) => (
                        <React.Fragment key={`${mode.name}-${step}`}>
                          <span className="rounded-md border border-line bg-canvas/40 px-2 py-1">{step}</span>
                          {stepIndex < mode.loadPath.length - 1 ? <span className="text-slate-500">-&gt;</span> : null}
                        </React.Fragment>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{mode.loadNote}</p>
                  </div>
                </dd>
              </div>

              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{mode.purposeLabel}</dt>
                <dd className="mt-1 leading-6 text-ink">{mode.purposeValue}</dd>
              </div>

              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{mode.structureLabel}</dt>
                <dd className="mt-2">
                  <ul className="space-y-2 text-ink">
                    {mode.structure.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>

              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{mode.fitLabel}</dt>
                <dd className="mt-2">
                  <ul className="space-y-2 text-ink">
                    {mode.fit.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.35fr_1fr]">
        <div className={cn(buildGlassSurfaceClassName("row", "neutral"), "rounded-lg px-4 py-3")}>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{copy.sharedLabel}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            {copy.sharedPoints.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn(buildGlassSurfaceClassName("row", "mint"), "rounded-lg px-4 py-3")}>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{copy.decisionLabel}</p>
          <p className="mt-2 text-sm leading-6 text-ink">{copy.decision}</p>
        </div>
      </div>
    </WindowSection>
  );
}
