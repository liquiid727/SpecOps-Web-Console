import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeModeToggle } from "@/components/layout/theme-mode-toggle";

function installMatchMedia(matches = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

function installLocalStorage() {
  const storage = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    writable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      }
    }
  });
}

describe("ThemeModeToggle", () => {
  beforeEach(() => {
    installLocalStorage();
    window.localStorage.clear();
    installMatchMedia(false);
  });

  it("renders theme options inside an icon menu and applies explicit light mode", () => {
    window.localStorage.setItem("specos-theme-mode", "dark");

    render(<ThemeModeToggle compact />);

    const themeMenu = screen.getByRole("button", { name: "主题" });

    expect(themeMenu).toHaveAttribute("aria-haspopup", "menu");
    expect(themeMenu).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(themeMenu);

    fireEvent.click(screen.getByRole("menuitemradio", { name: "日间" }));

    expect(window.localStorage.getItem("specos-theme-mode")).toBe("light");
  });
});
