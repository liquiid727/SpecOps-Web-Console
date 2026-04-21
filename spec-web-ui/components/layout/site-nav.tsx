"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildShellBreadcrumbs, buildShellCommandTitle } from "@/lib/shell";
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-500">
        <span className="text-accent">{buildShellCommandTitle("pwd")}</span>
        {breadcrumbs.map((segment, index) => (
          <span key={segment.href} className="inline-flex items-center gap-2">
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
      <nav className="flex flex-wrap items-center gap-4 font-mono text-xs text-slate-400">
        <span className="text-accent">{buildShellCommandTitle("ls", "routes/")}</span>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "border-b border-transparent pb-1 transition",
                active ? "border-accent text-ink" : "hover:border-line hover:text-slate-200"
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
