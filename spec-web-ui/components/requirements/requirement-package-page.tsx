import Link from "next/link";
import React from "react";

import { RequirementGateBadge, RequirementStatusBadge } from "@/components/requirements/requirement-status";
import { WindowSection } from "@/components/ui/window-section";
import { buildNeoSurfaceClassName } from "@/lib/theme";
import { getRequirementDocumentLabel } from "@/lib/requirements";
import type { RequirementDocument, RequirementPackageDetail } from "@/lib/types";

const documentOrder: RequirementDocument[] = ["prd", "spec", "test", "issues"];

function GateRow({ label, status }: { label: string; status: RequirementPackageDetail["gates"]["package"] }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2 last:border-b-0">
      <span className="text-sm text-ink">{label}</span>
      <RequirementGateBadge status={status} />
    </div>
  );
}

function PackageSummary({ requirement }: { requirement: RequirementPackageDetail }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className={`${buildNeoSurfaceClassName("panel", "blue")} space-y-3 p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{requirement.id}</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">{requirement.title}</h1>
          </div>
          <RequirementStatusBadge status={requirement.status} />
        </div>
        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <span>type: {requirement.type}</span>
          <span>priority: {requirement.priority ?? "-"}</span>
          <span>updated: {requirement.updatedAt ?? "-"}</span>
        </div>
        {requirement.warnings.length ? (
          <div className="border-l-2 border-red-500 pl-3 text-sm leading-6 text-red-800">
            {requirement.warnings.join(" / ")}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-600">四件套文件完整，下面显示当前文件与门禁状态。</p>
        )}
      </div>

      <div className={`${buildNeoSurfaceClassName("panel", "mint")} p-4`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">gates</p>
        <div className="mt-2">
          <GateRow label="package completeness" status={requirement.gates.package} />
          <GateRow label="PRD" status={requirement.gates.prd} />
          <GateRow label="Spec" status={requirement.gates.spec} />
          <GateRow label="Spec-Test" status={requirement.gates.test} />
          <GateRow label="Feature Verify" status={requirement.gates.feature} />
        </div>
      </div>
    </div>
  );
}

function DocumentTabs({ requirement, selected }: { requirement: RequirementPackageDetail; selected: RequirementDocument }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Requirement documents">
      {documentOrder.map((document) => (
        <Link
          key={document}
          href={`/requirements/${encodeURIComponent(requirement.id)}/${document}`}
          className={`rounded-md border px-3 py-2 text-sm ${selected === document ? "border-line bg-panel text-ink" : "border-line/60 text-slate-500 hover:text-ink"}`}
        >
          {getRequirementDocumentLabel(document)}
          {!requirement.files[document].present ? " · missing" : ""}
        </Link>
      ))}
      <a
        href="#traceability"
        className="rounded-md border border-line/60 px-3 py-2 text-sm text-slate-500 hover:text-ink"
      >
        Traceability
      </a>
    </nav>
  );
}

function DocumentPanel({ requirement, selected }: { requirement: RequirementPackageDetail; selected: RequirementDocument }) {
  const document = requirement.documents[selected];

  return (
    <WindowSection
      title={`${getRequirementDocumentLabel(selected)} source`}
      description={document ? document.path : "The document is not present in this package."}
      variant="plain"
      tint={document ? "neutral" : "amber"}
    >
      {document ? (
        <pre className="max-h-[720px] overflow-auto whitespace-pre-wrap rounded-md border border-line/70 bg-canvas p-4 font-mono text-xs leading-6 text-slate-700">
          {document.source}
        </pre>
      ) : (
        <div className="border-l-2 border-amber-500 pl-3 text-sm leading-6 text-amber-900">
          {selected}.md is missing. The package cannot pass completeness verification.
        </div>
      )}
    </WindowSection>
  );
}

function TraceabilityPanel({ requirement }: { requirement: RequirementPackageDetail }) {
  return (
    <WindowSection
      title="Traceability"
      description="Counts are derived from stable IDs in the current Markdown package. They are not persisted in the UI."
      variant="plain"
      tint="violet"
    >
      <div id="traceability" className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-2 font-medium">Document</th>
              <th className="px-3 py-2 font-medium">File</th>
              <th className="px-3 py-2 font-medium">Stable IDs</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {documentOrder.map((document) => (
              <tr key={document} className="border-b border-line/60 last:border-b-0">
                <td className="px-3 py-2 text-ink">{getRequirementDocumentLabel(document)}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{document}.md</td>
                <td className="px-3 py-2 text-ink">{requirement.files[document].ids}</td>
                <td className="px-3 py-2">
                  {requirement.files[document].present ? requirement.files[document].status ?? "not declared" : "missing"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WindowSection>
  );
}

export function RequirementPackagePage({ requirement, selected = "prd" }: { requirement: RequirementPackageDetail; selected?: RequirementDocument }) {
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/requirements" className="text-sm text-slate-500 underline underline-offset-4 hover:text-ink">
          ← All requirements
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">read-only source view</span>
      </div>
      <PackageSummary requirement={requirement} />
      <DocumentTabs requirement={requirement} selected={selected} />
      <DocumentPanel requirement={requirement} selected={selected} />
      <TraceabilityPanel requirement={requirement} />
    </div>
  );
}

export function RequirementNotFound({ requirementId }: { requirementId: string }) {
  return (
    <WindowSection
      title="Requirement package unavailable"
      description={`No readable Requirement Package was found for ${requirementId}.`}
      variant="plain"
      tint="amber"
    >
      <div className="border-l-2 border-amber-500 pl-3 text-sm leading-6 text-amber-900">
        Check that `.requirements/requirements/{requirementId}/` contains the expected package directory.
      </div>
    </WindowSection>
  );
}
