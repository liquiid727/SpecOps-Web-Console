"use client";

import React from "react";

import { getLocaleCopy, type Locale } from "@/lib/locale";

/**
 * Neo is the only supported visual system. Keep this small compatibility
 * component for integrations that still render the old theme slot.
 */
export function ThemeModeToggle({ compact = false, locale = "zh" }: { compact?: boolean; locale?: Locale }) {
  const copy = getLocaleCopy(locale);

  return (
    <span className={compact ? "neo-theme-mark" : "neo-theme-mark neo-theme-mark-labeled"} aria-label={copy.shell.theme}>
      <span aria-hidden="true" className="utility-menu-icon">N</span>
      {compact ? null : <span className="utility-menu-current">Neo</span>}
    </span>
  );
}
