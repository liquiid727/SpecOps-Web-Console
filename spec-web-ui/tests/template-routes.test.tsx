import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/catalog/server", () => ({
  filterCatalogAssets: (
    assets: Array<{ title: string; summary: string; summaryZh?: string; tags: string[]; categories?: string[] }>,
    filters: { query?: string; categories?: string[] }
  ) => {
    const query = filters.query?.toLowerCase().trim();
    const categories = filters.categories ?? [];

    return assets.filter((asset) => {
      if (query) {
        const matchesQuery = [asset.title, asset.summary, asset.summaryZh ?? "", ...asset.tags].some((value) =>
          value.toLowerCase().includes(query)
        );

        if (!matchesQuery) {
          return false;
        }
      }

      if (categories.length) {
        const assetCategories = asset.categories ?? [];

        if (!categories.every((category) => assetCategories.includes(category))) {
          return false;
        }
      }

      return true;
    });
  },
  loadCatalogAssets: async () => [
    {
      id: "template-product-ui",
      type: "spec_template",
      title: "Product UI Spec Template",
      summary: "Draft structure for user-facing product screens.",
      direction: "frontend",
      categories: ["product", "frontend"],
      stacks: ["react"],
      tags: ["ui", "handoff"],
      appliesTo: ["frontend"],
      dependsOn: [],
      conflictsWith: [],
      sourcePath: ".prd/_template/feature/product-ui.template.md",
      files: [".prd/_template/feature/product-ui.template.md"],
      version: "1.0.0"
    },
    {
      id: "agent-spec-editor",
      type: "agent_role",
      title: "Spec Editor Agent",
      summary: "Refines drafts into reviewable feature specs and roadmap updates.",
      direction: "fullstack",
      categories: ["product", "backend"],
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
      id: "skill-spec-to-test",
      type: "skill",
      title: "Spec to Test Skill",
      summary: "Independent Test Specs from approved Feature Specs.",
      summaryZh: "用于构建安全配置界面的交互模式。",
      direction: "frontend",
      categories: ["frontend", "operations"],
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
      id: "team-governance-pack",
      type: "agent_team",
      title: "Governance Team Pack",
      summary: "Reusable team-level governance pack.",
      direction: "fullstack",
      categories: ["operations", "deployment"],
      stacks: ["specos"],
      tags: ["team", "governance"],
      appliesTo: ["spec"],
      dependsOn: [],
      conflictsWith: [],
      sourcePath: "agent-teams/governance-pack/README.md",
      files: ["agent-teams/governance-pack/README.md"],
      version: "1.0.0"
    }
  ]
}));

import AgentTemplatesPage from "@/app/agent-templates/page";
import AgentTeamsPage from "@/app/agent-teams/page";
import SkillTemplatesPage from "@/app/skill-templates/page";
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

  it("renders skill templates on a dedicated route", async () => {
    render(await SkillTemplatesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Skill 技能" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "搜索 Skill 技能" })).toBeInTheDocument();
    expect(screen.getByText("Spec to Test Skill")).toBeInTheDocument();
    expect(screen.getByText("用于构建安全配置界面的交互模式。")).toBeInTheDocument();
    expect(screen.queryByText("Spec Editor Agent")).not.toBeInTheDocument();
  });

  it("filters skills by category on the dedicated route", async () => {
    render(await SkillTemplatesPage({ searchParams: Promise.resolve({ category: "operations" }) }));

    expect(screen.getByText("Spec to Test Skill")).toBeInTheDocument();
    expect(screen.queryByText("Governance Team Pack")).not.toBeInTheDocument();
  });

  it("renders agent teams on a dedicated route", async () => {
    render(await AgentTeamsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Agent Team" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "搜索 Agent Team" })).toBeInTheDocument();
    expect(screen.getByText("Governance Team Pack")).toBeInTheDocument();
    expect(screen.queryByText("Spec Editor Agent")).not.toBeInTheDocument();
  });
});
