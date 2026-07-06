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
    expect(screen.getByRole("heading", { name: "项目模式说明" })).toBeInTheDocument();
    expect(screen.getByText("Feature Driven")).toBeInTheDocument();
    expect(screen.getByText("Workflow Driven")).toBeInTheDocument();
    expect(screen.getByText("Delivery Driven")).toBeInTheDocument();
    expect(screen.getByText("GoalSpec")).toBeInTheDocument();
    expect(screen.getByText("共享约束")).toBeInTheDocument();
    expect(screen.getByText("选择原则")).toBeInTheDocument();
    expect(screen.getAllByText("$ tree project/").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText((content, element) => element?.tagName === "SPAN" && content === "|-- implementation/").length
    ).toBeGreaterThan(0);
    expect(screen.getByText((content, element) => element?.tagName === "SPAN" && content.includes("tests.md"))).toBeInTheDocument();
    expect(screen.getByText("按测试类型拆分")).toBeInTheDocument();
    expect(screen.getByText("feature 内验证")).toBeInTheDocument();
    expect(screen.getAllByText("加载顺序").length).toBeGreaterThan(0);
    expect(screen.getAllByText("specs/RP-xxx").length).toBeGreaterThan(0);
    expect(screen.getByText("角色视角")).toBeInTheDocument();
    expect(screen.getByText("按一条 feature 线加载，目标是让 agent 一次读完最小上下文。")).toBeInTheDocument();
    expect(screen.getByText("specs/RP-xxx/ 下把 spec、tasks、tests、review、changelog 放在同一个 feature 目录里。")).toBeInTheDocument();
    expect(screen.getByText("tests/ 按 unit、integration、e2e、performance、security、results 等测试类型拆开，适合多角色并行。")).toBeInTheDocument();
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
