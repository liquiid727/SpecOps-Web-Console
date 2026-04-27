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

  it("renders a two-state theme switch and toggles explicit light/dark mode", () => {
    window.localStorage.setItem("specos-theme-mode", "dark");

    render(<ThemeModeToggle compact />);

    const themeSwitch = screen.getByRole("switch", { name: "Theme" });

    expect(themeSwitch).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Night")).toBeInTheDocument();

    fireEvent.click(themeSwitch);

    expect(themeSwitch).toHaveAttribute("aria-checked", "false");
    expect(window.localStorage.getItem("specos-theme-mode")).toBe("light");
  });
});
