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
  files: {
    prd: { present: true, status: "approved", ids: 1 },
    spec: { present: true, status: "approved", ids: 1 },
    test: { present: true, status: "approved", ids: 1 },
    issues: { present: true, status: "implementing", ids: 1 }
  },
  issueCounts: { total: 1, done: 0 },
  gates: { package: "pass", prd: "pass", spec: "pass", test: "pass", feature: "warn" },
  warnings: [],
  documents: {
    prd: { document: "prd", path: ".requirements/requirements/R001-reward-order/prd.md", source: "# PRD\nREQ-R001-001", metadata: {} },
    spec: { document: "spec", path: ".requirements/requirements/R001-reward-order/spec.md", source: "# Spec\nSPEC-R001-F01-001", metadata: {} },
    test: { document: "test", path: ".requirements/requirements/R001-reward-order/test.md", source: "# Spec-Test\nTEST-R001-F01-001", metadata: {} },
    issues: { document: "issues", path: ".requirements/requirements/R001-reward-order/issues.md", source: "# Issues\nISSUE-R001-001", metadata: {} }
  }
};

describe("Requirement Package UI", () => {
  it("shows an explicit empty state when there are no real packages", () => {
    render(<RequirementsLibraryPage requirements={[]} />);

    expect(screen.getByRole("heading", { name: "No active packages" })).toBeInTheDocument();
    expect(screen.getByText("Examples and templates are intentionally excluded from this view.")).toBeInTheDocument();
  });

  it("shows package status, documents, gates, and traceability", () => {
    render(<RequirementPackagePage requirement={fixture} selected="spec" />);

    expect(screen.getByRole("heading", { name: "Reward Order" })).toBeInTheDocument();
    expect(screen.getByText("Feature Verify")).toBeInTheDocument();
    expect(screen.getByText("Spec source")).toBeInTheDocument();
    expect(screen.getByText(/SPEC-R001-F01-001/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Issues" })).toHaveAttribute("href", "/requirements/R001-reward-order/issues");
  });
});
