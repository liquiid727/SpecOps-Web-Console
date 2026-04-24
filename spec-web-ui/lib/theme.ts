export type GlassSurfaceVariant = "panel" | "hero" | "input" | "result" | "rail" | "row";
export type GlassSurfaceTint = "neutral" | "blue" | "emerald" | "lime" | "violet" | "amber" | "mint";
export type GlassInteractiveVariant = "accent" | "neutral";

export type ThemeMode = "light" | "dark" | "system" | "auto";
export type ResolvedThemeMode = "light" | "dark";

export const THEME_MODE_STORAGE_KEY = "specos-theme-mode";
export const THEME_CHANGE_EVENT = "specos-theme-change";
export const DEFAULT_THEME_MODE: ThemeMode = "system";

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
  const tintClassName = `glass-tint-${tint}`;

  switch (variant) {
    case "hero":
      return `glass-surface glass-surface-hero ${tintClassName} border border-white/14 bg-white/[0.08] backdrop-blur-3xl ring-1 ring-white/10 shadow-[0_28px_120px_rgba(4,10,24,0.52)]`;
    case "input":
      return `glass-input ${tintClassName} border border-white/12 bg-white/[0.07] backdrop-blur-2xl focus-within:ring-2 focus-within:ring-emerald-300/30`;
    case "rail":
      return `glass-surface glass-surface-rail ${tintClassName} border border-white/8 bg-white/[0.04] backdrop-blur-xl`;
    case "row":
      return `glass-surface glass-surface-row ${tintClassName} border border-white/10 bg-white/[0.04] backdrop-blur-xl`;
    case "result":
      return `glass-surface glass-surface-result ${tintClassName} perspective-[1400px] border border-white/12 bg-white/[0.06] backdrop-blur-2xl`;
    case "panel":
    default:
      return `glass-surface glass-surface-panel ${tintClassName} border border-white/12 bg-white/[0.06] backdrop-blur-2xl`;
  }
}

export function buildGlassInteractiveClassName(variant: GlassInteractiveVariant) {
  switch (variant) {
    case "accent":
      return "glass-interactive glass-interactive-accent border border-emerald-300/25 bg-gradient-to-br from-emerald-400/24 via-cyan-400/16 to-lime-300/18 text-emerald-50 hover:border-emerald-200/40 hover:from-emerald-300/30 hover:via-cyan-300/22 hover:to-lime-200/24";
    case "neutral":
    default:
      return "glass-interactive glass-interactive-neutral border border-white/10 bg-white/[0.05] text-slate-200 hover:border-white/18 hover:bg-white/[0.08]";
  }
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
