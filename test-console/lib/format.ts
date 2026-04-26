export function asPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function statusTone(status: string) {
  if (status === "pass" || status === "ready") return "text-emerald-400";
  if (status === "warning" || status === "running") return "text-amber-400";
  if (status === "pending") return "text-slate-300";
  return "text-rose-400";
}

export function statusPanelTone(status: string) {
  if (status === "pass" || status === "ready") return "border-emerald-900/50 bg-emerald-950/20";
  if (status === "warning" || status === "running") return "border-amber-900/50 bg-amber-950/20";
  if (status === "pending") return "border-slate-800 bg-slate-950/20";
  return "border-rose-900/50 bg-rose-950/20";
}
