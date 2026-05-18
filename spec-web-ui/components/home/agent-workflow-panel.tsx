import React from "react";

import { buildGlassSurfaceClassName } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { WindowSection } from "@/components/ui/window-section";

type AgentTrack = {
  name: string;
  role: string;
  description: string;
  points: readonly string[];
};

export function AgentWorkflowPanel({
  copy
}: {
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    stages: readonly string[];
    gate: string;
    tracks: readonly AgentTrack[];
  };
}) {
  return (
    <WindowSection
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      variant="plain"
      tint="blue"
      contentClassName="space-y-5"
    >
      <div className="space-y-3">
        <div className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">flow</div>
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
          {copy.stages.map((stage, index) => (
            <li
              key={stage}
              className={cn(
                buildGlassSurfaceClassName("row", index < 2 ? "blue" : index === copy.stages.length - 1 ? "mint" : "neutral"),
                "rounded-lg px-3 py-3 text-sm text-ink"
              )}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{String(index + 1).padStart(2, "0")}</span>
              <div className="mt-1 leading-5">{stage}</div>
            </li>
          ))}
        </ol>
      </div>

      <div className={cn(buildGlassSurfaceClassName("row", "mint"), "rounded-lg px-4 py-3 text-sm leading-6 text-slate-600")}>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">gate</span>
        <p className="mt-1 text-ink">{copy.gate}</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {copy.tracks.map((track, index) => (
          <article
            key={track.name}
            className={cn(
              buildGlassSurfaceClassName("panel", index === 0 ? "violet" : index === 1 ? "blue" : "amber"),
              "rounded-lg p-4"
            )}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{track.name}</p>
            <h3 className="mt-1 text-base font-medium text-ink">{track.role}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{track.description}</p>
            <ul className="mt-3 space-y-2 text-sm text-ink">
              {track.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </WindowSection>
  );
}
