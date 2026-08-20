import Link from "next/link";
import type { ReactNode } from "react";

import { LanguageToggle } from "@/components/layout/language-toggle";
import { MobileUtilityBar } from "@/components/layout/mobile-utility-bar";
import { SiteNav } from "@/components/layout/site-nav";
import { ThemeModeToggle } from "@/components/layout/theme-mode-toggle";
import type { Locale } from "@/lib/locale";
import { DEFAULT_THEME_MODE, type ThemeMode } from "@/lib/theme";

export function AppShell({
  children,
  locale,
  readOnly = false,
  themeMode = DEFAULT_THEME_MODE
}: {
  children: ReactNode;
  locale: Locale;
  readOnly?: boolean;
  themeMode?: ThemeMode;
}) {
  return (
    <div className="neo-app min-h-screen">
      <header className="sticky top-0 z-20 hidden border-b-2 border-ink bg-panel md:block">
        <div className="mx-auto max-w-[1440px] px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-3 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-ink"
            >
              <span className="neo-mark" aria-hidden="true">A</span>
              <span>specos / asset workbench</span>
            </Link>
            <div className="min-w-0 flex-1">
              <SiteNav locale={locale} readOnly={readOnly} />
            </div>
            <div className="flex items-center gap-2">
              <ThemeModeToggle compact initialMode={themeMode} locale={locale} />
              <LanguageToggle compact locale={locale} />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-5 sm:px-5 sm:pt-6 md:px-6 md:py-8 md:pb-8">
        {children}
      </main>
      <MobileUtilityBar locale={locale} themeMode={themeMode} />
    </div>
  );
}
