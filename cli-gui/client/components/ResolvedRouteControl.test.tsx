import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelDeploymentSummary } from "../../shared/model-deployment";
import type { ResolvedRoute } from "../../shared/model-route";
import { I18nProvider } from "../i18n";
import { ResolvedRouteControl } from "./ResolvedRouteControl";

const deployment: ModelDeploymentSummary = {
  id: "deployment-1",
  name: "Primary",
  providerId: "provider-1",
  profileId: "profile-1",
  modelId: "model-1",
  enabled: true,
  createdAt: "2026-08-03T00:00:00Z",
  updatedAt: "2026-08-03T00:00:00Z",
  credentialStatus: "configured",
  capability: { source: "configured", observedAt: "2026-08-03T00:00:00Z", modelPresent: true, nativeSession: true, toolCalling: true, codeEditing: true },
  eligibility: "eligible",
  exclusionCodes: []
};

const resolvedRoute: ResolvedRoute = {
  kind: "route",
  routeId: "route-1",
  resolvedAt: "2026-08-03T00:00:00Z",
  sourceTrace: [{ field: "routeId", source: "project", value: "route-1" }, { field: "fixedDeploymentId", source: "run", value: "deployment-1" }],
  candidates: [{ deploymentId: "deployment-1", position: 1, eligible: true, exclusionCodes: [] }],
  executableCandidates: [{ deploymentId: "deployment-1", position: 1, eligible: true, exclusionCodes: [] }],
  selectedDeploymentId: "deployment-1",
  fixedDeploymentId: "deployment-1",
  canSend: true
};

describe("ResolvedRouteControl", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("marks a fixed one-shot route as run-sourced and returns the next selection", () => {
    const onFixedDeploymentChange = vi.fn();
    act(() => root.render(<I18nProvider><ResolvedRouteControl resolvedRoute={resolvedRoute} deployments={[deployment]} onFixedDeploymentChange={onFixedDeploymentChange} /></I18nProvider>));

    expect(container.querySelector("[data-route-source='run']")).not.toBeNull();
    const trigger = container.querySelector<HTMLButtonElement>("[aria-label='Fix deployment for this send']")!;
    act(() => trigger.click());
    const inherit = Array.from(container.querySelectorAll("[role='option']")).find((option) => option.textContent === "Inherit resolved route") as HTMLButtonElement;
    act(() => inherit.click());
    expect(onFixedDeploymentChange).toHaveBeenCalledWith(undefined);
  });
});
