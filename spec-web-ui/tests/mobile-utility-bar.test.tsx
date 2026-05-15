import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover/template-feature-draft",
  useRouter: () => ({ refresh: vi.fn() })
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

    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: "语言" })).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.getByRole("button", { name: "主题" })).toHaveAttribute("aria-haspopup", "menu");
  });
});
