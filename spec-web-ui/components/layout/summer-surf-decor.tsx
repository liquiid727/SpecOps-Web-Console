"use client";

import React, { useEffect, useState } from "react";

import {
  BeachUmbrellaIcon,
  CloudIcon,
  CoconutDrinkIcon,
  FlipFlopIcon,
  HibiscusIcon,
  LighthouseIcon,
  PalmTreeIcon,
  ShellIcon,
  SplashIcon,
  StarfishIcon,
  SunglassesIcon,
  SunIcon,
  SurfboardIcon,
  VolleyballIcon,
  WaveIcon
} from "@/components/icons/summer-surf";
import { getLocaleCopy, type Locale } from "@/lib/locale";
import { THEME_CHANGE_EVENT, type ResolvedThemeMode } from "@/lib/theme";

const STRIP_ICONS = [
  SunIcon,
  CloudIcon,
  PalmTreeIcon,
  WaveIcon,
  SurfboardIcon,
  SunglassesIcon,
  HibiscusIcon,
  VolleyballIcon,
  ShellIcon,
  BeachUmbrellaIcon,
  CoconutDrinkIcon,
  LighthouseIcon,
  StarfishIcon,
  FlipFlopIcon,
  SplashIcon
];

export function SummerSurfDecor({ locale = "zh" }: { locale?: Locale }) {
  const [resolvedMode, setResolvedMode] = useState<ResolvedThemeMode | null>(null);
  const copy = getLocaleCopy(locale);

  useEffect(() => {
    const readMode = () => document.documentElement.dataset.theme as ResolvedThemeMode | undefined;
    setResolvedMode(readMode() ?? null);

    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ resolvedMode: ResolvedThemeMode }>).detail;
      setResolvedMode(detail?.resolvedMode ?? readMode() ?? null);
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }, []);

  if (resolvedMode !== "summer-surf") {
    return null;
  }

  return (
    <div className="border-b border-line bg-[rgb(var(--summer-sand))]">
      <div className="mx-auto flex max-w-[1560px] items-center gap-3 overflow-x-auto px-6 py-1.5">
        <span
          className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{
            background: "rgb(var(--summer-sun))",
            color: "rgb(var(--summer-ink))"
          }}
        >
          {copy.shell.summerSurf}
        </span>
        <div className="flex shrink-0 items-center gap-2.5">
          {STRIP_ICONS.map((Icon, index) => (
            <Icon key={index} className="h-5 w-5 shrink-0" aria-hidden="true" />
          ))}
        </div>
      </div>
    </div>
  );
}
