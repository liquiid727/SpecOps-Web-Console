export type GlassSurfaceVariant = "panel" | "hero" | "input" | "result" | "rail" | "row";
export type GlassSurfaceTint = "neutral" | "blue" | "emerald" | "lime" | "violet" | "amber" | "mint";
export type GlassInteractiveVariant = "accent" | "neutral";
export type TrafficLightTone = "red" | "yellow" | "green";

export type ThemeMode = "light" | "dark" | "system" | "auto";
export type ResolvedThemeMode = "light" | "dark";

export const THEME_MODE_STORAGE_KEY = "specos-theme-mode";
export const THEME_CHANGE_EVENT = "specos-theme-change";
export const DEFAULT_THEME_MODE: ThemeMode = "system";
export const WINDOW_TRAFFIC_LIGHTS: TrafficLightTone[] = ["red", "yellow", "green"];

const VALID_THEME_MODES = ["light", "dark", "system", "auto"] as const;

export type ThemeState = {
  colorScheme: ResolvedThemeMode;
  isDark: boolean;
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  rootClassName: ResolvedThemeMode;
};

export function buildGlassSurfaceClassName(
  variant: GlassSurfaceVariant,
  tint: GlassSurfaceTint = "neutral"
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

export function buildGlassInteractiveClassName(variant: GlassInteractiveVariant) {
  switch (variant) {
    case "accent":
      return "control control-primary";
    case "neutral":
    default:
      return "control control-secondary";
  }
}

export function buildTrafficLightClassName(tone: TrafficLightTone) {
  return `traffic-light traffic-light-${tone}`;
}

export function normalizeThemeMode(value: unknown): ThemeMode {
  return typeof value === "string" && VALID_THEME_MODES.includes(value.trim() as ThemeMode)
    ? (value.trim() as ThemeMode)
    : DEFAULT_THEME_MODE;
}

export const coerceThemeMode = normalizeThemeMode;

export function resolveThemeMode(
  mode: ThemeMode,
  options: { now?: Date; systemPrefersDark?: boolean }
): ResolvedThemeMode {
  const hour = options.now?.getHours() ?? new Date().getHours();
  const systemPrefersDark = options.systemPrefersDark ?? false;

  switch (mode) {
    case "light":
      return "light";
    case "dark":
      return "dark";
    case "auto":
      return hour >= 18 || hour < 6 ? "dark" : "light";
    case "system":
    default:
      return systemPrefersDark ? "dark" : "light";
  }
}

export function buildThemeState(
  mode: ThemeMode,
  options: { hour: number; systemPrefersDark: boolean }
): ThemeState {
  const resolvedMode = resolveThemeMode(mode, {
    now: new Date(new Date().setHours(options.hour, 0, 0, 0)),
    systemPrefersDark: options.systemPrefersDark
  });

  return {
    colorScheme: resolvedMode,
    isDark: resolvedMode === "dark",
    mode,
    resolvedMode,
    rootClassName: resolvedMode
  };
}

export function buildThemeBootScript(storageKey = THEME_MODE_STORAGE_KEY) {
  return `(() => {
  const storageKey = ${JSON.stringify(storageKey)};
  const defaultMode = ${JSON.stringify(DEFAULT_THEME_MODE)};
  const validModes = ${JSON.stringify(VALID_THEME_MODES)};
  const normalize = (value) => {
    if (typeof value !== "string") return defaultMode;
    const normalized = value.trim();
    return validModes.includes(normalized) ? normalized : defaultMode;
  };
  const resolve = (mode, systemPrefersDark, hour) => {
    if (mode === "light") return "light";
    if (mode === "dark") return "dark";
    if (mode === "auto") return hour >= 18 || hour < 6 ? "dark" : "light";
    return systemPrefersDark ? "dark" : "light";
  };
  const root = document.documentElement;
  let rawMode = defaultMode;
  try {
    rawMode = window.localStorage.getItem(storageKey);
  } catch {}
  const mode = normalize(rawMode);
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedMode = resolve(mode, systemPrefersDark, new Date().getHours());
  root.dataset.themeMode = mode;
  root.dataset.theme = resolvedMode;
  root.style.colorScheme = resolvedMode;
  root.classList.toggle("dark", resolvedMode === "dark");
  root.classList.toggle("light", resolvedMode === "light");
  window.dispatchEvent(new CustomEvent(${JSON.stringify(THEME_CHANGE_EVENT)}, {
    detail: { mode, resolvedMode }
  }));
})();`;
}
