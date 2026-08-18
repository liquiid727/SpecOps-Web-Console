import { RequirementsLibraryPage } from "@/components/requirements/requirements-library-page";
import { listRequirementPackages } from "@/lib/requirements";

export default async function RequirementsPage() {
  return RequirementsLibraryPage({ requirements: await listRequirementPackages() });
}
