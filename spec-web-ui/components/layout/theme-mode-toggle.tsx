"use client";

import React, { useEffect, useState } from "react";

import {
  THEME_CHANGE_EVENT,
  buildThemeState,
  normalizeThemeMode,
  THEME_MODE_STORAGE_KEY,
  type ResolvedThemeMode,
  type ThemeMode
} from "@/lib/theme";
import { cn } from "@/lib/utils";

function readSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeMode(mode: ThemeMode) {
  const state = buildThemeState(mode, {
    hour: new Date().getHours(),
    systemPrefersDark: readSystemPrefersDark()
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
  const [resolvedMode, setResolvedMode] = useState<ResolvedThemeMode>("dark");

  useEffect(() => {
    let storedMode: ThemeMode = "system";

    try {
      storedMode = normalizeThemeMode(window.localStorage.getItem(THEME_MODE_STORAGE_KEY));
    } catch {}

    const state = applyThemeMode(storedMode);
    setMode(storedMode);
    setResolvedMode(state.resolvedMode);
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const state = applyThemeMode(mode);
      setResolvedMode(state.resolvedMode);

      try {
        window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
      } catch {}
    };

    syncTheme();

    if (mode !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      syncTheme();
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
      const state = applyThemeMode(mode);
      setResolvedMode(state.resolvedMode);
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mode]);

  const isDark = resolvedMode === "dark";

  return (
    <div className={compact ? "space-y-0" : "space-y-2"}>
      <button
        aria-checked={isDark}
        aria-label="Theme"
        className={cn(
          "theme-switch control control-secondary inline-flex items-center rounded-full",
          compact ? "theme-switch-compact" : "theme-switch-regular"
        )}
        onClick={() => setMode(isDark ? "light" : "dark")}
        role="switch"
        type="button"
      >
        <span className={cn("theme-switch-label", !isDark && "theme-switch-label-active")}>Day</span>
        <span className="theme-switch-track" aria-hidden="true">
          <span className={cn("theme-switch-thumb", isDark && "theme-switch-thumb-dark")} />
        </span>
        <span className={cn("theme-switch-label", isDark && "theme-switch-label-active")}>Night</span>
      </button>
      {compact ? null : (
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
          theme: {isDark ? "dark" : "light"}
        </p>
      )}
    </div>
  );
}
