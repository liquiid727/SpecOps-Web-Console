import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, getLocaleCopy, normalizeLocale } from "@/lib/locale";

describe("locale helpers", () => {
  it("defaults to Chinese when no supported locale is provided", () => {
    expect(DEFAULT_LOCALE).toBe("zh");
    expect(normalizeLocale(null)).toBe("zh");
    expect(normalizeLocale("")).toBe("zh");
    expect(normalizeLocale("fr")).toBe("zh");
  });

  it("returns shell copy for Chinese and English versions", () => {
    expect(getLocaleCopy("zh").shell.nav.discover).toBe("发现");
    expect(getLocaleCopy("en").shell.nav.discover).toBe("Discover");
    expect(getLocaleCopy("zh").shell.nav.agentTeams).toBe("Agent Team");
    expect(getLocaleCopy("en").shell.nav.agentTeams).toBe("Agent teams");
  });
});
