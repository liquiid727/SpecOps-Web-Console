import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WindowSection } from "@/components/ui/window-section";

describe("WindowSection", () => {
  it("can render a plain content section without terminal window decoration", () => {
    render(
      <WindowSection title="Catalog results" variant="plain">
        <p>Simple content</p>
      </WindowSection>
    );

    expect(screen.getByRole("heading", { name: "Catalog results" })).toBeInTheDocument();
    expect(screen.getByText("Simple content")).toBeInTheDocument();
    expect(screen.queryAllByTestId("traffic-light")).toHaveLength(0);
  });
});
