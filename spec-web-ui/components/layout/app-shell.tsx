import Link from "next/link";
import type { ReactNode } from "react";

import { SiteNav } from "@/components/layout/site-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto max-w-[1560px] px-6 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                $ whoami
              </p>
              <Link href="/" className="inline-flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
                <span className="font-mono text-accent">$</span>
                <span>specos-ai</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-300">spec-web-ui</span>
              </Link>
              <p className="max-w-3xl text-sm leading-6 text-slate-400">
                Repo-backed catalog search, project composition, draft editing, and export review.
              </p>
            </div>
            <div className="grid gap-2 font-mono text-xs text-slate-500 sm:grid-cols-3 sm:text-right">
              <div>
                <p className="uppercase tracking-[0.14em]">stack</p>
                <p className="mt-1 text-slate-300">Next.js / Tailwind / Actions</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.14em]">state</p>
                <p className="mt-1 text-slate-300">git-backed</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.14em]">theme</p>
                <p className="mt-1 text-slate-300">developer cli minimalism</p>
              </div>
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <SiteNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1560px] px-6 py-8">{children}</main>
    </div>
  );
}
