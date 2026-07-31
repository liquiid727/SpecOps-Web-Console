import { describe, expect, it } from "vitest";
import { normalizeTheme, readTheme, themeStorageKey } from "./theme";

describe("theme preferences", () => {
  it("defaults invalid and missing values to Qoder Light", () => {
    expect(normalizeTheme(undefined)).toBe("qoder-light");
    expect(normalizeTheme("sepia")).toBe("qoder-light");
    expect(readTheme({ getItem: () => null })).toBe("qoder-light");
    expect(readTheme({ getItem: () => "classic" })).toBe("classic");
    expect(readTheme({ getItem: () => "zcode" })).toBe("zcode");
  });

  it("survives storage failures", () => {
    expect(readTheme({ getItem: () => { throw new Error("blocked"); } })).toBe("qoder-light");
    expect(themeStorageKey).toBe("product-ai-os-cli-gui-theme");
  });
});
