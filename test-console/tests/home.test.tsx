import React from "react";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

describe("Test console home", () => {
  it("renders spec-driven overview copy", async () => {
    const page = await Page();
    render(page);
    expect(screen.getByText("Spec 驱动测试控制台")).toBeInTheDocument();
    expect(screen.getByText("SpecOS Test Console")).toBeInTheDocument();
    expect(screen.getByText("Developer Loop")).toBeInTheDocument();
    expect(screen.getByText("测试层级")).toBeInTheDocument();
    expect(screen.getByText("参考框架")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /TestZeus Hercules/ })).toHaveAttribute(
      "href",
      "https://github.com/test-zeus-ai/testzeus-hercules",
    );
    expect(screen.getByRole("link", { name: /Rhesis/ })).toHaveAttribute("href", "https://github.com/rhesis-ai/rhesis");
    expect(screen.getByText("Spec 总览")).toBeInTheDocument();
  });
});
