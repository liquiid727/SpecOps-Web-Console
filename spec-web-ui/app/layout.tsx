import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { buildThemeBootScript } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "SpecOS Web UI",
  description: "Catalog-first workspace for composing project rules, templates, and agent roles."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="dark" data-theme="dark" data-theme-mode="system" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildThemeBootScript() }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
