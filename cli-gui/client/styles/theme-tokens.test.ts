import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readStyle(name: string): string {
  return readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");
}

const themeFiles = ["qoder-light", "qoder-dark", "classic", "neo", "zcode", "bubrail"] as const;

// Semantic tokens that components.css depends on after the Qoder Light theme upgrade.
const requiredTokens = [
  "--bg-page",
  "--bg-panel",
  "--bg-sidebar",
  "--bg-hover",
  "--bg-active",
  "--border-subtle",
  "--text-tertiary",
  "--text-quaternary",
  "--yellow",
  "--danger-border",
  "--danger-text",
  "--success-border",
  "--warning-border",
  "--info-border",
  "--info-icon",
  "--diff-add-bg",
  "--diff-add-text",
  "--diff-del-bg",
  "--diff-del-text",
  "--diff-header-bg",
  "--diff-header-text",
  "--bubble-user-bg",
  "--bubble-user-border"
];

describe("theme token contract", () => {
  it("keeps components.css free of hardcoded hex colors", () => {
    const css = readStyle("../styles/components.css");
    const hexMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexMatches).toEqual([]);
  });

  it("keeps components.css free of hardcoded border-radius pixel values", () => {
    const css = readStyle("../styles/components.css");
    const rawRadius = css.match(/border-radius:\s*[0-9]+px/g) ?? [];
    expect(rawRadius).toEqual([]);
  });

 it("routes overlay drop-shadows through shadow tokens", () => {
    const css = readStyle("../styles/components.css");
    // Neutral drop-shadows must use --shadow-* tokens, not inline rgba(0,0,0,...) values.
    expect(css).not.toMatch(/box-shadow:[^;]*rgba\(\s*0\s*,\s*0\s*,\s*0/);
    expect(css).toContain("var(--shadow-pop)");
    expect(css).toContain("var(--shadow-drawer)");
  });

  for (const theme of themeFiles) {
    it(`defines the full semantic token contract in ${theme}.css`, () => {
      const css = readStyle(`../styles/themes/${theme}.css`);
      for (const token of requiredTokens) {
        expect(css, `${theme}.css must define ${token}`).toContain(`${token}:`);
      }
    });
  }
});
