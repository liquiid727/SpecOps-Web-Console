import React from "react";

function iconTone(status: string) {
  if (status === "pass" || status === "ready") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (status === "warning" || status === "running" || status === "partial" || status === "stale") {
    return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  }
  if (status === "pending" || status === "empty") return "bg-slate-500/10 text-slate-300 border-slate-500/20";
  return "bg-rose-500/15 text-rose-300 border-rose-500/30";
}

function symbolFor(status: string) {
  if (status === "pass" || status === "ready") return "✓";
  if (status === "warning" || status === "running" || status === "partial" || status === "stale") return "!";
  if (status === "pending" || status === "empty") return "…";
  return "×";
}

export function StatusIcon({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-semibold ${iconTone(
        status,
      )} ${compact ? "h-5 w-5 text-[11px]" : "h-7 w-7 text-sm"}`}
      aria-label={status}
      title={status}
    >
      {symbolFor(status)}
    </span>
  );
}
