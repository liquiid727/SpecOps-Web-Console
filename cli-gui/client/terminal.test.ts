import { describe, expect, it } from "vitest";
import { getTerminalTheme } from "./terminal-theme";

describe("terminal theme", () => {
  it("uses distinct stable palettes for Neo and Classic", () => {
    const neo = getTerminalTheme("neo");
    const classic = getTerminalTheme("classic");
    expect(neo.background).toBe("#f7f9fc");
    expect(classic.background).toBe("#101011");
    expect(neo.foreground).not.toBe(classic.foreground);
  });
});
