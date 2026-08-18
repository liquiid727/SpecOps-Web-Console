import { describe, expect, it } from "vitest";

import { parseRequirementPackage } from "@/lib/requirements";

describe("Requirement Package reader", () => {
  it("derives package files, stable ID counts, and gates from Markdown", () => {
    const requirement = parseRequirementPackage({
      id: "R001-reward-order",
      documents: {
        prd: {
          path: ".requirements/requirements/R001-reward-order/prd.md",
          source: `---\nid: R001\ntitle: Reward Order\ntype: feature\nstatus: approved\npriority: P1\n---\n# PRD\nREQ-R001-001\nREQ-R001-002`
        },
        spec: {
          path: ".requirements/requirements/R001-reward-order/spec.md",
          source: `---\nrequirement: R001\nstatus: approved\n---\nSPEC-R001-F01-001`
        },
        test: {
          path: ".requirements/requirements/R001-reward-order/test.md",
          source: `---\nrequirement: R001\nstatus: approved\n---\nTEST-R001-F01-001`
        },
        issues: {
          path: ".requirements/requirements/R001-reward-order/issues.md",
          source: `---\nrequirement: R001\nstatus: implementing\n---\n## ISSUE-R001-001\nStatus: DONE\n## ISSUE-R001-002\nStatus: TODO`
        }
      }
    });

    expect(requirement.id).toBe("R001-reward-order");
    expect(requirement.title).toBe("Reward Order");
    expect(requirement.files.prd.ids).toBe(2);
    expect(requirement.files.spec.ids).toBe(1);
    expect(requirement.issueCounts).toEqual({ total: 2, done: 1 });
    expect(requirement.gates).toEqual({
      package: "pass",
      prd: "pass",
      spec: "pass",
      test: "pass",
      feature: "warn"
    });
  });

  it("blocks incomplete packages instead of treating them as healthy", () => {
    const requirement = parseRequirementPackage({
      id: "R002-incomplete",
      documents: {
        prd: {
          path: ".requirements/requirements/R002-incomplete/prd.md",
          source: "---\nid: R002\ntitle: Incomplete\nstatus: draft\n---\n# PRD"
        }
      }
    });

    expect(requirement.gates.package).toBe("block");
    expect(requirement.gates.prd).toBe("warn");
    expect(requirement.gates.spec).toBe("block");
    expect(requirement.warnings).toEqual(["缺少 spec.md", "缺少 test.md", "缺少 issues.md"]);
  });

  it("keeps approved gates after a package moves into implementation", () => {
    const requirement = parseRequirementPackage({
      id: "R003-implementation",
      documents: {
        prd: { path: "prd.md", source: "---\nid: R003\ntitle: In implementation\nstatus: implementing\n---\n# PRD\nREQ-R003-001" },
        spec: { path: "spec.md", source: "---\nstatus: approved\n---\n# Spec\nSPEC-R003-F01-001" },
        test: { path: "test.md", source: "---\nstatus: approved\n---\n# Spec-Test\nTEST-R003-F01-001" },
        issues: { path: "issues.md", source: "---\nstatus: implementing\n---\n## ISSUE-R003-001\nStatus: IN REVIEW" }
      }
    });

    expect(requirement.gates.prd).toBe("pass");
    expect(requirement.gates.feature).toBe("warn");
  });
});
