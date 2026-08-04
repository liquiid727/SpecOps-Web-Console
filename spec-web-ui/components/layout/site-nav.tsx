"use client";

import Link from "next/link";
import React from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getLocaleCopy, type Locale } from "@/lib/locale";
import { buildShellBreadcrumbs } from "@/lib/shell";
import { cn } from "@/lib/utils";

type NavItem =
  | {
      href: string;
      key:
        | "home"
        | "about"
        | "specTemplates"
        | "skillTemplates"
        | "agentTemplates"
        | "agentTeams"
        | "engineeringPacks"
        | "projects";
    }
  | { disabled: true; key: "workflowTemplates" };

const baseNavItems: NavItem[] = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/spec-templates", key: "specTemplates" },
  { href: "/skill-templates", key: "skillTemplates" },
  { href: "/agent-templates", key: "agentTemplates" },
  { href: "/agent-teams", key: "agentTeams" },
  { href: "/engineering-packs", key: "engineeringPacks" },
  { key: "workflowTemplates", disabled: true }
];

export function SiteNav({ locale, readOnly = false }: { locale: Locale; readOnly?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breadcrumbs = buildShellBreadcrumbs(pathname);
  const copy = getLocaleCopy(locale);
  const navItems: NavItem[] = readOnly
    ? baseNavItems
    : [...baseNavItems, { href: "/projects", key: "projects" }];

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
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
      <nav className="flex flex-wrap items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
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
                className="neo-nav-link text-slate-500"
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
                "neo-nav-link transition",
                active
                  ? "neo-nav-link-active"
                  : "text-slate-500 hover:text-ink"
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
