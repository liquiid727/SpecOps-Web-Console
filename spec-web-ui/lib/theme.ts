export type NeoSurfaceVariant = "panel" | "hero" | "input" | "result" | "rail" | "row";
export type NeoSurfaceTint = "neutral" | "blue" | "emerald" | "lime" | "violet" | "amber" | "mint";
export type NeoInteractiveVariant = "accent" | "neutral";

export type ThemeMode = "neo" | "alro-pink";
export type ResolvedThemeMode = ThemeMode;
export type BrowserColorScheme = "light";

export const THEME_MODE_STORAGE_KEY = "specos-theme-mode";
export const THEME_CHANGE_EVENT = "specos-theme-change";
export const THEME_MODES: readonly ThemeMode[] = ["alro-pink", "neo"];
export const DEFAULT_THEME_MODE: ThemeMode = "alro-pink";

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

export function normalizeThemeMode(value: unknown): ThemeMode {
  return value === "neo" || value === "alro-pink" ? value : DEFAULT_THEME_MODE;
}

export const coerceThemeMode = normalizeThemeMode;

export function resolveThemeMode(
  mode: ThemeMode | string,
  _options: { now?: Date; systemPrefersDark?: boolean } = {}
): ResolvedThemeMode {
  return normalizeThemeMode(mode);
}

export type ThemeState = {
  colorScheme: BrowserColorScheme;
  isDark: false;
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  rootClassName: ResolvedThemeMode;
};

export function buildThemeState(
  mode: ThemeMode | string,
  _options: { hour?: number; systemPrefersDark?: boolean } = {}
): ThemeState {
  const normalizedMode = normalizeThemeMode(mode);

  return {
    colorScheme: "light",
    isDark: false,
    mode: normalizedMode,
    resolvedMode: normalizedMode,
    rootClassName: normalizedMode
  };
}

export function buildThemeBootScript(storageKey = THEME_MODE_STORAGE_KEY) {
  return `(() => {
  const storageKey = ${JSON.stringify(storageKey)};
  const supportedModes = ["neo", "alro-pink"];
  const fallbackMode = ${JSON.stringify(DEFAULT_THEME_MODE)};
  const root = document.documentElement;
  const serverMode = root.dataset.themeMode;
  let mode = supportedModes.includes(serverMode) ? serverMode : fallbackMode;
  try {
    const storedMode = window.localStorage.getItem(storageKey);
    if (supportedModes.includes(storedMode)) mode = storedMode;
  } catch {}
  const resolvedMode = mode;
  root.dataset.themeMode = mode;
  root.dataset.theme = resolvedMode;
  root.style.colorScheme = "light";
  root.classList.remove("dark", "light", "summer-surf", ...supportedModes);
  root.classList.add(resolvedMode);
  try {
    document.cookie = \`${storageKey}=\${encodeURIComponent(mode)}; path=/; max-age=31536000; SameSite=Lax\`;
  } catch {}
  window.dispatchEvent(new CustomEvent(${JSON.stringify(THEME_CHANGE_EVENT)}, {
    detail: { mode, resolvedMode }
  }));
})();`;
}

export function applyThemeMode(mode: ThemeMode | string, { persist = true } = {}) {
  const normalizedMode = normalizeThemeMode(mode);

  if (typeof document === "undefined") return normalizedMode;

  const root = document.documentElement;
  root.dataset.themeMode = normalizedMode;
  root.dataset.theme = normalizedMode;
  root.style.colorScheme = "light";
  root.classList.remove("dark", "light", "summer-surf", ...THEME_MODES);
  root.classList.add(normalizedMode);

  if (persist) {
    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, normalizedMode);
    } catch {}

    try {
      document.cookie = `${THEME_MODE_STORAGE_KEY}=${encodeURIComponent(normalizedMode)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  }

  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
    detail: { mode: normalizedMode, resolvedMode: normalizedMode }
  }));

  return normalizedMode;
}
