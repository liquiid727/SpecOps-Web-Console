import React from "react";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

describe("Test console home", () => {
  it("renders spec-driven overview copy", async () => {
    const page = await Page();
    render(page);
    expect(screen.getByText("验证总览")).toBeInTheDocument();
    expect(screen.getByText("SpecOS Test Console")).toBeInTheDocument();
    expect(screen.getByText("Spec 总览")).toBeInTheDocument();
  });
});
