import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WindowSection } from "@/components/ui/window-section";

describe("WindowSection", () => {
  it("renders a titlebar with three traffic lights and a content region", () => {
    render(
      <WindowSection
        title="Starter results"
        description="Review the default catalog composition for the active workspace."
      >
        <p>Section body</p>
      </WindowSection>
    );

    expect(screen.getByText("Starter results")).toBeInTheDocument();
    expect(
      screen.getByText("Review the default catalog composition for the active workspace.")
    ).toBeInTheDocument();
    expect(screen.getByText("Section body")).toBeInTheDocument();
    expect(screen.getAllByTestId("traffic-light")).toHaveLength(3);
  });
});
