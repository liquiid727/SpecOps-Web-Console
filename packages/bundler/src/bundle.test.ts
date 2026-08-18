import { describe, expect, it } from "vitest";

import { buildBundlePlan, deriveInstallMappings, resolveInstallTarget } from "./index.js";

describe("bundler interface", () => {
  it("keeps source and installation target paths separate", () => {
    const plan = buildBundlePlan(
      {
        id: "example",
        name: "Example",
        projectType: "mixed",
        architecture: "modular",
        stacks: ["react"],
        prdTemplateId: "template-feature-draft",
        prdPath: ".prd/example.md",
        exportTargets: ["agent-teams/"]
      },
      [
        {
          id: "team-example",
          files: ["agent-teams/example/README.md"],
          contentFiles: {
            "agent-teams/example/README.md": "assets/agents/teams/example/README.md"
          }
        }
      ],
      {
        conflictCount: 0,
        missingDependencyCount: 0
      }
    );

    expect(plan.files).toEqual([
      {
        sourcePath: "assets/agents/teams/example/README.md",
        targetPath: "agent-teams/example/README.md"
      }
    ]);
    expect(plan.bundleManifest.entrypoints).toEqual({
      prdTemplate: "template-feature-draft",
      designTemplate: "template-platform-design",
      featureTemplate: "template-feature-spec",
      issueTemplate: "template-issue",
      workflowId: "spec-driven-default"
    });
    expect(plan.manifestYaml).toContain("prdTemplateId: template-feature-draft");
    expect(plan.manifestYaml).toContain("prdPath: .prd/example.md");
    expect(plan.manifestYaml).not.toContain("draftTemplateId");
    expect(plan.manifestYaml).not.toContain("draftPath");
    expect(plan.bundleManifestYaml).toContain("prdTemplate: template-feature-draft");
    expect(plan.bundleManifestYaml).toContain("featureTemplate: template-feature-spec");
    expect(plan.bundleManifestYaml).toContain("issueTemplate: template-issue");
    expect(plan.bundleManifestYaml).not.toContain("draftTemplate");
    expect(plan.bundleManifestYaml).not.toContain("specTemplate");
  });

  it("exports the independent Test Spec template to the feature bundle", () => {
    const plan = buildBundlePlan(
      {
        id: "test-spec",
        name: "Test Spec",
        projectType: "mixed",
        architecture: "modular",
        stacks: ["specos"],
        prdTemplateId: "template-feature-draft",
        prdPath: ".prd/test-spec.md",
        exportTargets: [".requirements/templates/"]
      },
      [
        {
          id: "template-test-spec",
          files: [".requirements/templates/test-spec.example.md"],
          contentFiles: {
            ".requirements/templates/test-spec.example.md": "assets/templates/specs/template-test-spec/test-spec.md"
          }
        }
      ],
      {
        conflictCount: 0,
        missingDependencyCount: 0
      }
    );

    expect(plan.files).toEqual([
      {
        sourcePath: "assets/templates/specs/template-test-spec/test-spec.md",
        targetPath: ".requirements/templates/test-spec.example.md"
      }
    ]);
    expect(plan.bundleManifest.installs).toContainEqual({
      target: ".requirements/",
      from: "files/.requirements/"
    });
  });

  it("resolves GoalSpec install targets in priority order", () => {
    expect(resolveInstallTarget("engineering-packs/go/pack.json")).toBe("engineering-packs/");
    expect(resolveInstallTarget(".requirements/templates/spec.example.md")).toBe(".requirements/");
    expect(resolveInstallTarget(".prd/_template/feature/product-ui.template.md")).toBe(".prd/_template/");
    expect(resolveInstallTarget(".features/_rules/README.md")).toBe(".features/_rules/");
    expect(resolveInstallTarget(".features/_template/feature/spec.example.md")).toBe(".features/_template/");
    expect(resolveInstallTarget(".issues/_template/issue.md")).toBe(".issues/_template/");

    expect(
      deriveInstallMappings([
        { sourcePath: "prd", targetPath: ".requirements/templates/prd-feature-draft.template.md" },
        { sourcePath: "pack", targetPath: "engineering-packs/go/pack.json" },
        { sourcePath: "rules", targetPath: ".features/_rules/README.md" },
        { sourcePath: "feature", targetPath: ".features/_template/feature/spec.example.md" },
        { sourcePath: "issue", targetPath: ".issues/_template/issue.md" }
      ])
    ).toEqual([
      { target: ".requirements/", from: "files/.requirements/" },
      { target: "engineering-packs/", from: "files/engineering-packs/" },
      { target: ".features/_rules/", from: "files/.features/_rules/" },
      { target: ".features/_template/", from: "files/.features/_template/" },
      { target: ".issues/_template/", from: "files/.issues/_template/" },
      { target: ".specos/workflows/", from: "files/.specos/workflows/" }
    ]);
  });
});
