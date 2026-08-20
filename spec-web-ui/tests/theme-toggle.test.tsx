import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeModeToggle } from "@/components/layout/theme-mode-toggle";

beforeEach(() => {
  const values = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value))
    }
  });
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-mode");
});

describe("ThemeModeToggle", () => {
  it("renders the current Alro Pink marker and both theme options", () => {
    render(<ThemeModeToggle compact />);

    expect(screen.getByRole("button", { name: "视觉系统" })).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.getByText("A")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "视觉系统" }));

    expect(screen.getByRole("menuitemradio", { name: /Alro Pink/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: /Neo/ })).toHaveAttribute("aria-checked", "false");
  });

  it("applies and persists Neo when selected", () => {
    render(<ThemeModeToggle compact />);

    fireEvent.click(screen.getByRole("button", { name: "视觉系统" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Neo/ }));

    expect(document.documentElement.dataset.theme).toBe("neo");
    expect(window.localStorage.getItem("specos-theme-mode")).toBe("neo");
    expect(document.cookie).toContain("specos-theme-mode=neo");
    expect(screen.getByRole("button", { name: "视觉系统" })).toHaveTextContent("Neo");
  });
});
