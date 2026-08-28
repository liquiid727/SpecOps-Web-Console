import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RequirementPackagePage } from "@/components/requirements/requirement-package-page";
import { RequirementsLibraryPage } from "@/components/requirements/requirements-library-page";
import type { RequirementPackageDetail } from "@/lib/types";

const fixture: RequirementPackageDetail = {
  id: "R001-reward-order",
  slug: "reward-order",
  title: "Reward Order",
  type: "feature",
  status: "implementing",
  priority: "P1",
  files: { prd: { present: true, status: "approved", ids: 1 }, acceptance: { present: true, ids: 1 }, spec: { present: false, ids: 0 }, test: { present: false, ids: 0 }, review: { present: false, ids: 0 }, issues: { present: false, ids: 0 } },
  issueCounts: { total: 1, done: 0 },
  gates: { package: "pass", prd: "pass", spec: "pass", test: "pass", feature: "warn" },
  warnings: [],
  index: { document: "acceptance", path: "index.yaml", source: "schemaVersion: goalspec/requirement-package", metadata: {} },
  documents: { prd: { document: "prd", path: ".requirements/requirements/R001-reward-order/prd.md", source: "# PRD\nREQ-R001-001", metadata: {} } },
  specCount: 1,
  specs: [{ id: "S01-order", slug: "order", title: "Order", status: "approved", path: "specs/S01-order/spec.md", documents: { spec: { present: true, ids: 1 }, test: { present: true, ids: 1 }, review: { present: true, ids: 0 }, issues: { present: true, ids: 1 } } }]
};

describe("Requirement Package UI", () => {
  it("shows an explicit empty state when there are no real packages", () => {
    render(<RequirementsLibraryPage requirements={[]} />);

    expect(screen.getByRole("heading", { name: "No active packages" })).toBeInTheDocument();
    expect(screen.getByText("Examples and templates are intentionally excluded from this view.")).toBeInTheDocument();
  });

  it("shows package status, documents, gates, and traceability", () => {
    render(<RequirementPackagePage requirement={fixture} />);

    expect(screen.getByRole("heading", { name: "Reward Order" })).toBeInTheDocument();
    expect(screen.getByText("Child specs")).toBeInTheDocument();
    expect(screen.getByText("Order")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /S01-order/ })).toHaveAttribute("href", "/requirements/R001-reward-order/specs/S01-order");
  });
});
