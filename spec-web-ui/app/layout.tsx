import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { buildLocaleBootScript, getLocaleCopy, LOCALE_STORAGE_KEY, normalizeLocale } from "@/lib/locale";
import { buildThemeBootScript, DEFAULT_THEME_MODE, resolveThemeMode } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "SpecOS Web UI",
  description: "SpecOS 目录优先工作台，用于组合项目规则、模板和 Agent 角色。"
};

const defaultResolvedTheme = resolveThemeMode(DEFAULT_THEME_MODE, { systemPrefersDark: false });

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = normalizeLocale((await cookies()).get(LOCALE_STORAGE_KEY)?.value);
  const copy = getLocaleCopy(locale);

  return (
    <html
      className={defaultResolvedTheme}
      data-locale={locale}
      data-theme={defaultResolvedTheme}
      data-theme-mode={DEFAULT_THEME_MODE}
      lang={copy.htmlLang}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildLocaleBootScript() }} />
        <script dangerouslySetInnerHTML={{ __html: buildThemeBootScript() }} />
      </head>
      <body>
        <AppShell locale={locale}>{children}</AppShell>
      </body>
    </html>
  );
}
