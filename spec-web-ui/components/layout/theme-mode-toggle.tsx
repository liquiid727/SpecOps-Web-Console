"use client";

import React, { useEffect, useState } from "react";

import { getLocaleCopy, type Locale } from "@/lib/locale";
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

export function ThemeModeToggle({ compact = false, locale = "zh" }: { compact?: boolean; locale?: Locale }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [resolvedMode, setResolvedMode] = useState<ResolvedThemeMode>("dark");
  const [open, setOpen] = useState(false);
  const copy = getLocaleCopy(locale);

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
  const modeOptions: Array<{ mode: ThemeMode; label: string }> = [
    { mode: "light", label: copy.shell.day },
    { mode: "dark", label: copy.shell.night },
    { mode: "auto", label: "Auto" }
  ];

  return (
    <div className={compact ? "space-y-0" : "space-y-2"}>
      <div className="utility-menu">
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={copy.shell.theme}
          className={cn(
            "utility-menu-button control control-secondary inline-flex cursor-pointer list-none items-center rounded-full",
            compact ? "utility-menu-button-compact" : "utility-menu-button-regular"
          )}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span aria-hidden="true" className="utility-menu-icon">{isDark ? "D" : "L"}</span>
          <span className="utility-menu-current">{isDark ? copy.shell.night : copy.shell.day}</span>
        </button>
        <div className={cn("utility-menu-popover", !open && "hidden")} role="menu" aria-label={copy.shell.theme}>
          {modeOptions.map((option) => (
            <button
              aria-checked={mode === option.mode}
              className={cn("utility-menu-item", mode === option.mode && "utility-menu-item-active")}
              key={option.mode}
              onClick={() => {
                setMode(option.mode);
                setOpen(false);
              }}
              role="menuitemradio"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {compact ? null : (
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
          {copy.shell.theme}: {mode}/{isDark ? "dark" : "light"}
        </p>
      )}
    </div>
  );
}
