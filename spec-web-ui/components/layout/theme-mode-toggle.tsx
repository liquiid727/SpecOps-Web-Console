"use client";

import { useEffect, useState } from "react";

import {
  THEME_CHANGE_EVENT,
  buildGlassInteractiveClassName,
  buildThemeState,
  normalizeThemeMode,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode
} from "@/lib/theme";

const THEME_MODE_OPTIONS: ThemeMode[] = ["light", "dark", "system", "auto"];
const COMPACT_LABELS: Record<ThemeMode, string> = {
  light: "L",
  dark: "D",
  system: "S",
  auto: "A"
};

function applyThemeMode(mode: ThemeMode) {
  const state = buildThemeState(mode, {
    hour: new Date().getHours(),
    systemPrefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches
  });
  const root = document.documentElement;

  root.dataset.themeMode = state.mode;
  root.dataset.theme = state.resolvedMode;
  root.style.colorScheme = state.colorScheme;
  root.classList.toggle("dark", state.isDark);
  root.classList.toggle("light", !state.isDark);
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { mode: state.mode, resolvedMode: state.resolvedMode }
    })
  );

  return state;
}

export function ThemeModeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    let storedMode: ThemeMode = "system";

    try {
      storedMode = normalizeThemeMode(window.localStorage.getItem(THEME_MODE_STORAGE_KEY));
    } catch {}

    setMode(storedMode);
    applyThemeMode(storedMode);
  }, []);

  useEffect(() => {
    applyThemeMode(mode);

    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    } catch {}

    if (mode !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyThemeMode(mode);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "auto") {
      return;
    }

    const intervalId = window.setInterval(() => {
      applyThemeMode(mode);
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mode]);

  return (
    <div className={compact ? "space-y-0" : "space-y-2"}>
      <div
        aria-label="Theme mode"
        className={`inline-flex items-center gap-1.5 rounded-[16px] border border-line/35 bg-panel/20 ${
          compact ? "px-1 py-1" : "p-2"
        }`}
        role="toolbar"
      >
        {THEME_MODE_OPTIONS.map((option) => {
          const isActive = option === mode;

          return (
            <button
              key={option}
              aria-label={option[0].toUpperCase() + option.slice(1)}
              aria-pressed={isActive}
              className={`${buildGlassInteractiveClassName(isActive ? "accent" : "neutral")} rounded-[12px] ${
                compact ? "min-w-8 px-2 py-1 text-[10px]" : "px-3 py-2 text-xs"
              } font-mono uppercase tracking-[0.14em] transition`}
              onClick={() => setMode(option)}
              type="button"
            >
              {compact ? COMPACT_LABELS[option] : option}
            </button>
          );
        })}
      </div>
      {compact ? null : (
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">
          theme mode: {mode}
        </p>
      )}
    </div>
  );
}
