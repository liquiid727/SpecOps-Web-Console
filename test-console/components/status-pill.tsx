import React from "react";
import { statusTone } from "@/lib/format";
import { StatusIcon } from "@/components/status-icon";

export function StatusPill({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-medium uppercase tracking-wide ${statusTone(
        label,
      )}`}
    >
      <StatusIcon status={label} compact />
      {label}
    </span>
  );
}
