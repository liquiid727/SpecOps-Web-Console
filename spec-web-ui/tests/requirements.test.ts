import { describe, expect, it } from "vitest";
import { parseRequirementPackage } from "@/lib/requirements";

const spec = { id: "S01-explorer", slug: "explorer", title: "Explorer", status: "approved", path: ".requirements/requirements/R002-goalspec-consolidation/specs/S01-explorer/spec.md", documents: { spec: { present: true, ids: 1 }, test: { present: true, ids: 1, status: "approved" }, review: { present: true, ids: 0, status: "approved" }, issues: { present: true, ids: 1, status: "implementing" } } } as const;

describe("GoalSpec Requirement Package reader", () => {
  it("reads the package contract and child specs without flat-file fallback", () => {
    const result = parseRequirementPackage({ id: "R002-goalspec-consolidation", index: { path: "index.yaml", source: "schemaVersion: goalspec/requirement-package" }, prd: { path: "prd.md", source: "---\ntitle: GoalSpec\nstatus: approved\ntype: change\n---\n# PRD\nREQ-R002-001" }, acceptance: { path: "acceptance.md", source: "# Acceptance" }, specs: [spec] });
    expect(result.specCount).toBe(1);
    expect(result.specs[0].id).toBe("S01-explorer");
    expect(result.gates.package).toBe("pass");
  });

  it("blocks a package without index, prd, or child specs", () => {
    const result = parseRequirementPackage({ id: "R003-incomplete", index: { path: "index.yaml", source: "" }, prd: { path: "prd.md", source: "" }, specs: [] });
    expect(result.gates.package).toBe("block");
    expect(result.warnings).toEqual(["缺少 index.yaml", "缺少 prd.md", "缺少 acceptance.md", "缺少 specs/SNN-* 子规格"]);
  });
});
