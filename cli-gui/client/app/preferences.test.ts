import { describe, expect, it } from "vitest";
import { cycleWorkMode, defaultPreferences, parsePreferences, preferencesKey, readPreferences, writePreferences, WORK_MODES } from "./preferences";

describe("versioned UI preferences", () => {
  it("round-trips presentation-only state", () => {
    const values = new Map<string, string>();
    const value = { ...defaultPreferences, inspectorOpen: true, sessionGrouping: "recent" as const, centerViewBySession: { session: "terminal" as const } };
    writePreferences(value, { setItem: (key, raw) => values.set(key, raw) });
    expect(readPreferences({ getItem: (key) => values.get(key) ?? null })).toEqual(value);
    expect(values.get(preferencesKey)).not.toContain("workspace");
  });

  it("preserves old v1 preferences and defaults new view fields", () => {
    const previous = { version: 1, navigatorOpen: true, inspectorOpen: false, sessionGrouping: "project", sessionFilter: "active", inspectorTab: "details", centerViewBySession: {} };
    expect(parsePreferences(JSON.stringify(previous))).toEqual({ ...previous, currentView: "quest-home", rightPanelTab: "summary", composerWorkMode: "default" });
  });

  // —— console-gaps issue #3：四态工作模式持久化与循环 ——
  it("round-trips composerWorkMode and falls back to default on corrupted values", () => {
    expect(parsePreferences(JSON.stringify({ ...defaultPreferences, composerWorkMode: "plan" })).composerWorkMode).toBe("plan");
    expect(parsePreferences(JSON.stringify({ ...defaultPreferences, composerWorkMode: "turbo" })).composerWorkMode).toBe("default");
  });

  it("cycles work modes forward and backward in declared order", () => {
    expect(WORK_MODES).toEqual(["default", "spec", "goal", "plan"]);
    expect(cycleWorkMode("default", 1)).toBe("spec");
    expect(cycleWorkMode("spec", 1)).toBe("goal");
    expect(cycleWorkMode("goal", 1)).toBe("plan");
    expect(cycleWorkMode("plan", 1)).toBe("default");
    expect(cycleWorkMode("default", -1)).toBe("plan");
    expect(cycleWorkMode("spec", -1)).toBe("default");
  });

  it("resets unknown versions and corrupted fields", () => {
    expect(parsePreferences(JSON.stringify({ version: 2, navigatorOpen: false }))).toEqual(defaultPreferences);
    expect(parsePreferences("{" )).toEqual(defaultPreferences);
    expect(parsePreferences(JSON.stringify({ ...defaultPreferences, centerViewBySession: { session: "preview" } }))).toEqual(defaultPreferences);
    expect(parsePreferences(JSON.stringify({ ...defaultPreferences, theme: "sepia" }))).toEqual(defaultPreferences);
  });
});
