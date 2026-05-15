import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageToggle } from "@/components/layout/language-toggle";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh })
}));

function installDocumentCookie() {
  let cookieValue = "";

  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => cookieValue,
    set: (value: string) => {
      cookieValue = value;
    }
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

describe("LanguageToggle", () => {
  beforeEach(() => {
    refresh.mockClear();
    installDocumentCookie();
    installLocalStorage();
    document.documentElement.lang = "";
    delete document.documentElement.dataset.locale;
  });

  it("renders Chinese as the active default language inside an icon menu and switches to English", () => {
    render(<LanguageToggle locale="zh" />);

    const languageMenu = screen.getByRole("button", { name: "语言" });

    expect(languageMenu).toHaveAttribute("aria-haspopup", "menu");
    expect(languageMenu).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(languageMenu);

    fireEvent.click(screen.getByRole("menuitemradio", { name: "EN" }));

    expect(window.localStorage.getItem("specos-locale")).toBe("en");
    expect(document.cookie).toContain("specos-locale=en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dataset.locale).toBe("en");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
