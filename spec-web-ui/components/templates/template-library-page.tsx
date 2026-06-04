import React from "react";
import Link from "next/link";

import { WindowSection } from "@/components/ui/window-section";
import { filterCatalogAssets, loadCatalogAssets } from "@/lib/catalog";
import { buildShellCommandTitle } from "@/lib/shell";
import { buildGlassSurfaceClassName } from "@/lib/theme";
import type { CatalogAsset, CatalogCategory, CatalogAssetType } from "@/lib/types";

const categoryOptions: Array<{ label: string; value: CatalogCategory }> = [
  { label: "产品", value: "product" },
  { label: "运营", value: "operations" },
  { label: "测试", value: "testing" },
  { label: "部署", value: "deployment" },
  { label: "前端", value: "frontend" },
  { label: "后端", value: "backend" }
];

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getCategoryValue(value: string | string[] | undefined) {
  const selected = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  return categoryOptions.find((option) => option.value === selected)?.value ?? "";
}

function getTemplateAssets(
  catalog: CatalogAsset[],
  type: CatalogAssetType,
  query: string,
  category: CatalogCategory | ""
) {
  const templates = catalog.filter((asset) => asset.type === type);

  if (!query.trim() && !category) {
    return templates;
  }

  return filterCatalogAssets(templates, { query, categories: category ? [category] : [] });
}

function TemplateCard({ asset }: { asset: CatalogAsset }) {
  const categories = asset.categories ?? [];

  return (
    <Link
      href={`/discover/${asset.id}`}
      className={`${buildGlassSurfaceClassName("row")} block rounded-lg px-4 py-4 transition hover:border-slate-400/40`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
          {asset.direction}
        </span>
        {asset.stacks.slice(0, 3).map((stack) => (
          <span
            key={stack}
            className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500"
          >
            {stack}
          </span>
        ))}
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink">{asset.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{asset.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {categories.slice(0, 3).map((category) => (
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
      <p className="mt-3 truncate font-mono text-[10px] text-slate-600">{asset.sourcePath}</p>
    </Link>
  );
}

export async function TemplateLibraryPage({
  description,
  emptyText,
  route,
  searchLabel,
  searchParams,
  templateType,
  title
}: {
  description: string;
  emptyText: string;
  route: string;
  searchLabel: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  templateType: Extract<CatalogAssetType, "agent_role" | "spec_template" | "agent_team" | "skill">;
  title: string;
}) {
  const [resolvedSearchParams, catalog] = await Promise.all([searchParams, loadCatalogAssets()]);
  const query = getQueryValue(resolvedSearchParams.q);
  const selectedCategory = getCategoryValue(resolvedSearchParams.category);
  const assets = getTemplateAssets(catalog, templateType, query, selectedCategory);

  return (
    <div className="space-y-5 md:space-y-6">
      <WindowSection
        eyebrow={buildShellCommandTitle("find", route.replace("/", ""))}
        title={title}
        description={description}
        variant="plain"
      >
        <form action={route} className="space-y-3" role="search">
          <label className="block">
            <span className="sr-only">{searchLabel}</span>
            <input
              aria-label={searchLabel}
              className={`${buildGlassSurfaceClassName("input")} w-full rounded-[16px] px-3.5 py-2.5 text-sm text-ink outline-none`}
              defaultValue={query}
              name="q"
              placeholder={`${searchLabel}...`}
              type="search"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Link
              href={query ? `${route}?q=${encodeURIComponent(query)}` : route}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                !selectedCategory
                  ? "border-line bg-panel text-ink"
                  : "border-line/60 text-slate-500 hover:border-line hover:text-ink"
              }`}
            >
              全部
            </Link>
            {categoryOptions.map((option) => {
              const active = selectedCategory === option.value;
              const params = new URLSearchParams();

              if (query) {
                params.set("q", query);
              }

              params.set("category", option.value);

              return (
                <Link
                  key={option.value}
                  href={`${route}?${params.toString()}`}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-line bg-panel text-ink"
                      : "border-line/60 text-slate-500 hover:border-line hover:text-ink"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
          <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_112px]">
            <div className="text-xs text-slate-500">
              支持按产品、运营、测试、部署、前端、后端分类浏览当前模块资产。
            </div>
            <button className="control control-primary rounded-[16px] px-3.5 py-2.5 text-sm font-medium" type="submit">
              搜索
            </button>
          </div>
        </form>
      </WindowSection>

      <section aria-label={title} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">全部模版</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
            {assets.length} items
          </span>
        </div>
        {assets.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {assets.map((asset) => (
              <TemplateCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="surface-base surface-field rounded-lg border-dashed px-4 py-6">
            <p className="text-sm text-slate-500">{emptyText}</p>
          </div>
        )}
      </section>
    </div>
  );
}
