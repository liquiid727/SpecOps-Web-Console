import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => null
  })
}));

vi.mock("@/lib/catalog", () => ({
  loadCatalogAssets: async () => [
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
    }
  ],
  getCatalogFilterOptions: () => ({
    directions: ["backend"],
    types: ["rule"],
    stacks: ["go"],
    tags: ["errors"]
  })
}));

vi.mock("@/lib/projects", () => ({
  listProjects: async () => [
    {
      id: "rewards-platform",
      name: "Rewards Platform",
      projectType: "mixed",
      architecture: "modular-monolith",
      stacks: ["go", "react"]
    }
  ]
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("keeps the homepage as a focused asset entry point", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", { name: "把 AI 工程资产装进项目骨架。" })
    ).toBeInTheDocument();
    expect(screen.getByText("三步开始")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "浏览目录" })).toHaveAttribute("href", "/discover");
    expect(screen.getByRole("link", { name: "组合工作区" })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: "预览导出" })).toHaveAttribute("href", "/exports");
    expect(screen.queryByRole("heading", { name: "Agent 工作方式与测试边界" })).not.toBeInTheDocument();
    expect(screen.queryByText("$ GO DISCOVER")).not.toBeInTheDocument();
    expect(screen.queryByText("目录快照")).not.toBeInTheDocument();
    expect(screen.queryByText("最近项目")).not.toBeInTheDocument();
    expect(screen.queryByText("筛选器")).not.toBeInTheDocument();
    expect(screen.queryByText("工作区循环")).not.toBeInTheDocument();
  });

  it("removes workspace links in read-only mode", async () => {
    const previousMode = process.env.SPECOS_RUNTIME_MODE;
    process.env.SPECOS_RUNTIME_MODE = "readonly";

    try {
      render(await HomePage());

      expect(screen.getByRole("link", { name: "浏览目录" })).toHaveAttribute("href", "/discover");
      expect(screen.queryByRole("link", { name: "组合工作区" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "预览导出" })).not.toBeInTheDocument();
    } finally {
      if (previousMode === undefined) {
        delete process.env.SPECOS_RUNTIME_MODE;
      } else {
        process.env.SPECOS_RUNTIME_MODE = previousMode;
      }
    }
  });
});
