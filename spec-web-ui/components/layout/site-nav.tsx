"use client";

import Link from "next/link";
import React from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getLocaleCopy, type Locale } from "@/lib/locale";
import { buildShellBreadcrumbs } from "@/lib/shell";
import { cn } from "@/lib/utils";

type NavItem =
  | { href: string; key: "home" | "about" | "specTemplates" | "agentTemplates" | "skills" | "projects" }
  | { disabled: true; key: "workflowTemplates" };

const navItems: NavItem[] = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/spec-templates", key: "specTemplates" },
  { href: "/agent-templates", key: "agentTemplates" },
  { href: "/skills", key: "skills" },
  { key: "workflowTemplates", disabled: true },
  { href: "/projects", key: "projects" }
];

export function SiteNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breadcrumbs = buildShellBreadcrumbs(pathname);
  const copy = getLocaleCopy(locale);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {breadcrumbs.map((segment, index) => (
          <span key={segment.href} className="inline-flex items-center gap-1.5">
            {index > 0 ? <span className="text-slate-400">/</span> : null}
            <Link
              href={segment.href}
              className={cn(
                "transition",
                segment.href === pathname ? "text-ink" : "text-slate-500 hover:text-ink"
              )}
            >
              {segment.label === "~"
                ? segment.label
                : copy.shell.nav[segment.label as keyof typeof copy.shell.nav] ?? segment.label}
            </Link>
          </span>
        ))}
      </div>
      <nav className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {navItems.map((item) => {
          const [itemPath, itemQueryString] = "href" in item ? item.href.split("?") : ["", ""];
          const itemQuery = new URLSearchParams(itemQueryString ?? "");
          const hasQuery = Array.from(itemQuery.keys()).length > 0;
          const pathActive =
            itemPath === "/" ? pathname === "/" : Boolean(itemPath) && (pathname === itemPath || pathname.startsWith(`${itemPath}/`));
          const queryActive =
            !hasQuery ||
            Array.from(itemQuery.entries()).every(([key, value]) => searchParams.get(key) === value);
          const active = pathActive && queryActive;
          const label = copy.shell.nav[item.key as keyof typeof copy.shell.nav];

          if (!("href" in item)) {
            return (
              <span
                key={item.key}
                aria-disabled="true"
                className="rounded-full border border-transparent px-2.5 py-1 text-slate-600"
              >
                {label}/
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full border px-2.5 py-1 transition",
                active
                  ? "border-line bg-panel text-ink"
                  : "border-transparent text-slate-500 hover:border-line hover:bg-panel hover:text-ink"
              )}
            >
              {label}/
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
