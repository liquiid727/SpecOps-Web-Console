import { describe, expect, it } from "vitest";
import { normalizeTheme, readTheme, themeStorageKey } from "./theme";

describe("theme preferences", () => {
  it("defaults invalid and missing values to Neo", () => {
    expect(normalizeTheme(undefined)).toBe("neo");
    expect(normalizeTheme("sepia")).toBe("neo");
    expect(readTheme({ getItem: () => null })).toBe("neo");
    expect(readTheme({ getItem: () => "classic" })).toBe("classic");
  });

  it("survives storage failures", () => {
    expect(readTheme({ getItem: () => { throw new Error("blocked"); } })).toBe("neo");
    expect(themeStorageKey).toBe("product-ai-os-cli-gui-theme");
  });
});
