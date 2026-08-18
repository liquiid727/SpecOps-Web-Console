import Link from "next/link";
import React from "react";

import { RequirementGateBadge, RequirementStatusBadge } from "@/components/requirements/requirement-status";
import { buildNeoSurfaceClassName } from "@/lib/theme";
import type { RequirementPackageSummary } from "@/lib/types";

export function RequirementPackageCard({ requirement }: { requirement: RequirementPackageSummary }) {
  const missingFiles = Object.values(requirement.files).filter((file) => !file.present).length;

  return (
    <Link
      href={`/requirements/${encodeURIComponent(requirement.id)}`}
      className={`${buildNeoSurfaceClassName("row")} block space-y-4 px-4 py-4 transition hover:border-slate-400/50`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{requirement.id}</p>
          <h2 className="mt-1 truncate text-lg font-semibold text-ink">{requirement.title}</h2>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <RequirementStatusBadge status={requirement.status} />
          <RequirementGateBadge status={requirement.gates.package} />
        </div>
      </div>

      <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
        <span>type: {requirement.type}</span>
        <span>priority: {requirement.priority ?? "-"}</span>
        <span>issues: {requirement.issueCounts.done}/{requirement.issueCounts.total} done</span>
      </div>

      <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
        {(["prd", "spec", "test", "issues"] as const).map((document) => (
          <span key={document} className={requirement.files[document].present ? "text-ink" : "text-red-700"}>
            {document}.md {requirement.files[document].present ? "ok" : "missing"}
          </span>
        ))}
        {missingFiles ? <span className="text-red-700">{missingFiles} missing</span> : null}
      </div>
    </Link>
  );
}
