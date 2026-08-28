import Link from "next/link";
import React from "react";

import { RequirementPackageCard } from "@/components/requirements/requirement-package-card";
import { WindowSection } from "@/components/ui/window-section";
import { buildShellCommandTitle } from "@/lib/shell";
import { buildNeoSurfaceClassName } from "@/lib/theme";
import type { RequirementPackageSummary } from "@/lib/types";

export function RequirementsLibraryPage({ requirements }: { requirements: RequirementPackageSummary[] }) {
  return (
    <div className="space-y-5 md:space-y-6">
      <WindowSection
        eyebrow={buildShellCommandTitle("find", ".requirements/requirements")}
        title="Requirement Packages"
        description="读取 GoalSpec Requirement Packages；index.yaml、prd.md 与 specs/SNN-* 是唯一事实来源。"
        variant="plain"
        tint="blue"
        actions={
          <Link href="/about" className="text-sm text-slate-500 underline underline-offset-4 hover:text-ink">
            Workflow rules
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`${buildNeoSurfaceClassName("row", "neutral")} px-3 py-3`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">packages</p>
            <p className="mt-1 text-xl font-semibold text-ink">{requirements.length}</p>
          </div>
          <div className={`${buildNeoSurfaceClassName("row", "mint")} px-3 py-3`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">done</p>
            <p className="mt-1 text-xl font-semibold text-ink">{requirements.filter((item) => item.status === "done").length}</p>
          </div>
          <div className={`${buildNeoSurfaceClassName("row", "amber")} px-3 py-3`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">blocked</p>
            <p className="mt-1 text-xl font-semibold text-ink">{requirements.filter((item) => item.gates.package === "block").length}</p>
          </div>
        </div>
      </WindowSection>

      {requirements.length ? (
        <section aria-label="Requirement packages" className="grid gap-3 md:grid-cols-2">
          {requirements.map((requirement) => <RequirementPackageCard key={requirement.id} requirement={requirement} />)}
        </section>
      ) : (
        <WindowSection title="No active packages" description="The repository has no .requirements/requirements/R0NN-* package yet." variant="plain" tint="amber">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>Examples and templates are intentionally excluded from this view.</p>
            <Link href="/spec-templates" className="inline-block text-ink underline underline-offset-4 hover:text-accent-strong">
              Browse Requirement Package templates
            </Link>
          </div>
        </WindowSection>
      )}
    </div>
  );
}
