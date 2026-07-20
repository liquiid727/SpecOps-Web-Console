import { describe, expect, it } from "vitest";

import {
  buildNeoInteractiveClassName,
  buildNeoSurfaceClassName,
  buildThemeBootScript,
  coerceThemeMode,
  DEFAULT_THEME_MODE,
  resolveThemeMode
} from "@/lib/theme";

describe("resolveThemeMode", () => {
  it("always resolves to the Neo visual system", () => {
    expect(resolveThemeMode("light", { systemPrefersDark: true })).toBe("neo");
    expect(resolveThemeMode("dark", { systemPrefersDark: false })).toBe("neo");
    expect(resolveThemeMode("summer-surf", { systemPrefersDark: false })).toBe("neo");
  });

  it("coerces legacy and unknown values to the default mode", () => {
    expect(coerceThemeMode("light")).toBe(DEFAULT_THEME_MODE);
    expect(coerceThemeMode("summer-surf")).toBe(DEFAULT_THEME_MODE);
    expect(coerceThemeMode("invalid-mode")).toBe(DEFAULT_THEME_MODE);
    expect(coerceThemeMode(undefined)).toBe(DEFAULT_THEME_MODE);
  });

  it("uses Neo as the default theme", () => {
    expect(DEFAULT_THEME_MODE).toBe("neo");
    expect(resolveThemeMode(DEFAULT_THEME_MODE, { systemPrefersDark: true })).toBe("neo");
  });
});

describe("buildThemeBootScript", () => {
  it("includes persisted theme bootstrapping and custom event dispatch", () => {
    const script = buildThemeBootScript();

    expect(script).toContain("specos-theme-mode");
    expect(script).toContain("specos-theme-change");
    expect(script).toContain("root.dataset.theme");
    expect(script).toContain("window.localStorage");
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
