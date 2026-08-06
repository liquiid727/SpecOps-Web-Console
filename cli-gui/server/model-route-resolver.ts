import type { ModelDeploymentSummary } from "../shared/model-deployment.js";
import type { PriorityModelRoute, ResolveModelRouteInput, ResolvedRoute, ResolvedRouteCandidate, RouteExclusionCode, RouteBindingSource } from "../shared/model-route.js";

export type { ResolveModelRouteInput } from "../shared/model-route.js";

function selectedRouteId(input: ResolveModelRouteInput) {
  const layers: Array<[RouteBindingSource, string | undefined]> = [
    ["system", input.systemRouteId],
    ["global", input.globalRouteId],
    ["project", input.projectRouteId],
    ["session", input.sessionRouteId]
  ];
  return layers.reduce<{ id?: string; source?: RouteBindingSource }>((selected, [source, id]) => id ? { id, source } : selected, {});
}

function deploymentExclusions(deployment: ModelDeploymentSummary | undefined, route: PriorityModelRoute): RouteExclusionCode[] {
  const exclusions: RouteExclusionCode[] = [];
  if (!route.enabled || route.archivedAt) exclusions.push("route-disabled");
  if (!deployment) return [...exclusions, "deployment-missing"];
  const summaryCodes = new Set(deployment.exclusionCodes);
  if (!deployment.enabled || deployment.eligibility === "disabled" || summaryCodes.has("deployment-disabled")) exclusions.push("deployment-disabled");
  if (deployment.archivedAt || deployment.eligibility === "archived" || summaryCodes.has("deployment-archived")) exclusions.push("deployment-archived");
  if (deployment.providerEnabled === false || summaryCodes.has("provider-disabled")) exclusions.push("provider-disabled");
  if ((deployment.credentialStatus !== "configured" && deployment.credentialStatus !== "legacy-environment") || summaryCodes.has("credential-missing")) exclusions.push("credential-missing");
  if (summaryCodes.has("engine-incompatible") || summaryCodes.has("protocol-mismatch")) exclusions.push("engine-incompatible");
  if (summaryCodes.has("model-unverified") || summaryCodes.has("model-missing") || deployment.eligibility === "unknown" || deployment.eligibility === "invalid") exclusions.push("model-unverified");
  return [...new Set(exclusions)];
}

export function resolveModelRoute(input: ResolveModelRouteInput): ResolvedRoute {
  const resolvedAt = input.now ?? new Date().toISOString();
  const selected = selectedRouteId(input);
  if (!selected.id) {
    const legacy = input.legacy;
    const fixedDeploymentId = input.routeOverride?.fixedDeploymentId;
    return {
      kind: "legacy-profile-model",
      legacyResolution: legacy,
      resolvedAt,
      sourceTrace: [
        ...(legacy ? [{ field: "profileId", source: "session" as const, value: legacy.profileId }, { field: "modelId", source: "session" as const, value: legacy.modelId ?? undefined }] : []),
        ...(fixedDeploymentId !== undefined ? [{ field: "fixedDeploymentId", source: "run" as const, value: fixedDeploymentId }] : [])
      ],
      candidates: [],
      executableCandidates: [],
      ...(fixedDeploymentId !== undefined ? { fixedDeploymentId, errorCode: "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE" as const } : {}),
      canSend: fixedDeploymentId === undefined
    };
  }

  const route = input.routes.find((candidate) => candidate.id === selected.id);
  const sourceTrace = [
    ...(input.systemRouteId ? [{ field: "routeId", source: "system" as const, value: input.systemRouteId }] : []),
    ...(input.globalRouteId ? [{ field: "routeId", source: "global" as const, value: input.globalRouteId }] : []),
    ...(input.projectRouteId ? [{ field: "routeId", source: "project" as const, value: input.projectRouteId }] : []),
    ...(input.sessionRouteId ? [{ field: "routeId", source: "session" as const, value: input.sessionRouteId }] : []),
    ...(input.routeOverride?.fixedDeploymentId !== undefined ? [{ field: "fixedDeploymentId", source: "run" as const, value: input.routeOverride.fixedDeploymentId }] : [])
  ];
  if (!route) {
    return { kind: "route", routeId: selected.id, resolvedAt, sourceTrace, candidates: [], executableCandidates: [], canSend: false, errorCode: "ROUTE_NO_CANDIDATE" };
  }

  const byId = new Map(input.deployments.map((deployment) => [deployment.id, deployment]));
  const candidates: ResolvedRouteCandidate[] = route.candidateDeploymentIds.map((deploymentId, index) => {
    const exclusionCodes = deploymentExclusions(byId.get(deploymentId), route);
    return { deploymentId, position: index + 1, eligible: exclusionCodes.length === 0, exclusionCodes };
  });
  const executableCandidates = candidates.filter((candidate) => candidate.eligible);
  const fixedDeploymentId = input.routeOverride?.fixedDeploymentId;
  if (fixedDeploymentId !== undefined) {
    const fixed = candidates.find((candidate) => candidate.deploymentId === fixedDeploymentId);
    if (!fixed?.eligible) return { kind: "route", routeId: route.id, resolvedAt, sourceTrace, candidates, executableCandidates, fixedDeploymentId, canSend: false, errorCode: "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE" };
    return { kind: "route", routeId: route.id, resolvedAt, sourceTrace, candidates, executableCandidates, selectedDeploymentId: fixedDeploymentId, fixedDeploymentId, canSend: true };
  }
  const selectedDeploymentId = executableCandidates[0]?.deploymentId;
  return {
    kind: "route",
    routeId: route.id,
    resolvedAt,
    sourceTrace,
    candidates,
    executableCandidates,
    ...(selectedDeploymentId ? { selectedDeploymentId } : {}),
    canSend: Boolean(selectedDeploymentId),
    ...(selectedDeploymentId ? {} : { errorCode: "ROUTE_NO_CANDIDATE" as const })
  };
}

export function routeCandidateDeployment(resolved: ResolvedRoute, deployments: readonly ModelDeploymentSummary[]) {
  return deployments.find((deployment) => deployment.id === resolved.selectedDeploymentId);
}
