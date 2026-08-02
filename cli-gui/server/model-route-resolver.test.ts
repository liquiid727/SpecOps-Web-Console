import { describe, expect, it } from "vitest";
import { resolveModelRoute } from "./model-route-resolver.js";
import type { ModelDeploymentSummary } from "../shared/model-deployment.js";
import type { PriorityModelRoute } from "../shared/model-route.js";

const route = (id: string, candidateDeploymentIds: string[] = ["primary", "backup"]): PriorityModelRoute => ({
  id,
  name: id,
  enabled: true,
  candidateDeploymentIds,
  automaticTechnicalFallback: true,
  createdAt: "2026-08-02T00:00:00Z",
  updatedAt: "2026-08-02T00:00:00Z"
});

const deployment = (id: string, overrides: Partial<ModelDeploymentSummary> = {}): ModelDeploymentSummary => ({
  id,
  name: id,
  providerId: "provider",
  profileId: "profile",
  modelId: id,
  enabled: true,
  createdAt: "2026-08-02T00:00:00Z",
  updatedAt: "2026-08-02T00:00:00Z",
  credentialStatus: "configured",
  capability: { source: "configured", observedAt: "2026-08-02T00:00:00Z", modelPresent: true, nativeSession: true, toolCalling: true, codeEditing: true },
  eligibility: "eligible",
  exclusionCodes: [],
  ...overrides
});

describe("model route resolver", () => {
  it("uses the most specific binding and records the source trace", () => {
    const resolved = resolveModelRoute({
      routes: [route("global"), route("project"), route("session")],
      deployments: [deployment("primary"), deployment("backup")],
      systemRouteId: "global",
      globalRouteId: "global",
      projectRouteId: "project",
      sessionRouteId: "session",
      now: "2026-08-02T01:00:00Z"
    });

    expect(resolved.routeId).toBe("session");
    expect(resolved.selectedDeploymentId).toBe("primary");
    expect(resolved.sourceTrace.at(-1)).toEqual({ field: "routeId", source: "session", value: "session" });
  });

  it("keeps excluded candidates visible and rejects an unavailable fixed deployment", () => {
    const resolved = resolveModelRoute({
      routes: [route("route")],
      deployments: [deployment("primary", { credentialStatus: "missing" }), deployment("backup")],
      sessionRouteId: "route",
      routeOverride: { fixedDeploymentId: "primary" }
    });

    expect(resolved.candidates[0]).toMatchObject({ deploymentId: "primary", eligible: false, exclusionCodes: ["credential-missing"] });
    expect(resolved.executableCandidates.map((candidate) => candidate.deploymentId)).toEqual(["backup"]);
    expect(resolved.canSend).toBe(false);
    expect(resolved.errorCode).toBe("ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE");
  });

  it("preserves legacy sessions when no route is bound", () => {
    expect(resolveModelRoute({ routes: [], deployments: [], legacy: { profileId: "profile", modelId: "model", source: "active-model" } })).toMatchObject({
      kind: "legacy-profile-model",
      canSend: true,
      sourceTrace: [{ field: "profileId", source: "session", value: "profile" }, { field: "modelId", source: "session", value: "model" }]
    });
  });
});
