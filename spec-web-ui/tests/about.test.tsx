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
  it("shows the Agent-Native SDLC workflow and test console on a dedicated about route", async () => {
    render(await AboutPage());

    expect(screen.getByRole("heading", { name: "Agent-Native SDLC 工作流" })).toBeInTheDocument();
    expect(screen.getByText("Execution Agent")).toBeInTheDocument();
    expect(screen.getByText("实现耦合的单元测试")).toBeInTheDocument();
    expect(screen.getByText(/E2E \/ 场景 \/ API \/ UI/)).toBeInTheDocument();
    expect(screen.getByText("Feature Verify")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "测试 UI Demo" })).toBeInTheDocument();
    expect(screen.getByText("SpecOS Test Console")).toBeInTheDocument();
    expect(screen.getByText("测试流程图")).toBeInTheDocument();
    expect(screen.getAllByText("reward-order SPEC-R001-F01-001").length).toBeGreaterThan(0);
    expect(screen.getByText("测试场景")).toBeInTheDocument();
    expect(screen.getByText("测试链条")).toBeInTheDocument();
    expect(screen.getByText("测试标准")).toBeInTheDocument();
    expect(screen.getByText("测试情况")).toBeInTheDocument();
    expect(screen.getByText("API + UI 主路径链条")).toBeInTheDocument();
  });
});
