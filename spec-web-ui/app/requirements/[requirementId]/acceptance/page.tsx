import { RequirementNotFound, RequirementPackagePage } from "@/components/requirements/requirement-package-page";
import { loadRequirementPackage } from "@/lib/requirements";

export default async function RequirementAcceptancePage({ params }: { params: Promise<{ requirementId: string }> }) {
  const { requirementId } = await params;
  const requirement = await loadRequirementPackage(requirementId);
  return requirement ? <RequirementPackagePage requirement={requirement} /> : <RequirementNotFound requirementId={requirementId} />;
}
