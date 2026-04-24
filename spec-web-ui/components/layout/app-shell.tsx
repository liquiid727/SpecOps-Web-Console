import Link from "next/link";
import type { ReactNode } from "react";

import { SiteNav } from "@/components/layout/site-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line/25 bg-canvas/42 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1560px] px-6 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono text-[13px] font-medium uppercase tracking-[0.12em] text-ink"
            >
              <span className="text-accent">$</span>
              <span>specos-ai/spec-web-ui</span>
            </Link>
            <div className="min-w-0 flex-1">
              <SiteNav />
            </div>
            <ThemeToggle compact />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1560px] px-6 py-5">{children}</main>
    </div>
  );
}
