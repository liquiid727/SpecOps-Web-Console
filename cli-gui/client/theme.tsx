import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { TranslationKey } from "./i18n";

export type ThemeId = "qoder-light" | "classic" | "neo" | "zcode";

export interface ThemeDefinition {
  id: ThemeId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  colorScheme: "light" | "dark";
  rootClassName: string;
}

export const themeStorageKey = "product-ai-os-cli-gui-theme";

export const themeDefinitions = [
  { id: "qoder-light", labelKey: "themeQoderLight", descriptionKey: "themeQoderLightDescription", colorScheme: "light", rootClassName: "theme-qoder-light" },
  { id: "neo", labelKey: "themeNeo", descriptionKey: "themeNeoDescription", colorScheme: "light", rootClassName: "theme-neo" },
  { id: "classic", labelKey: "themeClassic", descriptionKey: "themeClassicDescription", colorScheme: "dark", rootClassName: "theme-classic" },
  { id: "zcode", labelKey: "themeZcode", descriptionKey: "themeZcodeDescription", colorScheme: "dark", rootClassName: "theme-zcode" }
] as const satisfies readonly ThemeDefinition[];

const ThemeContext = createContext<{
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: readonly ThemeDefinition[];
} | undefined>(undefined);

export function normalizeTheme(value: unknown): ThemeId {
  return value === "classic" || value === "neo" || value === "qoder-light" || value === "zcode" ? value : "qoder-light";
}

export function readTheme(storage: Pick<Storage, "getItem"> | undefined = typeof window === "undefined" ? undefined : window.localStorage): ThemeId {
  try {
    return normalizeTheme(storage?.getItem(themeStorageKey));
  } catch {
    return "qoder-light";
  }
}

function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  const definition = themeDefinitions.find((item) => item.id === theme) ?? themeDefinitions[0];
  const root = document.documentElement;
  root.dataset.theme = definition.id;
  root.style.colorScheme = definition.colorScheme;
  root.classList.remove(...themeDefinitions.map((item) => item.rootClassName));
  root.classList.add(definition.rootClassName);
}

function persistTheme(theme: ThemeId) {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Theme state remains available for the current session when storage is unavailable.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    const normalized = normalizeTheme(next);
    setThemeState(normalized);
    applyTheme(normalized);
    persistTheme(normalized);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, themes: themeDefinitions }), [setTheme, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
