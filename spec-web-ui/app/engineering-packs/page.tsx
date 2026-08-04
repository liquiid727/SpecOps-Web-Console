import { EngineeringPackLibraryPage } from "@/components/engineering-packs/engineering-pack-library-page";

export default function EngineeringPacksPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return EngineeringPackLibraryPage({ searchParams });
}
