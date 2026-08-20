import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { buildLocaleBootScript, getLocaleCopy, LOCALE_STORAGE_KEY, normalizeLocale } from "@/lib/locale";
import {
  buildThemeBootScript,
  DEFAULT_THEME_MODE,
  normalizeThemeMode,
  resolveThemeMode,
  THEME_MODE_STORAGE_KEY
} from "@/lib/theme";
import { isReadOnlyMode } from "@/lib/runtime";

import "./globals.css";

export const metadata: Metadata = {
  title: "SpecOS Web UI",
  description: "SpecOS 目录优先工作台，用于组合项目规则、模板和 Agent 角色。"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestCookies = await cookies();
  const locale = normalizeLocale(requestCookies.get(LOCALE_STORAGE_KEY)?.value);
  const themeMode = normalizeThemeMode(requestCookies.get(THEME_MODE_STORAGE_KEY)?.value ?? DEFAULT_THEME_MODE);
  const resolvedTheme = resolveThemeMode(themeMode, { systemPrefersDark: false });
  const copy = getLocaleCopy(locale);
  const readOnly = isReadOnlyMode();

  return (
    <html
      className={resolvedTheme}
      data-locale={locale}
      data-theme={resolvedTheme}
      data-theme-mode={themeMode}
      lang={copy.htmlLang}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildLocaleBootScript() }} />
        <script dangerouslySetInnerHTML={{ __html: buildThemeBootScript() }} />
      </head>
      <body>
        <AppShell locale={locale} readOnly={readOnly} themeMode={themeMode}>{children}</AppShell>
      </body>
    </html>
  );
}
