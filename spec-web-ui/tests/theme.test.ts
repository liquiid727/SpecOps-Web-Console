import { describe, expect, it } from "vitest";

import {
  buildGlassInteractiveClassName,
  buildGlassSurfaceClassName,
  buildThemeBootScript,
  coerceThemeMode,
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
    expect(coerceThemeMode("invalid-mode")).toBe("system");
    expect(coerceThemeMode(undefined)).toBe("system");
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

describe("glass theme helpers", () => {
  it("returns stable glass surface recipes for the neon mint theme", () => {
    expect(buildGlassSurfaceClassName("panel")).toContain("backdrop-blur");
    expect(buildGlassSurfaceClassName("panel")).toContain("bg-white/[0.06]");
    expect((buildGlassSurfaceClassName as (...args: unknown[]) => string)("panel", "neutral")).toContain(
      "glass-tint-neutral"
    );
    expect((buildGlassSurfaceClassName as (...args: unknown[]) => string)("rail", "blue")).toContain(
      "glass-tint-blue"
    );
    expect((buildGlassSurfaceClassName as (...args: unknown[]) => string)("rail", "emerald")).toContain(
      "glass-tint-emerald"
    );
    expect((buildGlassSurfaceClassName as (...args: unknown[]) => string)("row", "amber")).toContain(
      "glass-tint-amber"
    );
    expect(buildGlassSurfaceClassName("rail")).toContain("glass-surface-rail");
    expect(buildGlassSurfaceClassName("rail")).toContain("bg-white/[0.04]");
    expect(buildGlassSurfaceClassName("hero")).toContain("shadow-[0_28px_120px");
    expect(buildGlassSurfaceClassName("input")).toContain("focus-within:ring-2");
    expect(buildGlassSurfaceClassName("result")).toContain("glass-surface-result");
    expect(buildGlassSurfaceClassName("row")).toContain("glass-surface-row");
    expect(buildGlassSurfaceClassName("row")).toContain("backdrop-blur-xl");
  });

  it("returns richer button and chip treatments for accent and neutral states", () => {
    expect(buildGlassInteractiveClassName("accent")).toContain("from-emerald-400/24");
    expect(buildGlassInteractiveClassName("neutral")).toContain("hover:border-white/18");
  });
});
