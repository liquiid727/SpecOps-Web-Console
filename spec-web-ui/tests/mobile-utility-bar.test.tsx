import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover/template-feature-draft"
}));

import { MobileUtilityBar } from "@/components/layout/mobile-utility-bar";

describe("MobileUtilityBar", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: () => null,
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      }
    });

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  });

  it("renders a floating home shortcut and theme control for small screens", () => {
    render(<MobileUtilityBar />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("switch", { name: "Theme" })).toBeInTheDocument();
  });
});
