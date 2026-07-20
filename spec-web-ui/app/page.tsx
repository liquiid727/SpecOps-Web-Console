import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";

import { WindowSection } from "@/components/ui/window-section";
import { getLocaleCopy, LOCALE_STORAGE_KEY, normalizeLocale } from "@/lib/locale";
import { isReadOnlyMode } from "@/lib/runtime";
import { buildShellCommandTitle } from "@/lib/shell";
import { buildNeoInteractiveClassName, buildNeoSurfaceClassName } from "@/lib/theme";

export default async function HomePage() {
  const locale = normalizeLocale((await cookies()).get(LOCALE_STORAGE_KEY)?.value);
  const copy = getLocaleCopy(locale).home;
  const readOnly = isReadOnlyMode();
  const firstUseLinks = copy.firstUseLinks.filter((item) => !readOnly || !["/projects", "/exports"].includes(item.href));

  return (
    <div className="space-y-6 md:space-y-8">
      <section>
        <WindowSection
          eyebrow={buildShellCommandTitle("cat", "README.md")}
          title={copy.heroTitle}
          description={copy.heroDescription}
          className="home-hero"
          variant="plain"
        >
          <form action="/discover" className="space-y-4">
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                {buildShellCommandTitle("search", copy.searchLabel)}
              </span>
              <input
                name="q"
                placeholder={copy.searchPlaceholder}
                className={`${buildNeoSurfaceClassName("input")} w-full px-4 py-4 text-base text-ink outline-none placeholder:text-slate-500`}
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="submit"
                className={`${buildNeoInteractiveClassName("accent")} w-full px-4 py-2 text-sm font-bold sm:w-auto`}
              >
                {copy.openDiscover}
              </button>
              {!readOnly ? (
                <Link
                  href="/projects"
                  className={`${buildNeoInteractiveClassName("neutral")} w-full px-4 py-2 text-center text-sm font-bold sm:w-auto`}
                >
                  {copy.openProjects}
                </Link>
              ) : null}
            </div>
          </form>
          <div className={`${buildNeoSurfaceClassName("panel")} mt-5 px-4 py-3 text-sm leading-6 text-slate-600`}>
            <span className="font-medium text-ink">{copy.firstUseTitle}</span>
            <span className="mx-2 text-slate-600">/</span>
            <span>{copy.firstUsePrefix}</span>
            {firstUseLinks.map((item, index) => (
              <React.Fragment key={item.href}>
                {index > 0 ? <span className="text-slate-600"> / </span> : null}
                <Link href={item.href} className="text-ink underline decoration-line underline-offset-4 hover:text-accent-strong">
                  {item.label}
                </Link>
                <span>{item.description}</span>
              </React.Fragment>
            ))}
          </div>
        </WindowSection>
      </section>
    </div>
  );
}
