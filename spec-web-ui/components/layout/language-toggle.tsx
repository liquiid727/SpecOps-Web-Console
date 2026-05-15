"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

import {
  LOCALE_STORAGE_KEY,
  getLocaleCopy,
  getOppositeLocale,
  type Locale
} from "@/lib/locale";
import { cn } from "@/lib/utils";

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {}

  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.dataset.locale = locale;
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
}

export function LanguageToggle({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const router = useRouter();
  const copy = getLocaleCopy(locale);
  const [open, setOpen] = useState(false);
  const options: Array<{ locale: Locale; label: string }> = [
    { locale: "zh", label: "中文" },
    { locale: "en", label: "EN" }
  ];

  return (
    <div className="utility-menu">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={copy.shell.languageLabel}
        className={cn(
          "utility-menu-button control control-secondary inline-flex cursor-pointer list-none items-center rounded-full",
          compact ? "utility-menu-button-compact" : "utility-menu-button-regular"
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" className="utility-menu-icon">A</span>
        <span className="utility-menu-current">{locale === "zh" ? "中文" : "EN"}</span>
      </button>
      <div className={cn("utility-menu-popover", !open && "hidden")} role="menu" aria-label={copy.shell.languageLabel}>
        {options.map((option) => (
          <button
            aria-checked={option.locale === locale}
            className={cn("utility-menu-item", option.locale === locale && "utility-menu-item-active")}
            key={option.locale}
            onClick={() => {
              persistLocale(option.locale === locale ? getOppositeLocale(locale) : option.locale);
              setOpen(false);
              router.refresh();
            }}
            role="menuitemradio"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
