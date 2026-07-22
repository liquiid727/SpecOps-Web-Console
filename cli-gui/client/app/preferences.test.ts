import { describe, expect, it } from "vitest";
import { defaultPreferences, parsePreferences, preferencesKey, readPreferences, writePreferences } from "./preferences";

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
    expect(parsePreferences(JSON.stringify(previous))).toEqual({ ...previous, currentView: "quest-home", rightPanelTab: "summary" });
  });

  it("resets unknown versions and corrupted fields", () => {
    expect(parsePreferences(JSON.stringify({ version: 2, navigatorOpen: false }))).toEqual(defaultPreferences);
    expect(parsePreferences("{" )).toEqual(defaultPreferences);
    expect(parsePreferences(JSON.stringify({ ...defaultPreferences, centerViewBySession: { session: "preview" } }))).toEqual(defaultPreferences);
    expect(parsePreferences(JSON.stringify({ ...defaultPreferences, theme: "sepia" }))).toEqual(defaultPreferences);
  });
});
