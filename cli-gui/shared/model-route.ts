import type { ModelDeploymentSummary } from "./model-deployment.js";

export interface PriorityModelRoute {
  id: string;
  name: string;
  enabled: boolean;
  candidateDeploymentIds: string[];
  automaticTechnicalFallback: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export type RouteBindingSource = "system" | "global" | "project" | "session";

export interface RouteBinding {
  routeId?: string;
  source: RouteBindingSource;
}

export interface WorkspaceModelRouteBinding {
  workspaceId: string;
  routeId?: string;
}

export interface RunRouteOverride {
  fixedDeploymentId: string;
}

export interface ModelRoutePreviewRequest {
  workspaceId: string;
  profileId: string;
  routeId?: string;
  fixedDeploymentId?: string;
}

export type RouteExclusionCode =
  | "route-disabled"
  | "deployment-missing"
  | "deployment-disabled"
  | "deployment-archived"
  | "provider-disabled"
  | "credential-missing"
  | "engine-incompatible"
  | "model-unverified";

export interface ResolvedRouteCandidate {
  deploymentId: string;
  position: number;
  eligible: boolean;
  exclusionCodes: RouteExclusionCode[];
}

export interface ResolvedRoute {
  kind: "route" | "legacy-profile-model";
  routeId?: string;
  resolvedAt: string;
  sourceTrace: Array<{ field: string; source: RouteBindingSource | "run"; value?: string }>;
  candidates: ResolvedRouteCandidate[];
  executableCandidates: ResolvedRouteCandidate[];
  selectedDeploymentId?: string;
  fixedDeploymentId?: string;
  canSend: boolean;
  errorCode?: "ROUTE_NO_CANDIDATE" | "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE" | "ROUTE_UNSUPPORTED_ENGINE";
}

export interface ResolveModelRouteInput {
  routes: readonly PriorityModelRoute[];
  deployments: readonly ModelDeploymentSummary[];
  now?: string;
  systemRouteId?: string;
  globalRouteId?: string;
  projectRouteId?: string;
  sessionRouteId?: string;
  routeOverride?: RunRouteOverride;
  legacy?: { profileId: string; modelId?: string | null; source?: "launch-config" | "active-model" | "profile-default" };
}
