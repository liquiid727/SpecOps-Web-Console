import { describe, expect, it } from "vitest";

import { buildBundlePlan, resolveInstallTarget } from "./index.js";

describe("bundler interface", () => {
  it("keeps source and installation target paths separate", () => {
    const plan = buildBundlePlan(
      {
        id: "example",
        name: "Example",
        projectType: "mixed",
        architecture: "modular",
        stacks: ["react"],
        draftTemplateId: "template-feature-draft",
        draftPath: "spec-draft/example.md",
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
    expect(plan.bundleManifest.installs).toContainEqual({
      target: "agent-teams/",
      from: "files/agent-teams/"
    });
  });

  it("resolves the most specific configured install target", () => {
    expect(resolveInstallTarget("specs/_template/feature/spec.example.md")).toBe("specs/_template/");
  });
});
