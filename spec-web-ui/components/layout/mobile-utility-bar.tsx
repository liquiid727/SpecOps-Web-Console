"use client";

import Link from "next/link";
import React from "react";

import { LanguageToggle } from "@/components/layout/language-toggle";
import { getLocaleCopy, type Locale } from "@/lib/locale";

export function MobileUtilityBar({ locale = "zh" }: { locale?: Locale }) {
  const copy = getLocaleCopy(locale);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex justify-center md:hidden">
      <div className="pointer-events-auto surface-base surface-panel flex items-center gap-2 px-2 py-2">
        <Link
          href="/"
          aria-label={copy.shell.home}
          className="control control-secondary px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em]"
        >
          {copy.shell.home}
        </Link>
        <LanguageToggle compact locale={locale} />
      </div>
    </div>
  );
}
