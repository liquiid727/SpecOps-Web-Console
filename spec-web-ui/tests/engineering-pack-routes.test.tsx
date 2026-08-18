import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/catalog/server", () => ({
  filterCatalogAssets: (assets: Array<{ title: string; summary: string; summaryZh?: string; tags: string[] }>, filters: { query?: string }) => {
    const query = filters.query?.trim().toLowerCase();

    if (!query) {
      return assets;
    }

    return assets.filter((asset) =>
      [asset.title, asset.summary, asset.summaryZh ?? "", ...asset.tags]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  },
  loadCatalogAssets: async () => [
    {
      id: "engineering-pack-go",
      type: "engineering_pack",
      title: "Go 工程基座",
      summary: "A reusable Go engineering foundation and CLI scaffold contract.",
      summaryZh: "覆盖目录、版本、构建、测试、发布、安全和 CLI 生成的 Go 工程包。",
      direction: "backend",
      categories: ["backend", "deployment"],
      stacks: ["go"],
      tags: ["go", "cli", "engineering-pack"],
      appliesTo: ["backend"],
      dependsOn: [],
      conflictsWith: [],
      sourcePath: "assets/engineering-packs/go/constraints/go-engineering-base-2026.md",
      files: ["rules/go-engineering-base-2026.md"],
      contentFiles: {
        "rules/go-engineering-base-2026.md": "assets/engineering-packs/go/constraints/go-engineering-base-2026.md"
      },
      version: "2026.1.0"
    },
    {
      id: "rule-go-backend",
      type: "rule",
      title: "Go Backend Governance",
      summary: "Backend rules.",
      direction: "backend",
      stacks: ["go"],
      tags: ["backend"],
      appliesTo: ["backend"],
      dependsOn: [],
      conflictsWith: [],
      sourcePath: "rules/backend/go-backend-governance.md",
      files: ["rules/backend/go-backend-governance.md"],
      version: "1.0.0"
    }
  ],
  loadCatalogAsset: async () => ({
    id: "engineering-pack-go",
    type: "engineering_pack",
    title: "Go 工程基座",
    summary: "A reusable Go engineering foundation.",
    direction: "backend",
    stacks: ["go"],
    tags: ["go"],
    appliesTo: ["backend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "assets/engineering-packs/go/constraints/go-engineering-base-2026.md",
    files: ["rules/go-engineering-base-2026.md"],
    version: "2026.1.0"
  })
}));

vi.mock("@/app/discover/[assetId]/page", () => ({
  default: async () => <div>rendered engineering pack content</div>
}));

import EngineeringPacksPage from "@/app/engineering-packs/page";
import EngineeringPackDetailPage from "@/app/engineering-packs/[packId]/page";

describe("engineering pack routes", () => {
  it("renders the engineering pack catalog and links to the pack detail", async () => {
    render(await EngineeringPacksPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "工程包" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "搜索工程包" })).toBeInTheDocument();
    expect(screen.getByText("Go 工程基座")).toBeInTheDocument();
    expect(screen.getByText("覆盖目录、版本、构建、测试、发布、安全和 CLI 生成的 Go 工程包。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go 工程基座/ })).toHaveAttribute(
      "href",
      "/engineering-packs/engineering-pack-go"
    );
    expect(screen.queryByText("Go Backend Governance")).not.toBeInTheDocument();
  });

  it("filters engineering packs by query", async () => {
    render(await EngineeringPacksPage({ searchParams: Promise.resolve({ q: "python" }) }));

    expect(screen.getByText("没有匹配的工程包。换一个关键词继续搜索。")).toBeInTheDocument();
    expect(screen.queryByText("Go 工程基座")).not.toBeInTheDocument();
  });

  it("keeps pack details on a dedicated route while reusing the catalog renderer", async () => {
    render(
      await EngineeringPackDetailPage({
        params: Promise.resolve({ packId: "engineering-pack-go" }),
        searchParams: Promise.resolve({})
      })
    );

    expect(screen.getByText("rendered engineering pack content")).toBeInTheDocument();
  });
});
