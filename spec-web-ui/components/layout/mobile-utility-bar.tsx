"use client";

import Link from "next/link";
import React from "react";

import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getLocaleCopy, type Locale } from "@/lib/locale";

export function MobileUtilityBar({ locale = "zh" }: { locale?: Locale }) {
  const copy = getLocaleCopy(locale);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex justify-center md:hidden">
      <div className="pointer-events-auto surface-base surface-panel flex items-center gap-2 rounded-full px-2 py-2 shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
        <Link
          href="/"
          aria-label={copy.shell.home}
          className="control control-secondary rounded-full px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]"
        >
          {copy.shell.home}
        </Link>
        <LanguageToggle compact locale={locale} />
        <ThemeToggle compact locale={locale} />
      </div>
    </div>
  );
}
