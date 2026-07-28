import { describe, expect, it } from "vitest";
import { formatShortcut, getShortcut, matchesShortcut, SHORTCUT_CATEGORY_LABEL, SHORTCUTS } from "./shortcuts";

type KeyEvent = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">;

function keyEvent(overrides: Partial<KeyEvent> & { key: string }): KeyEvent {
  return { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...overrides };
}

describe("shortcuts definition", () => {
  it("has unique ids and no duplicate key combos", () => {
    const ids = SHORTCUTS.map((shortcut) => shortcut.id);
    expect(new Set(ids).size).toBe(ids.length);
    const combos = SHORTCUTS.map((shortcut) => shortcut.keys.join("+"));
    expect(new Set(combos).size).toBe(combos.length);
  });

  it("covers every category with a label key", () => {
    for (const shortcut of SHORTCUTS) {
      expect(SHORTCUT_CATEGORY_LABEL[shortcut.category]).toBeTruthy();
      expect(shortcut.labelKey.length).toBeGreaterThan(0);
    }
  });

  it("throws on unknown shortcut ids", () => {
    expect(() => getShortcut("nonexistent")).toThrow(/unknown shortcut/);
  });
});

describe("matchesShortcut", () => {
  it("matches Mod shortcuts with either meta or ctrl", () => {
    expect(matchesShortcut(keyEvent({ key: "b", metaKey: true }), "toggle-navigator")).toBe(true);
    expect(matchesShortcut(keyEvent({ key: "B", ctrlKey: true }), "toggle-navigator")).toBe(true);
    expect(matchesShortcut(keyEvent({ key: "b" }), "toggle-navigator")).toBe(false);
  });

  it("requires exact modifiers (Cmd+Shift+B does not trigger Cmd+B)", () => {
    expect(matchesShortcut(keyEvent({ key: "b", metaKey: true, shiftKey: true }), "toggle-navigator")).toBe(false);
    expect(matchesShortcut(keyEvent({ key: "i", metaKey: true, shiftKey: true }), "toggle-inspector-alt")).toBe(true);
    expect(matchesShortcut(keyEvent({ key: "b", metaKey: true, altKey: true }), "toggle-navigator")).toBe(false);
  });

  it("treats literal Ctrl as ctrlKey without metaKey", () => {
    expect(matchesShortcut(keyEvent({ key: "Tab", ctrlKey: true }), "work-mode-next")).toBe(true);
    expect(matchesShortcut(keyEvent({ key: "Tab", metaKey: true }), "work-mode-next")).toBe(false);
    expect(matchesShortcut(keyEvent({ key: "Tab", ctrlKey: true, shiftKey: true }), "work-mode-previous")).toBe(true);
    expect(matchesShortcut(keyEvent({ key: "Tab", ctrlKey: true, shiftKey: true }), "work-mode-next")).toBe(false);
  });

  it("never matches display-only entries", () => {
    expect(matchesShortcut(keyEvent({ key: "Enter" }), "send-prompt")).toBe(false);
    expect(matchesShortcut(keyEvent({ key: "Enter", shiftKey: true }), "insert-newline")).toBe(false);
  });
});

describe("formatShortcut", () => {
  it("renders mac symbols without separators", () => {
    expect(formatShortcut(["Mod", "B"], "mac")).toBe("⌘B");
    expect(formatShortcut(["Mod", "Shift", "I"], "mac")).toBe("⌘⇧I");
    expect(formatShortcut(["Ctrl", "Tab"], "mac")).toBe("⌃Tab");
  });

  it("renders other platforms with plus separators and Mod as Ctrl", () => {
    expect(formatShortcut(["Mod", "B"], "other")).toBe("Ctrl+B");
    expect(formatShortcut(["Mod", "Shift", "I"], "other")).toBe("Ctrl+Shift+I");
    expect(formatShortcut(["Ctrl", "Tab"], "other")).toBe("Ctrl+Tab");
    expect(formatShortcut(["Shift", "Enter"], "other")).toBe("Shift+Enter");
  });
});
