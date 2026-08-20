import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyThemeMode,
  buildNeoInteractiveClassName,
  buildNeoSurfaceClassName,
  buildThemeBootScript,
  buildThemeState,
  coerceThemeMode,
  DEFAULT_THEME_MODE,
  resolveThemeMode
} from "@/lib/theme";

function installLocalStorage() {
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
}

beforeEach(() => {
  installLocalStorage();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-mode");
});

describe("resolveThemeMode", () => {
  it("resolves both supported visual systems", () => {
    expect(resolveThemeMode("alro-pink", { systemPrefersDark: true })).toBe("alro-pink");
    expect(resolveThemeMode("neo", { systemPrefersDark: false })).toBe("neo");
    expect(resolveThemeMode("summer-surf", { systemPrefersDark: false })).toBe("alro-pink");
  });

  it("accepts Neo as a persisted legacy theme and falls back safely", () => {
    expect(coerceThemeMode("alro-pink")).toBe("alro-pink");
    expect(coerceThemeMode("neo")).toBe("neo");
    expect(coerceThemeMode("light")).toBe(DEFAULT_THEME_MODE);
    expect(coerceThemeMode("invalid-mode")).toBe(DEFAULT_THEME_MODE);
    expect(coerceThemeMode(undefined)).toBe(DEFAULT_THEME_MODE);
  });

  it("uses Alro Pink as the default and preserves the selected state", () => {
    expect(DEFAULT_THEME_MODE).toBe("alro-pink");
    expect(resolveThemeMode(DEFAULT_THEME_MODE, { systemPrefersDark: true })).toBe("alro-pink");
    expect(buildThemeState("neo").mode).toBe("neo");
    expect(buildThemeState("neo").rootClassName).toBe("neo");
  });
});

describe("buildThemeBootScript", () => {
  it("includes persisted theme bootstrapping and custom event dispatch", () => {
    const script = buildThemeBootScript();

    expect(script).toContain("specos-theme-mode");
    expect(script).toContain("specos-theme-change");
    expect(script).toContain("root.dataset.theme");
    expect(script).toContain("window.localStorage");
    expect(script).toContain("alro-pink");
    expect(script).toContain("supportedModes");
  });
});

describe("applyThemeMode", () => {
  it("updates the document and persists the selected mode", () => {
    document.documentElement.className = "neo dark";
    document.documentElement.dataset.theme = "neo";
    document.documentElement.dataset.themeMode = "neo";

    const eventHandler = vi.fn();
    window.addEventListener("specos-theme-change", eventHandler);

    expect(applyThemeMode("alro-pink")).toBe("alro-pink");
    expect(document.documentElement.dataset.theme).toBe("alro-pink");
    expect(document.documentElement.dataset.themeMode).toBe("alro-pink");
    expect(document.documentElement.classList.contains("alro-pink")).toBe(true);
    expect(document.documentElement.classList.contains("neo")).toBe(false);
    expect(window.localStorage.getItem("specos-theme-mode")).toBe("alro-pink");
    expect(document.cookie).toContain("specos-theme-mode=alro-pink");
    expect(eventHandler).toHaveBeenCalledTimes(1);

    window.removeEventListener("specos-theme-change", eventHandler);
  });
});

describe("workbench theme helpers", () => {
  it("returns stable Neo surface recipes for shared workbench sections", () => {
    expect(buildNeoSurfaceClassName("panel")).toContain("surface-panel");
    expect(buildNeoSurfaceClassName("panel")).toContain("surface-tone-neutral");
    expect((buildNeoSurfaceClassName as (...args: unknown[]) => string)("panel", "neutral")).toContain(
      "surface-tone-neutral"
    );
    expect((buildNeoSurfaceClassName as (...args: unknown[]) => string)("rail", "blue")).toContain(
      "surface-tone-blue"
    );
    expect((buildNeoSurfaceClassName as (...args: unknown[]) => string)("rail", "emerald")).toContain(
      "surface-tone-emerald"
    );
    expect((buildNeoSurfaceClassName as (...args: unknown[]) => string)("row", "amber")).toContain(
      "surface-tone-amber"
    );
    expect(buildNeoSurfaceClassName("rail")).toContain("surface-rail");
    expect(buildNeoSurfaceClassName("hero")).toContain("surface-window");
    expect(buildNeoSurfaceClassName("input")).toContain("surface-field");
    expect(buildNeoSurfaceClassName("result")).toContain("surface-result");
    expect(buildNeoSurfaceClassName("row")).toContain("surface-row");
  });

  it("returns hard-edged button treatments", () => {
    expect(buildNeoInteractiveClassName("accent")).toContain("control-primary");
    expect(buildNeoInteractiveClassName("neutral")).toContain("control-secondary");
  });
});
