import { describe, expect, it } from "vitest";

import {
  buildGlassInteractiveClassName,
  buildGlassSurfaceClassName,
  buildTrafficLightClassName,
  buildThemeBootScript,
  coerceThemeMode,
  DEFAULT_THEME_MODE,
  resolveThemeMode
} from "@/lib/theme";

describe("resolveThemeMode", () => {
  it("resolves explicit, system, and auto theme modes", () => {
    expect(resolveThemeMode("light", { systemPrefersDark: true })).toBe("light");
    expect(resolveThemeMode("dark", { systemPrefersDark: false })).toBe("dark");
    expect(resolveThemeMode("system", { systemPrefersDark: true })).toBe("dark");
    expect(resolveThemeMode("system", { systemPrefersDark: false })).toBe("light");
    expect(resolveThemeMode("auto", { now: new Date("2026-04-24T08:00:00") })).toBe("light");
    expect(resolveThemeMode("auto", { now: new Date("2026-04-24T20:00:00") })).toBe("dark");
  });

  it("coerces unknown theme modes to the default mode", () => {
    expect(coerceThemeMode("light")).toBe("light");
    expect(coerceThemeMode("invalid-mode")).toBe(DEFAULT_THEME_MODE);
    expect(coerceThemeMode(undefined)).toBe(DEFAULT_THEME_MODE);
  });

  it("uses Summer Surf as the default theme", () => {
    expect(DEFAULT_THEME_MODE).toBe("summer-surf");
    expect(resolveThemeMode(DEFAULT_THEME_MODE, { systemPrefersDark: true })).toBe("summer-surf");
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
  it("returns stable monochrome surface recipes for shared workbench sections", () => {
    expect(buildGlassSurfaceClassName("panel")).toContain("surface-panel");
    expect(buildGlassSurfaceClassName("panel")).toContain("surface-tone-neutral");
    expect((buildGlassSurfaceClassName as (...args: unknown[]) => string)("panel", "neutral")).toContain(
      "surface-tone-neutral"
    );
    expect((buildGlassSurfaceClassName as (...args: unknown[]) => string)("rail", "blue")).toContain(
      "surface-tone-blue"
    );
    expect((buildGlassSurfaceClassName as (...args: unknown[]) => string)("rail", "emerald")).toContain(
      "surface-tone-emerald"
    );
    expect((buildGlassSurfaceClassName as (...args: unknown[]) => string)("row", "amber")).toContain(
      "surface-tone-amber"
    );
    expect(buildGlassSurfaceClassName("rail")).toContain("surface-rail");
    expect(buildGlassSurfaceClassName("hero")).toContain("surface-window");
    expect(buildGlassSurfaceClassName("input")).toContain("surface-field");
    expect(buildGlassSurfaceClassName("result")).toContain("surface-result");
    expect(buildGlassSurfaceClassName("row")).toContain("surface-row");
  });

  it("returns restrained system-tool button treatments", () => {
    expect(buildGlassInteractiveClassName("accent")).toContain("control-primary");
    expect(buildGlassInteractiveClassName("neutral")).toContain("control-secondary");
  });

  it("returns mac-style traffic light markers for major section titlebars", () => {
    expect(buildTrafficLightClassName("red")).toContain("traffic-light");
    expect(buildTrafficLightClassName("red")).toContain("traffic-light-red");
    expect(buildTrafficLightClassName("yellow")).toContain("traffic-light-yellow");
    expect(buildTrafficLightClassName("green")).toContain("traffic-light-green");
  });
});
