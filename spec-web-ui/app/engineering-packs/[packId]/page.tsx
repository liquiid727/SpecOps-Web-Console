import { notFound } from "next/navigation";

import AssetDetailPage from "@/app/discover/[assetId]/page";
import { loadCatalogAsset } from "@/features/catalog/server";

export default async function EngineeringPackDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ packId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { packId } = await params;
  const asset = await loadCatalogAsset(packId);

  if (!asset || asset.type !== "engineering_pack") {
    notFound();
  }

  return AssetDetailPage({
    params: Promise.resolve({ assetId: packId }),
    searchParams
  });
}
