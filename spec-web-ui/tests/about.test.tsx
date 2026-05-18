import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => null
  })
}));

import AboutPage from "@/app/about/page";

describe("AboutPage", () => {
  it("shows the agent workflow on a dedicated about route", async () => {
    render(await AboutPage());

    expect(screen.getByRole("heading", { name: "Agent 工作方式与测试边界" })).toBeInTheDocument();
    expect(screen.getByText("Execution Agent")).toBeInTheDocument();
    expect(screen.getByText("单元测试")).toBeInTheDocument();
    expect(screen.getByText("E2E / 场景 / API / UI")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "测试 UI Demo" })).toBeInTheDocument();
    expect(screen.getByText("SpecOS Test Console")).toBeInTheDocument();
    expect(screen.getByText("测试流程图")).toBeInTheDocument();
    expect(screen.getAllByText("reward-order spec v1.2.0").length).toBeGreaterThan(0);
    expect(screen.getByText("测试场景")).toBeInTheDocument();
    expect(screen.getByText("测试链条")).toBeInTheDocument();
    expect(screen.getByText("测试标准")).toBeInTheDocument();
    expect(screen.getByText("测试情况")).toBeInTheDocument();
    expect(screen.getByText("API + UI 主路径链条")).toBeInTheDocument();
  });
});
