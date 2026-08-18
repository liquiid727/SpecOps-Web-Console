import Link from "next/link";
import type { ReactNode } from "react";

import { CatalogAssetSummary } from "@/components/catalog/asset-summary";
import { Badge } from "@/components/ui/badge";
import { getCatalogRowTagPreview } from "@/features/catalog/ui";
import { buildNeoSurfaceClassName, type NeoSurfaceTint } from "@/lib/theme";
import type { CatalogAsset } from "@/lib/types";

export function CatalogResultRow({
  asset,
  href,
  badges,
  meta,
  favorite,
  detail,
  rightContent,
  actions,
  tagLimit = 4,
  tint = "neutral"
}: {
  asset: CatalogAsset;
  href: string;
  badges?: ReactNode;
  meta?: ReactNode;
  favorite?: boolean;
  detail?: string;
  rightContent?: ReactNode;
  actions?: ReactNode;
  tagLimit?: number;
  tint?: NeoSurfaceTint;
}) {
  const tagPreview = getCatalogRowTagPreview(asset.tags, tagLimit);

  return (
    <div className={`${buildNeoSurfaceClassName("row", tint)} px-4 py-3`}>
      <div className="flex flex-wrap items-center gap-2">
        {badges}
        {meta}
        {favorite ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-300">
            favorite
          </span>
        ) : null}
      </div>

      <div className={`mt-2.5 grid gap-3 ${rightContent ? "xl:grid-cols-[minmax(0,1fr)_220px]" : ""}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href={href} className="text-lg font-medium text-ink transition hover:text-accent-strong">
              {asset.title}
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600">
              {asset.sourcePath}
            </p>
          </div>
          <div className="mt-1.5">
            <CatalogAssetSummary
              asset={asset}
              englishClassName="text-sm leading-6 text-slate-400"
              chineseClassName="text-sm leading-6 text-slate-300"
            />
          </div>
          {detail ? <p className="mt-1.5 text-xs text-slate-500">{detail}</p> : null}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tagPreview.visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] text-slate-500"
              >
                {tag}
              </span>
            ))}
            {tagPreview.hiddenCount ? (
              <Badge className="border-line bg-transparent px-2 py-0.5 text-[10px] text-slate-500">
                +{tagPreview.hiddenCount}
              </Badge>
            ) : null}
          </div>
        </div>
        {rightContent}
      </div>

      {actions ? <div className="mt-3 flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
