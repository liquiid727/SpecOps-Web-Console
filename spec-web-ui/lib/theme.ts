export type NeoSurfaceVariant = "panel" | "hero" | "input" | "result" | "rail" | "row";
export type NeoSurfaceTint = "neutral" | "blue" | "emerald" | "lime" | "violet" | "amber" | "mint";
export type NeoInteractiveVariant = "accent" | "neutral";

export type ThemeMode = "neo";
export type ResolvedThemeMode = "neo";
export type BrowserColorScheme = "light";

export const THEME_MODE_STORAGE_KEY = "specos-theme-mode";
export const THEME_CHANGE_EVENT = "specos-theme-change";
export const DEFAULT_THEME_MODE: ThemeMode = "neo";

export function buildNeoSurfaceClassName(
  variant: NeoSurfaceVariant,
  tint: NeoSurfaceTint = "neutral"
) {
  const tintClassName = `surface-tone-${tint}`;

  switch (variant) {
    case "hero":
      return `surface-base surface-window ${tintClassName}`;
    case "input":
      return `surface-field ${tintClassName}`;
    case "rail":
      return `surface-base surface-panel surface-rail ${tintClassName}`;
    case "row":
      return `surface-base surface-row ${tintClassName}`;
    case "result":
      return `surface-base surface-result ${tintClassName}`;
    case "panel":
    default:
      return `surface-base surface-panel ${tintClassName}`;
  }
}

export function buildNeoInteractiveClassName(variant: NeoInteractiveVariant) {
  return variant === "accent" ? "control control-primary" : "control control-secondary";
}

export function normalizeThemeMode(_value: unknown): ThemeMode {
  return DEFAULT_THEME_MODE;
}

export const coerceThemeMode = normalizeThemeMode;

export function resolveThemeMode(
  _mode: ThemeMode | string,
  _options: { now?: Date; systemPrefersDark?: boolean } = {}
): ResolvedThemeMode {
  return DEFAULT_THEME_MODE;
}

export type ThemeState = {
  colorScheme: BrowserColorScheme;
  isDark: false;
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  rootClassName: ResolvedThemeMode;
};

export function buildThemeState(
  _mode: ThemeMode | string,
  _options: { hour?: number; systemPrefersDark?: boolean } = {}
): ThemeState {
  return {
    colorScheme: "light",
    isDark: false,
    mode: DEFAULT_THEME_MODE,
    resolvedMode: DEFAULT_THEME_MODE,
    rootClassName: DEFAULT_THEME_MODE
  };
}

export function buildThemeBootScript(storageKey = THEME_MODE_STORAGE_KEY) {
  return `(() => {
  const storageKey = ${JSON.stringify(storageKey)};
  const root = document.documentElement;
  try {
    window.localStorage.getItem(storageKey);
  } catch {}
  const mode = "neo";
  const resolvedMode = "neo";
  root.dataset.themeMode = mode;
  root.dataset.theme = resolvedMode;
  root.style.colorScheme = "light";
  root.classList.remove("dark", "light", "summer-surf");
  root.classList.add("neo");
  window.dispatchEvent(new CustomEvent(${JSON.stringify(THEME_CHANGE_EVENT)}, {
    detail: { mode, resolvedMode }
  }));
})();`;
}
