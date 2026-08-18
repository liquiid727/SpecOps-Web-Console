import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeModeToggle } from "@/components/layout/theme-mode-toggle";

describe("ThemeModeToggle", () => {
  it("renders a static Neo visual-system marker", () => {
    render(<ThemeModeToggle compact />);

    expect(screen.getByLabelText("视觉系统")).toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
  });
});
