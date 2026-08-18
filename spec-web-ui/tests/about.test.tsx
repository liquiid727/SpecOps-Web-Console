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
  it("shows the Agent-Native SDLC workflow and the single GoalSpec mode on a dedicated about route", async () => {
    render(await AboutPage());

    expect(screen.getByRole("heading", { name: "Agent-Native SDLC 工作流" })).toBeInTheDocument();
    expect(screen.getByText("Execution Agent")).toBeInTheDocument();
    expect(screen.getByText("实现耦合的单元测试")).toBeInTheDocument();
    expect(screen.getByText(/E2E \/ 场景 \/ API \/ UI/)).toBeInTheDocument();
    expect(screen.getByText("Feature Verify")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "项目模式说明" })).toBeInTheDocument();
    expect(screen.getByText("GoalSpec")).toBeInTheDocument();
    expect(screen.getAllByText("Agent-Native SDLC").length).toBeGreaterThan(0);
    expect(screen.getByText("共享约束")).toBeInTheDocument();
    expect(screen.getByText("选择原则")).toBeInTheDocument();
    expect(screen.getAllByText("$ tree .requirements/").length).toBeGreaterThan(0);
    expect(
      screen.getByText((content, element) => element?.tagName === "SPAN" && content.includes("|-- requirements/"))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => element?.tagName === "SPAN" && content.includes("|-- spec.md"))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => element?.tagName === "SPAN" && content.includes("`-- issues.md"))
    ).toBeInTheDocument();
    expect(screen.getAllByText("加载顺序").length).toBeGreaterThan(0);
    expect(screen.getAllByText(".requirements/README.md").length).toBeGreaterThan(0);
    expect(
      screen.getByText("按一个 Requirement Package 加载，一次读完 REQ→SPEC→TEST→ISSUE 整条链路。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("prd.md 用 RFC-2119 语言写 Goal / Non-Goal / REQ / BR / INV / Edge / AC，稳定 ID 不重排。")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "test.md 覆盖 happy / negative / permission / state / invariant / retry / concurrency / external failure / observability。"
      )
    ).toBeInTheDocument();
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
