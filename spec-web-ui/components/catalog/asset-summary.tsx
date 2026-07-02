import React from "react";

import type { CatalogAsset } from "@/lib/types";

export function CatalogAssetSummary({
  asset,
  englishClassName,
  chineseClassName
}: {
  asset: CatalogAsset;
  englishClassName: string;
  chineseClassName?: string;
}) {
  const summaryZh = asset.summaryZh?.trim();

  return (
    <div className="space-y-1.5">
      <p className={englishClassName}>{asset.summary}</p>
      {summaryZh ? <p className={chineseClassName ?? englishClassName}>{summaryZh}</p> : null}
    </div>
  );
}
