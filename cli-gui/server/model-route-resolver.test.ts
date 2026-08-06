import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  it.each([
    ["system-only", { systemRouteId: "system" }, "system"],
    ["global override", { systemRouteId: "system", globalRouteId: "global" }, "global"],
    ["project override", { systemRouteId: "system", globalRouteId: "global", projectRouteId: "project" }, "project"],
    ["session override", { systemRouteId: "system", globalRouteId: "global", projectRouteId: "project", sessionRouteId: "session" }, "session"]
  ])("inherits undefined bindings and selects the most specific explicit layer: %s", (_name, bindings, expectedRouteId) => {
    const resolved = resolveModelRoute({
      routes: [route("system"), route("global"), route("project"), route("session")],
      deployments: [deployment("primary")],
      ...bindings,
      now: "2026-08-02T03:00:00Z"
    });
    expect(resolved.routeId).toBe(expectedRouteId);
    expect(resolved.sourceTrace).toEqual(Object.entries(bindings).map(([field, value]) => ({
      field: "routeId",
      source: field.replace("RouteId", "") as "system" | "global" | "project" | "session",
      value
    })));
  });

  it("records the complete precedence and run source trace exactly", () => {
    const resolved = resolveModelRoute({
      routes: [route("session")],
      deployments: [deployment("primary")],
      systemRouteId: "system",
      globalRouteId: "global",
      projectRouteId: "project",
      sessionRouteId: "session",
      routeOverride: { fixedDeploymentId: "primary" },
      now: "2026-08-02T03:00:00Z"
    });
    expect(resolved.sourceTrace).toEqual([
      { field: "routeId", source: "system", value: "system" },
      { field: "routeId", source: "global", value: "global" },
      { field: "routeId", source: "project", value: "project" },
      { field: "routeId", source: "session", value: "session" },
      { field: "fixedDeploymentId", source: "run", value: "primary" }
    ]);
  });

  it.each([
    ["route-disabled", { route: { enabled: false } }, {}, ["route-disabled"]],
    ["route-archived", { route: { archivedAt: "2026-08-02T00:00:00Z" } }, {}, ["route-disabled"]],
    ["deployment-missing", {}, {}, ["deployment-missing"]],
    ["deployment-disabled by enabled", {}, { enabled: false }, ["deployment-disabled"]],
    ["deployment-disabled by eligibility", {}, { eligibility: "disabled" }, ["deployment-disabled"]],
    ["deployment-archived by archivedAt", {}, { archivedAt: "2026-08-02T00:00:00Z" }, ["deployment-archived"]],
    ["deployment-archived by eligibility", {}, { eligibility: "archived" }, ["deployment-archived"]],
    ["provider-disabled", {}, { exclusionCodes: ["provider-disabled"] }, ["provider-disabled"]],
    ["credential-missing", {}, { exclusionCodes: ["credential-missing"] }, ["credential-missing"]],
    ["engine-incompatible", {}, { exclusionCodes: ["engine-incompatible"] }, ["engine-incompatible"]],
    ["model-unverified", {}, { exclusionCodes: ["model-unverified"] }, ["model-unverified"]]
  ] as const)("maps public exclusion %s", (_name, routeOverrides, deploymentOverrides, expectedCodes) => {
    const resolved = resolveModelRoute({
      routes: [{ ...route("route", ["target"]), ...routeOverrides.route }],
      deployments: Object.keys(deploymentOverrides).length === 0 && _name === "deployment-missing" ? [] : [deployment("target", deploymentOverrides)],
      sessionRouteId: "route",
      now: "2026-08-02T03:00:00Z"
    });
    expect(resolved.candidates[0]?.exclusionCodes).toEqual(expectedCodes);
  });

  it("combines and stably de-duplicates every applicable exclusion", () => {
    const resolved = resolveModelRoute({
      routes: [{ ...route("route", ["target"]), enabled: false, archivedAt: "2026-08-02T00:00:00Z" }],
      deployments: [deployment("target", {
        enabled: false,
        archivedAt: "2026-08-02T00:00:00Z",
        providerEnabled: false,
        credentialStatus: "missing",
        eligibility: "invalid",
        exclusionCodes: ["provider-disabled", "credential-missing", "protocol-mismatch", "engine-incompatible", "model-missing", "model-unverified"]
      })],
      sessionRouteId: "route",
      now: "2026-08-02T03:00:00Z"
    });
    expect(resolved.candidates[0]?.exclusionCodes).toEqual([
      "route-disabled",
      "deployment-disabled",
      "deployment-archived",
      "provider-disabled",
      "credential-missing",
      "engine-incompatible",
      "model-unverified"
    ]);
  });

  it.each([
    ["eligible", "primary", [deployment("primary"), deployment("fallback")], true, "primary"],
    ["route outside", "outside", [deployment("primary"), deployment("fallback"), deployment("outside")], false, undefined],
    ["missing", "missing", [deployment("fallback")], false, undefined],
    ["disabled", "primary", [deployment("primary", { enabled: false }), deployment("fallback")], false, undefined],
    ["archived", "primary", [deployment("primary", { archivedAt: "2026-08-02T00:00:00Z" }), deployment("fallback")], false, undefined],
    ["provider-disabled", "primary", [deployment("primary", { providerEnabled: false }), deployment("fallback")], false, undefined],
    ["credential-missing", "primary", [deployment("primary", { credentialStatus: "missing" }), deployment("fallback")], false, undefined],
    ["engine-incompatible", "primary", [deployment("primary", { exclusionCodes: ["engine-incompatible"] }), deployment("fallback")], false, undefined],
    ["model-unverified", "primary", [deployment("primary", { exclusionCodes: ["model-unverified"] }), deployment("fallback")], false, undefined],
    ["empty", "", [deployment("primary"), deployment("fallback")], false, undefined]
  ] as const)("fixed target is safe for %s", (_name, fixedDeploymentId, deployments, canSend, selectedDeploymentId) => {
    const resolved = resolveModelRoute({
      routes: [route("route", ["primary", "fallback"])],
      deployments,
      sessionRouteId: "route",
      routeOverride: { fixedDeploymentId },
      now: "2026-08-02T03:00:00Z"
    });
    expect(resolved.canSend).toBe(canSend);
    expect(resolved.selectedDeploymentId).toBe(selectedDeploymentId);
    if (!canSend) expect(resolved.errorCode).toBe("ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE");
  });

  it.each([1, 8, 9])("preserves %s pure input candidates and executable order", (count) => {
    const candidateIds = Array.from({ length: count }, (_, index) => `d-${index + 1}`);
    const resolved = resolveModelRoute({
      routes: [route("route", candidateIds)],
      deployments: candidateIds.map((id) => deployment(id)),
      sessionRouteId: "route",
      now: "2026-08-02T03:00:00Z"
    });
    expect(resolved.candidates.map((candidate) => candidate.deploymentId)).toEqual(candidateIds);
    expect(resolved.candidates.map((candidate) => candidate.position)).toEqual(candidateIds.map((_, index) => index + 1));
    expect(resolved.executableCandidates.map((candidate) => candidate.deploymentId)).toEqual(candidateIds);
  });

  it("keeps executable candidates in original order around excluded candidates", () => {
    const resolved = resolveModelRoute({
      routes: [route("route", ["first", "excluded", "last"])],
      deployments: [deployment("first"), deployment("excluded", { exclusionCodes: ["model-unverified"] }), deployment("last")],
      sessionRouteId: "route",
      now: "2026-08-02T03:00:00Z"
    });
    expect(resolved.candidates.map((candidate) => [candidate.deploymentId, candidate.position])).toEqual([["first", 1], ["excluded", 2], ["last", 3]]);
    expect(resolved.executableCandidates.map((candidate) => candidate.deploymentId)).toEqual(["first", "last"]);
  });

  it("uses an explicit now value deterministically", () => {
    const input = { routes: [route("route")], deployments: [deployment("primary")], sessionRouteId: "route", now: "2026-08-02T03:00:00Z" } as const;
    expect(resolveModelRoute(input)).toEqual(resolveModelRoute(input));
    expect(resolveModelRoute(input).resolvedAt).toBe("2026-08-02T03:00:00Z");
  });

  it("distinguishes missing bound route from a bound route with no executable candidate", () => {
    const missingRoute = resolveModelRoute({ routes: [], deployments: [], sessionRouteId: "missing", now: "2026-08-02T03:00:00Z" });
    const noCandidate = resolveModelRoute({ routes: [route("route", ["missing-deployment"])], deployments: [], sessionRouteId: "route", now: "2026-08-02T03:00:00Z" });
    expect(missingRoute).toMatchObject({ kind: "route", routeId: "missing", candidates: [], executableCandidates: [], canSend: false, errorCode: "ROUTE_NO_CANDIDATE" });
    expect(noCandidate).toMatchObject({ kind: "route", routeId: "route", canSend: false, errorCode: "ROUTE_NO_CANDIDATE" });
    expect(noCandidate.candidates).toEqual([{ deploymentId: "missing-deployment", position: 1, eligible: false, exclusionCodes: ["deployment-missing"] }]);
  });

  it("has no runtime imports or I/O dependencies in the production resolver", () => {
    const source = readFileSync(resolve(process.cwd(), "server/model-route-resolver.ts"), "utf8");
    const importLines = source.split("\n").filter((line) => line.startsWith("import "));
    expect(importLines.every((line) => line.startsWith("import type "))).toBe(true);
    expect(source).not.toMatch(/(?:node:)?(?:fs|net|http|https|child_process|repository|filesystem|cli|network|ui)/i);
  });

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

  it("never falls back to legacy when a bound route has no executable candidate", () => {
    const resolved = resolveModelRoute({
      routes: [route("route", ["missing-deployment"])],
      deployments: [],
      sessionRouteId: "route",
      legacy: { kind: "legacy-profile-model", profileId: "profile", modelId: "legacy-model", source: "active-model" }
    });

    expect(resolved).toMatchObject({ kind: "route", routeId: "route", canSend: false, errorCode: "ROUTE_NO_CANDIDATE" });
    expect(resolved).not.toHaveProperty("legacyResolution");
    expect(resolved).not.toHaveProperty("selectedDeploymentId");
  });

  it("preserves legacy sessions when no route is bound", () => {
    expect(resolveModelRoute({ routes: [], deployments: [], legacy: { kind: "legacy-profile-model", profileId: "profile", modelId: "model", source: "active-model" } })).toMatchObject({
      kind: "legacy-profile-model",
      legacyResolution: { profileId: "profile", modelId: "model", source: "active-model" },
      canSend: true,
      sourceTrace: [{ field: "profileId", source: "session", value: "profile" }, { field: "modelId", source: "session", value: "model" }]
    });
  });

  it("records every explicit precedence layer and run override in stable order", () => {
    const resolved = resolveModelRoute({
      routes: [route("session")], deployments: [deployment("primary")],
      systemRouteId: "system", globalRouteId: "global", projectRouteId: "project", sessionRouteId: "session",
      routeOverride: { fixedDeploymentId: "primary" }, now: "2026-08-02T02:00:00Z"
    });
    expect(resolved.sourceTrace).toEqual([
      { field: "routeId", source: "system", value: "system" },
      { field: "routeId", source: "global", value: "global" },
      { field: "routeId", source: "project", value: "project" },
      { field: "routeId", source: "session", value: "session" },
      { field: "fixedDeploymentId", source: "run", value: "primary" }
    ]);
  });

  it("preserves all candidate positions and combines route and deployment exclusions", () => {
    const resolved = resolveModelRoute({
      routes: [{ ...route("route", ["missing", "disabled"]), enabled: false, archivedAt: "2026-08-02T00:00:00Z" }],
      deployments: [deployment("disabled", { enabled: false, providerEnabled: false, credentialStatus: "missing", exclusionCodes: ["engine-incompatible", "model-missing"] })],
      sessionRouteId: "route", now: "2026-08-02T02:00:00Z"
    });
    expect(resolved.candidates).toEqual([
      { deploymentId: "missing", position: 1, eligible: false, exclusionCodes: ["route-disabled", "deployment-missing"] },
      { deploymentId: "disabled", position: 2, eligible: false, exclusionCodes: ["route-disabled", "deployment-disabled", "provider-disabled", "credential-missing", "engine-incompatible", "model-unverified"] }
    ]);
  });

  it("does not silently choose another candidate for any explicit fixed value", () => {
    for (const fixedDeploymentId of ["", "outside", "missing", "disabled"]) {
      const resolved = resolveModelRoute({ routes: [route("route", ["primary"])], deployments: [deployment("primary", { enabled: false })], sessionRouteId: "route", routeOverride: { fixedDeploymentId } });
      expect(resolved).toMatchObject({ canSend: false, fixedDeploymentId, errorCode: "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE" });
      expect(resolved.selectedDeploymentId).toBeUndefined();
    }
  });

  it("blocks a fixed override on a no-route legacy resolution", () => {
    const resolved = resolveModelRoute({ routes: [], deployments: [], routeOverride: { fixedDeploymentId: "primary" }, legacy: { kind: "legacy-profile-model", profileId: "p", modelId: "m", source: "active-model" } });
    expect(resolved).toMatchObject({ kind: "legacy-profile-model", canSend: false, fixedDeploymentId: "primary", errorCode: "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE" });
  });

  it("keeps nine candidates in the pure resolver without applying CRUD limits", () => {
    const candidates = Array.from({ length: 9 }, (_, index) => `d-${index}`);
    const resolved = resolveModelRoute({ routes: [route("route", candidates)], deployments: candidates.map(deployment), sessionRouteId: "route", now: "2026-08-02T02:00:00Z" });
    expect(resolved.candidates).toHaveLength(9);
    expect(resolved.candidates.map((candidate) => candidate.position)).toEqual(candidates.map((_, index) => index + 1));
  });
});
