import { RequirementSpecNotFound } from "@/components/requirements/requirement-package-page";
import { RequirementSpecPage } from "@/components/requirements/requirement-package-page";
import { loadRequirementSpec } from "@/lib/requirements";

export default async function RequirementSpecDetailRoute({ params }: { params: Promise<{ requirementId: string; specId: string }> }) {
  const { requirementId, specId } = await params;
  const spec = await loadRequirementSpec(requirementId, specId);
  return spec ? <RequirementSpecPage spec={spec} /> : <RequirementSpecNotFound requirementId={requirementId} specId={specId} />;
}
