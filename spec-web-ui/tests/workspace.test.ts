import { describe, expect, it } from "vitest";

import { resolveProjectWorkspace } from "@/lib/projects";
import type { CatalogAsset, ProjectManifest } from "@/lib/types";

const catalog: CatalogAsset[] = [
  {
    id: "rule-backend-governance",
    type: "rule",
    title: "Go Backend Governance",
    summary: "Shared backend delivery rules.",
    direction: "backend",
    stacks: ["go"],
    tags: ["errors", "logging"],
    appliesTo: ["backend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "rules/backend/go-backend-governance.md",
    files: ["rules/backend/go-backend-governance.md"],
    version: "1.0.0"
  },
  {
    id: "template-feature-draft",
    type: "spec_template",
    title: "Feature Draft Template",
    summary: "15-section draft template.",
    direction: "fullstack",
    stacks: ["go", "react"],
    tags: ["draft", "workflow"],
    appliesTo: ["backend", "frontend"],
    dependsOn: ["rule-backend-governance"],
    conflictsWith: [],
    sourcePath: ".requirements/templates/prd-feature-draft.template.md",
    files: [".requirements/templates/prd-feature-draft.template.md"],
    version: "1.0.0"
  },
  {
    id: "agent-spec-editor",
    type: "agent_role",
    title: "Spec Editor",
    summary: "Compiles drafts into feature-spec artifacts.",
    direction: "fullstack",
    stacks: ["go", "react"],
    tags: ["spec", "openapi"],
    appliesTo: ["backend", "frontend"],
    dependsOn: ["template-feature-draft"],
    conflictsWith: ["agent-manual-editor"],
    sourcePath: "ai/agents/spec-editor.md",
    files: ["ai/agents/spec-editor.md"],
    version: "1.0.0"
  },
  {
    id: "team-governance-pack",
    type: "agent_team",
    title: "Governance Team Pack",
    summary: "Reusable team-level governance workflow.",
    direction: "fullstack",
    stacks: ["go", "react"],
    tags: ["team", "governance"],
    appliesTo: ["backend", "frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "agent-teams/governance-pack/README.md",
    files: ["agent-teams/governance-pack/README.md"],
    version: "1.0.0"
  },
  {
    id: "agent-manual-editor",
    type: "agent_role",
    title: "Manual Spec Editor",
    summary: "Human-only refinement workflow.",
    direction: "fullstack",
    stacks: ["go"],
    tags: ["spec"],
    appliesTo: ["backend"],
    dependsOn: [],
    conflictsWith: ["agent-spec-editor"],
    sourcePath: "ai/agents/execution-editor.md",
    files: ["ai/agents/execution-editor.md"],
    version: "1.0.0"
  }
];

const project: ProjectManifest = {
  id: "rewards-platform",
  name: "Rewards Platform",
  projectType: "mixed",
  architecture: "modular-monolith",
  stacks: ["go", "react"],
  selectedAssets: [
    { assetId: "template-feature-draft", enabled: true },
    { assetId: "agent-spec-editor", enabled: true },
    { assetId: "agent-manual-editor", enabled: true },
    { assetId: "team-governance-pack", enabled: true }
  ],
  prdTemplateId: "template-feature-draft",
  prdPath: "spec-web-ui/workspace/projects/rewards-platform/prd.md",
  exportTargets: ["docs/", "design/", "rules/", ".requirements/", "ai/agents/", "agent-teams/", "project-manifest.yaml"]
};

describe("resolveProjectWorkspace", () => {
  it("finds missing dependencies, conflicts, and recommendations", () => {
    const workspace = resolveProjectWorkspace(project, catalog);

    expect(workspace.selectedAssets.map((asset) => asset.id)).toEqual([
      "template-feature-draft",
      "agent-spec-editor",
      "agent-manual-editor",
      "team-governance-pack"
    ]);
    expect(workspace.missingDependencies).toEqual([
      {
        assetId: "template-feature-draft",
        missingAssetIds: ["rule-backend-governance"]
      }
    ]);
    expect(workspace.conflicts).toEqual([
      {
        assetId: "agent-spec-editor",
        conflictingAssetIds: ["agent-manual-editor"]
      }
    ]);
    expect(workspace.recommendedAssets.map((asset) => asset.id)).toContain(
      "rule-backend-governance"
    );
  });
});
