import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const failures: string[] = [];

async function filesUnder(directory: string, extensions: Set<string>): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path, extensions);
    return extensions.has(extname(entry.name)) ? [path] : [];
  }));
  return nested.flat();
}

function report(path: string, source: string, pattern: RegExp, message: string) {
  for (const match of source.matchAll(pattern)) {
    const line = source.slice(0, match.index).split("\n").length;
    failures.push(`${relative(root, path)}:${line} ${message}: ${match[0]}`);
  }
}

const componentFiles = await filesUnder(join(root, "client/components"), new Set([".tsx"]));
for (const path of componentFiles) {
  if (path.includes("/ui/") || path.endsWith(".test.tsx")) continue;
  const source = await readFile(path, "utf8");
  report(path, source, /<(?:button|input|textarea|select)\b/g, "business components must use the UI library");
  report(path, source, /(?:#[0-9a-f]{3,8}|\b(?:rgb|rgba|hsl|hsla|oklch)\s*\()/gi, "hard-coded color is forbidden");
}

for (const file of ["client/styles/components.css", "client/styles/qoder.css", "client/styles/responsive.css"]) {
  const path = join(root, file);
  const source = await readFile(path, "utf8");
  report(path, source, /(?:#[0-9a-f]{3,8}|\b(?:rgb|rgba|hsl|hsla|oklch)\s*\()/gi, "component and page CSS must use semantic tokens");
}

const theme = (await readFile(join(root, "client/styles/themes/qoder-light.css"), "utf8")).toLowerCase();
const expectedThemeTokens: Record<string, string> = {
  "--bg-page": "#f6f6f6",
  "--bg-panel": "#ffffff",
  "--bg-hover": "#f2f2f2",
  "--bg-active": "#ebebeb",
  "--border": "#e6e6e6",
  "--border-strong": "#d1d5db",
  "--text": "#111111",
  "--text-secondary": "#6b6b6b",
  "--text-tertiary": "#9ca3af",
  "--focus": "#2563eb",
  "--running": "#22c55e",
  "--warning": "#f59e0b",
  "--danger": "#ef4444"
};
for (const [token, value] of Object.entries(expectedThemeTokens)) {
  if (!theme.includes(`${token}: ${value}`)) failures.push(`client/styles/themes/qoder-light.css missing DESIGN.md mapping ${token}: ${value}`);
}

const uiExports = await readFile(join(root, "client/components/ui/index.ts"), "utf8");
for (const name of ["Button", "IconButton", "TextField", "TextArea", "Tabs", "Menu", "Badge", "Card", "EmptyState", "Icon", "Select", "Overlay", "Feedback"]) {
  if (!uiExports.includes(`./${name}`)) failures.push(`client/components/ui/index.ts does not export ${name}`);
}
const patternExports = await readFile(join(root, "client/components/patterns/index.ts"), "utf8");
for (const name of ["ViewHeader", "SectionHeader", "AsyncState", "ResourceRow", "SettingsSection", "DialogActions"]) {
  if (!patternExports.includes(`./${name}`)) failures.push(`client/components/patterns/index.ts does not export ${name}`);
}

const requiredThemeTokens = ["--bg-page", "--bg-panel", "--bg-sidebar", "--bg-hover", "--bg-active", "--border", "--border-subtle", "--text", "--text-secondary", "--text-tertiary", "--text-quaternary", "--focus", "--running", "--warning", "--danger"];
for (const themeName of ["qoder-light", "qoder-dark", "classic", "neo"]) {
  const source = await readFile(join(root, `client/styles/themes/${themeName}.css`), "utf8");
  for (const token of requiredThemeTokens) if (!source.includes(`${token}:`)) failures.push(`client/styles/themes/${themeName}.css missing semantic theme token ${token}`);
}

if (failures.length) {
  console.error("\n❌ CLI GUI governance check failed\n");
  failures.forEach((failure) => console.error(`  • ${failure}`));
  process.exit(1);
}

console.log("\n✅ CLI GUI governance check passed — DESIGN.md tokens, component exports, and business markup are aligned. 🎨\n");
