import Link from "next/link";
import type { ReactNode } from "react";

import { MobileUtilityBar } from "@/components/layout/mobile-utility-bar";
import { SiteNav } from "@/components/layout/site-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 hidden border-b border-line bg-canvas/98 md:block">
        <div className="mx-auto max-w-[1560px] px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-ink"
            >
              <span className="text-slate-500">$</span>
              <span>specos-ai/spec-web-ui</span>
            </Link>
            <div className="min-w-0 flex-1">
              <SiteNav />
            </div>
            <ThemeToggle compact />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1560px] px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-4 sm:px-5 sm:pt-5 md:px-6 md:py-6 md:pb-6">
        {children}
      </main>
      <MobileUtilityBar />
    </div>
  );
}
