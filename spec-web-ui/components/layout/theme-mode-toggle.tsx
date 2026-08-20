"use client";

import React, { useEffect, useState } from "react";

import { getLocaleCopy, type Locale } from "@/lib/locale";
import {
  applyThemeMode,
  DEFAULT_THEME_MODE,
  THEME_CHANGE_EVENT,
  THEME_MODES,
  normalizeThemeMode,
  type ThemeMode
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeModeToggle({
  compact = false,
  initialMode = DEFAULT_THEME_MODE,
  locale = "zh"
}: {
  compact?: boolean;
  initialMode?: ThemeMode;
  locale?: Locale;
}) {
  const copy = getLocaleCopy(locale);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    const syncMode = () => {
      setMode(normalizeThemeMode(document.documentElement.dataset.themeMode));
    };

    syncMode();
    window.addEventListener(THEME_CHANGE_EVENT, syncMode);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncMode);
  }, []);

  return (
    <div className="utility-menu">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={copy.shell.theme}
        className={cn(
          "utility-menu-button control control-secondary inline-flex cursor-pointer list-none items-center",
          compact ? "utility-menu-button-compact" : "utility-menu-button-regular"
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" className="utility-menu-icon">{mode === "alro-pink" ? "A" : "N"}</span>
        <span className="utility-menu-current">{copy.shell.themeOptions[mode]}</span>
      </button>
      <div className={cn("utility-menu-popover", !open && "hidden")} role="menu" aria-label={copy.shell.theme}>
        {THEME_MODES.map((option) => (
          <button
            aria-checked={option === mode}
            className={cn("utility-menu-item", option === mode && "utility-menu-item-active")}
            key={option}
            onClick={() => {
              applyThemeMode(option);
              setOpen(false);
            }}
            role="menuitemradio"
            type="button"
          >
            <span>{copy.shell.themeOptions[option]}</span>
            {option === mode ? <span aria-hidden="true">●</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
