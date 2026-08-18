import { RequirementNotFound, RequirementPackagePage } from "@/components/requirements/requirement-package-page";
import { loadRequirementPackage } from "@/lib/requirements";

export default async function RequirementTestPage({ params }: { params: Promise<{ requirementId: string }> }) {
  const { requirementId } = await params;
  const requirement = await loadRequirementPackage(requirementId);
  return requirement ? <RequirementPackagePage requirement={requirement} selected="test" /> : <RequirementNotFound requirementId={requirementId} />;
}
