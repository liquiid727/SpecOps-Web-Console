"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildShellBreadcrumbs } from "@/lib/shell";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/discover", label: "Discover" },
  { href: "/projects", label: "Projects" },
  { href: "/drafts", label: "Draft Studio" },
  { href: "/exports", label: "Exports" }
];

export function SiteNav() {
  const pathname = usePathname();
  const breadcrumbs = buildShellBreadcrumbs(pathname);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500/80">
        {breadcrumbs.map((segment, index) => (
          <span key={segment.href} className="inline-flex items-center gap-1.5">
            {index > 0 ? <span className="text-slate-700">/</span> : null}
            <Link
              href={segment.href}
              className={cn(
                "transition",
                segment.href === pathname ? "text-ink" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {segment.label}
            </Link>
          </span>
        ))}
      </div>
      <nav className="flex flex-wrap items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400/90">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-[999px] px-2 py-0.5 transition",
                active
                  ? "bg-panel/55 text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "text-slate-500/85 hover:bg-panel/30 hover:text-slate-200"
              )}
            >
              {item.href.replace("/", "")}/
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
