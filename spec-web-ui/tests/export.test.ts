import { describe, expect, it } from "vitest";

import * as exportsLib from "@/features/exports/server";
import type { CatalogAsset, ProjectManifest } from "@/lib/types";

const project: ProjectManifest = {
  id: "reward-center",
  name: "Reward Center",
  projectType: "mixed",
  architecture: "event-driven",
  stacks: ["go", "react"],
  selectedAssets: [
    { assetId: "rule-backend-governance", enabled: true },
    { assetId: "template-feature-draft", enabled: true },
    { assetId: "template-project-modes", enabled: true },
    { assetId: "agent-spec-editor", enabled: true },
    { assetId: "skill-spec-to-test", enabled: true },
    { assetId: "team-governance-pack", enabled: true }
  ],
  prdTemplateId: "template-feature-draft",
  prdPath: "spec-web-ui/workspace/projects/reward-center/prd.md",
  exportTargets: ["docs/", "design/", "rules/", ".requirements/", "ai/agents/", "agent-teams/", "project-manifest.yaml"]
};

const selectedAssets: CatalogAsset[] = [
  {
    id: "rule-backend-governance",
    type: "rule",
    title: "Go Backend Governance",
    summary: "Shared backend rules.",
    direction: "backend",
    stacks: ["go"],
    tags: ["errors", "ci"],
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
    tags: ["draft"],
    appliesTo: ["backend", "frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "assets/templates/specs/template-feature-draft/product-ui.template.md",
    files: [
      ".requirements/templates/prd-feature-draft.template.md",
      ".requirements/templates/spec.example.md"
    ],
    contentFiles: {
      ".requirements/templates/prd-feature-draft.template.md":
        "assets/templates/specs/template-feature-draft/product-ui.template.md",
      ".requirements/templates/spec.example.md":
        "assets/templates/specs/template-feature-spec/spec.example.md"
    },
    version: "1.0.0"
  },
  {
    id: "template-project-modes",
    type: "spec_template",
    title: "Project Modes Guide",
    summary: "Mode guidance for LiteSpec, GoalSpec, and EnterpriseSpec.",
    direction: "fullstack",
    stacks: ["go", "react"],
    tags: ["docs", "mode"],
    appliesTo: ["backend", "frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "assets/templates/specs/template-project-modes/README.md",
    files: [
      "docs/spec-modes/README.md",
      "docs/spec-modes/plugins/LiteSpec/README.md",
      "docs/spec-modes/GoalSpec/README.md",
      "docs/spec-modes/plugins/EnterpriseSpec/README.md"
    ],
    contentFiles: {
      "docs/spec-modes/README.md":
        "assets/templates/specs/template-project-modes/README.md",
      "docs/spec-modes/plugins/LiteSpec/README.md":
        "assets/templates/specs/template-project-modes/LiteSpec.md",
      "docs/spec-modes/GoalSpec/README.md":
        "assets/templates/specs/template-project-modes/GoalSpec.md",
      "docs/spec-modes/plugins/EnterpriseSpec/README.md":
        "assets/templates/specs/template-project-modes/EnterpriseSpec.md"
    },
    version: "1.0.0"
  },
  {
    id: "team-governance-pack",
    type: "agent_team",
    title: "Governance Team Pack",
    summary: "Reusable team-level governance pack.",
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
    id: "skill-spec-to-test",
    type: "skill",
    title: "Spec to Test Skill",
    summary: "Independent Test Specs from approved Feature Specs.",
    direction: "frontend",
    stacks: ["react"],
    tags: ["skill", "config"],
    appliesTo: ["frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "skills/developer/spec-to-test/SKILL.md",
    files: ["skills/developer/spec-to-test/SKILL.md"],
    version: "1.0.0"
  },
  {
    id: "agent-spec-editor",
    type: "agent_role",
    title: "Spec Editor",
    summary: "Compiles drafts into standard bundles.",
    direction: "fullstack",
    stacks: ["go", "react"],
    tags: ["spec", "openapi"],
    appliesTo: ["backend", "frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "ai/agents/spec-editor.md",
    files: ["ai/agents/spec-editor.md"],
    version: "1.0.0"
  }
];

describe("buildExportBundle", () => {
  it("creates a manifest and source file map for the selected assets", () => {
    const bundle = exportsLib.buildExportBundle(project, selectedAssets, {
      conflictCount: 0,
      missingDependencyCount: 0
    });

    expect(bundle.manifestYaml).toContain("id: reward-center");
    expect(bundle.manifestYaml).toContain("prdTemplateId: template-feature-draft");
    expect(bundle.files.map((file) => file.targetPath)).toEqual([
      "rules/backend/go-backend-governance.md",
      ".requirements/templates/prd-feature-draft.template.md",
      ".requirements/templates/spec.example.md",
      "docs/spec-modes/README.md",
      "docs/spec-modes/plugins/LiteSpec/README.md",
      "docs/spec-modes/GoalSpec/README.md",
      "docs/spec-modes/plugins/EnterpriseSpec/README.md",
      "agent-teams/governance-pack/README.md",
      "skills/developer/spec-to-test/SKILL.md",
      "ai/agents/spec-editor.md"
    ]);
    expect(bundle.summary).toContain("6 selected assets");
  });

  it("emits an installable SpecOS bundle payload alongside the review snapshot", () => {
    const bundle = exportsLib.buildExportBundle(project, selectedAssets, {
      conflictCount: 0,
      missingDependencyCount: 0
    });

    expect(bundle.bundleManifest.id).toBe("reward-center-bundle");
    expect(bundle.bundleManifest.workflow.default).toBe("spec-driven-default");
    expect(bundle.bundleManifest.installs).toEqual([
      { target: "skills/developer/", from: "files/skills/developer/" },
      { target: "agent-teams/", from: "files/agent-teams/" },
      { target: "ai/agents/", from: "files/ai/agents/" },
      { target: ".requirements/", from: "files/.requirements/" },
      { target: "docs/", from: "files/docs/" },
      { target: "rules/", from: "files/rules/" },
      { target: ".specos/workflows/", from: "files/.specos/workflows/" }
    ]);
    expect(bundle.bundleFiles.map((file) => file.targetPath)).toEqual([
      ".specos-bundle/bundle.yaml",
      ".specos-bundle/checksums.json",
      ".specos-bundle/files/.specos/workflows/spec-driven-default.yaml",
      ".specos-bundle/manifest.json"
    ]);
    expect(bundle.bundleManifestYaml).toContain("id: reward-center-bundle");
    expect(bundle.bundleFiles.find((file) => file.targetPath === ".specos-bundle/files/.specos/workflows/spec-driven-default.yaml")?.content).toContain("id: spec-driven-default");
  });
});

describe("groupExportFilesByDirectory", () => {
  it("groups exported files by top-level directory for bundle review", () => {
    const groups = exportsLib.groupExportFilesByDirectory([
      { sourcePath: "agent-teams/governance-pack/README.md", targetPath: "agent-teams/governance-pack/README.md" },
      { sourcePath: "rules/backend/go-backend-governance.md", targetPath: "rules/backend/go-backend-governance.md" },
      { sourcePath: "ai/agents/spec-editor.md", targetPath: "ai/agents/spec-editor.md" },
      { sourcePath: ".requirements/templates/spec.example.md", targetPath: ".requirements/templates/spec.example.md" }
    ]);

    expect(groups).toEqual([
      {
        directory: ".requirements",
        files: [{ sourcePath: ".requirements/templates/spec.example.md", targetPath: ".requirements/templates/spec.example.md" }]
      },
      {
        directory: "agent-teams",
        files: [{ sourcePath: "agent-teams/governance-pack/README.md", targetPath: "agent-teams/governance-pack/README.md" }]
      },
      {
        directory: "ai",
        files: [{ sourcePath: "ai/agents/spec-editor.md", targetPath: "ai/agents/spec-editor.md" }]
      },
      {
        directory: "rules",
        files: [{ sourcePath: "rules/backend/go-backend-governance.md", targetPath: "rules/backend/go-backend-governance.md" }]
      }
    ]);
  });
});

describe("buildExportDiffPreview", () => {
  it("renders a diff-like preview for new export files", () => {
    const diff = exportsLib.buildExportDiffPreview({
      sourcePath: "rules/backend/go-backend-governance.md",
      targetPath: "rules/backend/go-backend-governance.md",
      sourceContent: "# Go Backend Governance\n\n## Purpose\nShared rules.\n",
      generatedContent: null
    });

    expect(diff.status).toBe("new");
    expect(diff.preview).toContain("--- /dev/null");
    expect(diff.preview).toContain("+++ rules/backend/go-backend-governance.md");
    expect(diff.preview).toContain("+# Go Backend Governance");
  });

  it("renders a diff-like preview for changed generated files", () => {
    const diff = exportsLib.buildExportDiffPreview({
      sourcePath: "ai/agents/spec-editor.md",
      targetPath: "ai/agents/spec-editor.md",
      sourceContent: "# Spec Editor\n\nOwns normalization.\n",
      generatedContent: "# Spec Editor\n\nOld summary.\n"
    });

    expect(diff.status).toBe("changed");
    expect(diff.preview).toContain("-Old summary.");
    expect(diff.preview).toContain("+Owns normalization.");
  });
});

describe("buildExportFileTree", () => {
  it("builds a nested tree for grouped export navigation", () => {
    const tree = exportsLib.buildExportFileTree([
      { sourcePath: "agent-teams/governance-pack/README.md", targetPath: "agent-teams/governance-pack/README.md" },
      { sourcePath: "rules/backend/go-backend-governance.md", targetPath: "rules/backend/go-backend-governance.md" },
      { sourcePath: "rules/shared/error-code-governance.md", targetPath: "rules/shared/error-code-governance.md" },
      { sourcePath: "ai/agents/spec-editor.md", targetPath: "ai/agents/spec-editor.md" }
    ]);

    expect(tree).toEqual([
      {
        name: "agent-teams",
        path: "agent-teams",
        children: [
          {
            name: "governance-pack",
            path: "agent-teams/governance-pack",
            children: [
              {
                name: "README.md",
                path: "agent-teams/governance-pack/README.md",
                file: { sourcePath: "agent-teams/governance-pack/README.md", targetPath: "agent-teams/governance-pack/README.md" }
              }
            ]
          }
        ]
      },
      {
        name: "ai",
        path: "ai",
        children: [
          {
            name: "agents",
            path: "ai/agents",
            children: [
              {
                name: "spec-editor.md",
                path: "ai/agents/spec-editor.md",
                file: { sourcePath: "ai/agents/spec-editor.md", targetPath: "ai/agents/spec-editor.md" }
              }
            ]
          }
        ]
      },
      {
        name: "rules",
        path: "rules",
        children: [
          {
            name: "backend",
            path: "rules/backend",
            children: [
              {
                name: "go-backend-governance.md",
                path: "rules/backend/go-backend-governance.md",
                file: { sourcePath: "rules/backend/go-backend-governance.md", targetPath: "rules/backend/go-backend-governance.md" }
              }
            ]
          },
          {
            name: "shared",
            path: "rules/shared",
            children: [
              {
                name: "error-code-governance.md",
                path: "rules/shared/error-code-governance.md",
                file: { sourcePath: "rules/shared/error-code-governance.md", targetPath: "rules/shared/error-code-governance.md" }
              }
            ]
          }
        ]
      }
    ]);
  });
});

describe("getDiffLineEntries", () => {
  it("classifies diff lines for UI rendering", () => {
    const lines = exportsLib.getDiffLineEntries(`--- /dev/null\n+++ rules/backend/go-backend-governance.md\n@@ bundle review @@\n+# Title\n-# Old\n Shared`);

    expect(lines).toEqual([
      { kind: "meta", content: "--- /dev/null" },
      { kind: "meta", content: "+++ rules/backend/go-backend-governance.md" },
      { kind: "hunk", content: "@@ bundle review @@" },
      { kind: "add", content: "+# Title" },
      { kind: "remove", content: "-# Old" },
      { kind: "context", content: " Shared" }
    ]);
  });
});

describe("buildExportReviewFiles", () => {
  it("compares current and previous snapshots to classify new, changed, and removed files", () => {
    const files = exportsLib.buildExportReviewFiles({
      currentFiles: [
        { sourcePath: "rules/backend/go-backend-governance.md", targetPath: "rules/backend/go-backend-governance.md" },
        { sourcePath: "ai/agents/spec-editor.md", targetPath: "ai/agents/spec-editor.md" }
      ],
      previousFiles: [
        { sourcePath: "ai/agents/spec-editor.md", targetPath: "ai/agents/spec-editor.md" },
        { sourcePath: ".requirements/templates/spec.example.md", targetPath: ".requirements/templates/spec.example.md" }
      ],
      currentContents: {
        "rules/backend/go-backend-governance.md": "# New Rule\n",
        "ai/agents/spec-editor.md": "# Spec Editor\n\nCurrent\n"
      },
      previousContents: {
        "ai/agents/spec-editor.md": "# Spec Editor\n\nPrevious\n",
        ".requirements/templates/spec.example.md": "# Previous Spec\n"
      }
    });

    expect(
      files.map((file) => ({
        path: file.targetPath,
        status: file.diff.status
      }))
    ).toEqual([
      { path: ".requirements/templates/spec.example.md", status: "removed" },
      { path: "ai/agents/spec-editor.md", status: "changed" },
      { path: "rules/backend/go-backend-governance.md", status: "new" }
    ]);
  });
});

describe("getReviewOwnersForFile", () => {
  it("maps exported files back to the assets that own them", () => {
    const owners = exportsLib.getReviewOwnersForFile(
      { sourcePath: "ai/agents/spec-editor.md", targetPath: "ai/agents/spec-editor.md" },
      selectedAssets
    );

    expect(owners.map((asset) => asset.id)).toEqual(["agent-spec-editor"]);
  });
});

describe("filterExportReviewGroups", () => {
  it("supports a changes-only mode that hides synced files", () => {
    const filtered = exportsLib.filterExportReviewGroups(
      [
        {
          directory: "ai",
          files: [
            {
              sourcePath: "ai/agents/spec-editor.md",
              targetPath: "ai/agents/spec-editor.md",
              diff: { status: "changed", preview: "" },
              diffLines: []
            },
            {
              sourcePath: "ai/agents/openapi-agent.md",
              targetPath: "ai/agents/openapi-agent.md",
              diff: { status: "synced", preview: "" },
              diffLines: []
            }
          ]
        }
      ],
      "changes"
    );

    expect(filtered).toEqual([
      {
        directory: "ai",
        files: [
          {
            sourcePath: "ai/agents/spec-editor.md",
            targetPath: "ai/agents/spec-editor.md",
            diff: { status: "changed", preview: "" },
            diffLines: []
          }
        ]
      }
    ]);
  });

  it("supports persisted review decisions and filtering by decision state", () => {
    const setReviewDecisions = (exportsLib as Record<string, unknown>).setExportReviewDecisions as
      | ((
          decisions: Array<{ targetPath: string; decision: string; updatedAt: string }>,
          targetPaths: string[],
          decision: "accepted" | "needs_work" | "blocked",
          nowIso?: string
        ) => Array<{ targetPath: string; decision: string; updatedAt: string }>)
      | undefined;
    const summarizeReviewDecisions = (exportsLib as Record<string, unknown>).summarizeExportReviewDecisions as
      | ((groups: Array<{ directory: string; files: Array<{ decision?: string }> }>) => Record<string, number>)
      | undefined;

    expect(typeof setReviewDecisions).toBe("function");
    expect(typeof summarizeReviewDecisions).toBe("function");

    const decisionEntries = setReviewDecisions?.(
      [{ targetPath: "ai/agents/spec-editor.md", decision: "accepted", updatedAt: "2026-04-19T08:00:00.000Z" }],
      ["rules/backend/go-backend-governance.md", "ai/agents/spec-editor.md"],
      "needs_work",
      "2026-04-19T09:00:00.000Z"
    );

    expect(decisionEntries).toEqual([
      {
        targetPath: "ai/agents/spec-editor.md",
        decision: "needs_work",
        updatedAt: "2026-04-19T09:00:00.000Z"
      },
      {
        targetPath: "rules/backend/go-backend-governance.md",
        decision: "needs_work",
        updatedAt: "2026-04-19T09:00:00.000Z"
      }
    ]);

    const filteredByDecision = exportsLib.filterExportReviewGroups(
      [
        {
          directory: "ai",
          files: [
            {
              sourcePath: "ai/agents/spec-editor.md",
              targetPath: "ai/agents/spec-editor.md",
              diff: { status: "changed", preview: "" },
              diffLines: [],
              decision: "needs_work"
            },
            {
              sourcePath: "ai/agents/openapi-agent.md",
              targetPath: "ai/agents/openapi-agent.md",
              diff: { status: "new", preview: "" },
              diffLines: [],
              decision: "accepted"
            }
          ]
        }
      ],
      "all",
      "needs_work"
    );

    expect(filteredByDecision).toEqual([
      {
        directory: "ai",
        files: [
          {
            sourcePath: "ai/agents/spec-editor.md",
            targetPath: "ai/agents/spec-editor.md",
            diff: { status: "changed", preview: "" },
            diffLines: [],
            decision: "needs_work"
          }
        ]
      }
    ]);

    expect(
      summarizeReviewDecisions?.([
        {
          directory: "ai",
          files: [{ decision: "accepted" }, { decision: "needs_work" }, { decision: "blocked" }, {}]
        }
      ])
    ).toEqual({
      accepted: 1,
      blocked: 1,
      needs_work: 1,
      pending: 1
    });
  });

  it("stores review notes without losing the current decision", () => {
    const setReviewNote = (exportsLib as Record<string, unknown>).setExportReviewNote as
      | ((
          decisions: Array<{
            targetPath: string;
            decision: string;
            updatedAt: string;
            note?: string;
            noteUpdatedAt?: string;
          }>,
          targetPath: string,
          note: string,
          nowIso?: string
        ) => Array<{
          targetPath: string;
          decision: string;
          updatedAt: string;
          note?: string;
          noteUpdatedAt?: string;
        }>)
      | undefined;

    expect(typeof setReviewNote).toBe("function");

    const notedEntries = setReviewNote?.(
      [
        {
          targetPath: "ai/agents/spec-editor.md",
          decision: "accepted",
          updatedAt: "2026-04-19T08:00:00.000Z"
        }
      ],
      "ai/agents/spec-editor.md",
      "Need a clearer example request/response pair.",
      "2026-04-19T10:00:00.000Z"
    );

    expect(notedEntries).toEqual([
      {
        targetPath: "ai/agents/spec-editor.md",
        decision: "accepted",
        updatedAt: "2026-04-19T08:00:00.000Z",
        note: "Need a clearer example request/response pair.",
        noteUpdatedAt: "2026-04-19T10:00:00.000Z"
      }
    ]);

    const reviewFilesWithNotes = exportsLib.buildExportReviewFiles({
      currentFiles: [
        { sourcePath: "ai/agents/spec-editor.md", targetPath: "ai/agents/spec-editor.md" }
      ],
      previousFiles: [],
      currentContents: {
        "ai/agents/spec-editor.md": "# Spec Editor\n"
      },
      previousContents: {},
      decisions: {
        "ai/agents/spec-editor.md": {
          targetPath: "ai/agents/spec-editor.md",
          decision: "accepted",
          updatedAt: "2026-04-19T08:00:00.000Z",
          note: "Need a clearer example request/response pair.",
          noteUpdatedAt: "2026-04-19T10:00:00.000Z"
        }
      }
    });

    expect(reviewFilesWithNotes[0]).toMatchObject({
      decision: "accepted",
      note: "Need a clearer example request/response pair.",
      noteUpdatedAt: "2026-04-19T10:00:00.000Z"
    });
  });
});
