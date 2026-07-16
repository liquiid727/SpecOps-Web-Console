import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn()
}));

vi.mock("@/app/actions", () => ({
  setProjectAssetSelectionAction: vi.fn()
}));

vi.mock("@/lib/catalog", () => ({
  loadAssetSourcePreview: async () => "# DDD Layering Governance\n\nUse this skill to guide design.",
  loadCatalogAsset: async () => ({
    id: "skill-ddd-layering-governance",
    type: "skill",
    title: "DDD Layering Governance",
    summary: "Guides DDD layer ownership.",
    summaryZh: "用于指导 DDD 分层归属与领域建模边界。",
    direction: "backend",
    stacks: ["go"],
    tags: ["ddd"],
    appliesTo: ["backend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "spec-web-ui/catalog/skills/ddd-layering-governance/SKILL.md",
    files: ["spec-web-ui/catalog/skills/ddd-layering-governance/SKILL.md"],
    version: "1.0.0",
    sampleOutput: "DDD decisions"
  }),
  loadCatalogAssets: async () => [
    {
      id: "agent-openapi",
      type: "agent_role",
      title: "OpenAPI Agent",
      summary: "Produces API contracts.",
      direction: "fullstack",
      stacks: ["go"],
      tags: ["openapi"],
      appliesTo: ["backend"],
      dependsOn: [],
      conflictsWith: [],
      sourcePath: "ai/agents/openapi-agent.md",
      files: ["ai/agents/openapi-agent.md"],
      version: "1.0.0"
    }
  ]
}));

vi.mock("@/lib/projects", () => ({
  buildAssetCompositionPreview: () => ({
    selectedAssetCount: 2,
    exportDirectories: ["spec-web-ui"],
    remainingMissingDependencies: [],
    introducedConflicts: []
  }),
  listProjects: async () => [
    {
      id: "backend-kit",
      name: "Backend Kit",
      projectType: "backend",
      architecture: "modular-monolith",
      stacks: ["go"]
    }
  ],
  loadProjectWorkspace: async () => ({
    project: {
      id: "backend-kit",
      name: "Backend Kit",
      projectType: "backend",
      architecture: "modular-monolith",
      stacks: ["go"],
      selectedAssets: [],
      draftTemplateId: "template-feature-draft",
      draftPath: "spec-web-ui/workspace/projects/backend-kit/draft.md",
      exportTargets: []
    },
    selectedAssets: [],
    missingDependencies: [],
    conflicts: [],
    recommendedAssets: []
  })
}));

import AssetDetailPage from "@/app/discover/[assetId]/page";

describe("AssetDetailPage", () => {
  it("shows the asset content directly and keeps secondary panels in the side rail", async () => {
    render(
      await AssetDetailPage({
        params: Promise.resolve({ assetId: "skill-ddd-layering-governance" }),
        searchParams: Promise.resolve({})
      })
    );

    expect(screen.getByRole("heading", { name: "DDD Layering Governance" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Source preview" })).not.toBeInTheDocument();
    expect(screen.getByText("$ cat spec-web-ui/catalog/skills/ddd-layering-governance/SKILL.md")).toBeInTheDocument();
    expect(screen.getByText("用于指导 DDD 分层归属与领域建模边界。")).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.tagName === "PRE" && Boolean(element.textContent?.includes("# DDD Layering Governance"))
      )
    ).toHaveClass("text-ink", "whitespace-pre-wrap", "break-words");

    expect(screen.getByText("Asset manifest").tagName).toBe("SUMMARY");
    expect(screen.getByText("Composition preview").tagName).toBe("SUMMARY");
    expect(screen.getByText("Good companions").tagName).toBe("SUMMARY");
  });

  it("removes workspace composition controls in read-only mode", async () => {
    const previousMode = process.env.SPECOS_RUNTIME_MODE;
    process.env.SPECOS_RUNTIME_MODE = "readonly";

    try {
      render(
        await AssetDetailPage({
          params: Promise.resolve({ assetId: "skill-ddd-layering-governance" }),
          searchParams: Promise.resolve({})
        })
      );

      expect(screen.queryByText("Send To Workspace")).not.toBeInTheDocument();
      expect(screen.getByText(/read-only catalog preview/)).toBeInTheDocument();
    } finally {
      if (previousMode === undefined) {
        delete process.env.SPECOS_RUNTIME_MODE;
      } else {
        process.env.SPECOS_RUNTIME_MODE = previousMode;
      }
    }
  });
});
