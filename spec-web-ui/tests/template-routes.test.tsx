import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/catalog", () => ({
  filterCatalogAssets: (assets: Array<{ title: string; summary: string; tags: string[] }>, filters: { query?: string }) => {
    const query = filters.query?.toLowerCase().trim();

    if (!query) {
      return assets;
    }

    return assets.filter((asset) =>
      [asset.title, asset.summary, ...asset.tags].some((value) => value.toLowerCase().includes(query))
    );
  },
  loadCatalogAssets: async () => [
    {
      id: "template-product-ui",
      type: "spec_template",
      title: "Product UI Spec Template",
      summary: "Draft structure for user-facing product screens.",
      direction: "frontend",
      stacks: ["react"],
      tags: ["ui", "handoff"],
      appliesTo: ["frontend"],
      dependsOn: [],
      conflictsWith: [],
      sourcePath: "spec-draft/_template/feature/product-ui.template.md",
      files: ["spec-draft/_template/feature/product-ui.template.md"],
      version: "1.0.0"
    },
    {
      id: "agent-spec-editor",
      type: "agent_role",
      title: "Spec Editor Agent",
      summary: "Refines drafts into reviewable SpecOS change packages.",
      direction: "fullstack",
      stacks: ["specos"],
      tags: ["agent", "review"],
      appliesTo: ["spec"],
      dependsOn: [],
      conflictsWith: [],
      sourcePath: "ai/agents/spec-editor.md",
      files: ["ai/agents/spec-editor.md"],
      version: "1.0.0"
    },
    {
      id: "skill-ddd-layering-governance",
      type: "skill",
      title: "DDD Layering Governance",
      summary: "Guides DDD layer ownership and domain modeling decisions.",
      direction: "backend",
      stacks: ["go"],
      tags: ["ddd", "layering"],
      appliesTo: ["backend"],
      dependsOn: [],
      conflictsWith: [],
      sourcePath: "spec-web-ui/catalog/skills/ddd-layering-governance/SKILL.md",
      files: ["spec-web-ui/catalog/skills/ddd-layering-governance/SKILL.md"],
      version: "1.0.0"
    }
  ]
}));

import AgentTemplatesPage from "@/app/agent-templates/page";
import SkillsPage from "@/app/skills/page";
import SpecTemplatesPage from "@/app/spec-templates/page";

describe("template library routes", () => {
  it("renders spec templates on a dedicated route", async () => {
    render(await SpecTemplatesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Spec 模版" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "搜索 Spec 模版" })).toBeInTheDocument();
    expect(screen.getByText("Product UI Spec Template")).toBeInTheDocument();
    expect(screen.queryByText("Spec Editor Agent")).not.toBeInTheDocument();
  });

  it("renders agent templates on a dedicated route", async () => {
    render(await AgentTemplatesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Agent 模版" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "搜索 Agent 模版" })).toBeInTheDocument();
    expect(screen.getByText("Spec Editor Agent")).toBeInTheDocument();
    expect(screen.queryByText("Product UI Spec Template")).not.toBeInTheDocument();
  });

  it("renders skills on a dedicated repository route", async () => {
    render(await SkillsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Skill 仓库" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "搜索 Skill" })).toBeInTheDocument();
    expect(screen.getByText("DDD Layering Governance")).toBeInTheDocument();
    expect(screen.queryByText("Product UI Spec Template")).not.toBeInTheDocument();
    expect(screen.queryByText("Spec Editor Agent")).not.toBeInTheDocument();
  });
});
