import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteNav } from "@/components/layout/site-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/spec-templates",
  useSearchParams: () => new URLSearchParams()
}));

describe("SiteNav", () => {
  it("shows the template-focused navigation requested by the draft UI spec", () => {
    render(<SiteNav locale="zh" />);

    expect(screen.getByRole("link", { name: "主页/" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "关于/" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Spec 模版/" })).toHaveAttribute(
      "href",
      "/spec-templates"
    );
    expect(screen.getByRole("link", { name: "Skill 技能/" })).toHaveAttribute(
      "href",
      "/skill-templates"
    );
    expect(screen.getByRole("link", { name: "Agent 模版/" })).toHaveAttribute(
      "href",
      "/agent-templates"
    );
    expect(screen.getByRole("link", { name: "Agent Team/" })).toHaveAttribute(
      "href",
      "/agent-teams"
    );
    expect(screen.getByText("Workflow 模版/")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "项目/" })).toHaveAttribute("href", "/projects");
  });

  it("hides workspace navigation in read-only mode", () => {
    render(<SiteNav locale="zh" readOnly />);

    expect(screen.queryByRole("link", { name: "项目/" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spec 模版/" })).toHaveAttribute("href", "/spec-templates");
  });
});
