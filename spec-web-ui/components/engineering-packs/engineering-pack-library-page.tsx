import Link from "next/link";
import React from "react";

import { CatalogAssetSummary } from "@/components/catalog/asset-summary";
import { WindowSection } from "@/components/ui/window-section";
import { filterCatalogAssets, loadCatalogAssets } from "@/features/catalog/server";
import { buildShellCommandTitle } from "@/lib/shell";
import { buildNeoSurfaceClassName } from "@/lib/theme";
import type { CatalogAsset } from "@/lib/types";

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function EngineeringPackCard({ asset }: { asset: CatalogAsset }) {
  return (
    <Link
      href={`/engineering-packs/${asset.id}`}
      className={`${buildNeoSurfaceClassName("row", "blue")} block min-w-0 overflow-hidden rounded-lg px-4 py-4 transition hover:border-slate-400/40`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">
          engineering pack
        </span>
        <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
          v{asset.version}
        </span>
        {asset.stacks.map((stack) => (
          <span
            key={stack}
            className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500"
          >
            {stack}
          </span>
        ))}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-ink">{asset.title}</h3>
      <div className="mt-2">
        <CatalogAssetSummary
          asset={asset}
          englishClassName="text-sm leading-6 text-slate-400"
          chineseClassName="text-sm leading-6 text-slate-300"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {asset.categories?.map((category) => (
          <span key={category} className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] text-slate-500">
            {category}
          </span>
        ))}
        {asset.tags.slice(0, 5).map((tag) => (
          <span key={tag} className="rounded-md bg-canvas px-2 py-0.5 font-mono text-[10px] text-slate-500">
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-3 break-all font-mono text-[10px] text-slate-600">{asset.sourcePath}</p>
    </Link>
  );
}

export async function EngineeringPackLibraryPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [resolvedSearchParams, catalog] = await Promise.all([searchParams, loadCatalogAssets()]);
  const query = getQueryValue(resolvedSearchParams.q);
  const packs = filterCatalogAssets(
    catalog.filter((asset) => asset.type === "engineering_pack"),
    { query }
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <WindowSection
        eyebrow={buildShellCommandTitle("ls", "assets/engineering-packs")}
        title="工程包"
        description="按技术栈浏览可组合的工程约束、CLI 配置和项目基线。"
        variant="plain"
      >
        <form action="/engineering-packs" className="space-y-3" role="search">
          <label className="block">
            <span className="sr-only">搜索工程包</span>
            <input
              aria-label="搜索工程包"
              className={`${buildNeoSurfaceClassName("input")} w-full px-3.5 py-2.5 text-sm text-ink outline-none`}
              defaultValue={query}
              name="q"
              placeholder="搜索 Go、React、Python 或 CLI..."
              type="search"
            />
          </label>
          <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_112px]">
            <p className="text-xs leading-5 text-slate-500">
              工程包通过统一清单连接规则、技能、Agent、模板和生成器入口。
            </p>
            <button className="control control-primary rounded-[16px] px-3.5 py-2.5 text-sm font-medium" type="submit">
              搜索
            </button>
          </div>
        </form>
      </WindowSection>

      <section aria-label="工程包列表" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-ink">可用基座</h2>
            <p className="mt-1 text-sm text-slate-500">每个工程包都可以独立预览、组合和导出。</p>
          </div>
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
            {packs.length} packs
          </span>
        </div>
        {packs.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {packs.map((pack) => <EngineeringPackCard key={pack.id} asset={pack} />)}
          </div>
        ) : (
          <div className="surface-base surface-field rounded-lg border-dashed px-4 py-6">
            <p className="text-sm text-slate-500">没有匹配的工程包。换一个关键词继续搜索。</p>
          </div>
        )}
      </section>
    </div>
  );
}
