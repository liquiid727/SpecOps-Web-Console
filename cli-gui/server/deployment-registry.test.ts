import { describe, expect, it } from "vitest";
import { deploymentExclusions, deploymentEnablementError, providerProtocolMatchesAdapter, summarizeDeployment, validateDeploymentPatch } from "./deployment-registry.js";

const deployment = { id: "d-1", name: "D", providerId: "p-1", profileId: "profile-1", modelId: "model-1", enabled: true, createdAt: "now", updatedAt: "now" } as const;
const provider = { id: "p-1", name: "P", protocol: "openai-compatible" as const, baseUrl: "https://example.test", models: ["model-1"], enabled: true };
const profile = { id: "profile-1", adapterId: "codex" as const, name: "Codex" };
const capabilities = { adapterId: "codex" as const, compatibility: "supported" as const, permissions: [], modes: [], models: [{ id: "model-1", labelKey: "model-1", requiresRestart: false }], supportsComposer: true, supportsStructuredRecognition: true, supportsHeadlessTurns: true, supportsResume: true, supportsApproval: true, supportsPromptEnhancement: true, guiMode: "full" as const };

describe("deployment registry", () => {
  it("matches provider protocol to profile adapter family", () => {
    expect(providerProtocolMatchesAdapter("openai-compatible", "codex")).toBe(true);
    expect(providerProtocolMatchesAdapter("anthropic-compatible", "codex")).toBe(false);
    expect(providerProtocolMatchesAdapter("anthropic-compatible", "claude-code")).toBe(true);
  });

  it("reports verified eligibility without exposing credential references", () => {
    const summary = summarizeDeployment({ deployment, provider, providerStatus: "configured", profile, capabilities, models: capabilities.models, now: "now" });
    expect(summary.eligibility).toBe("eligible");
    expect(summary.exclusionCodes).toEqual([]);
    expect(JSON.stringify(summary)).not.toContain("credentialRef");
  });

  it("keeps unknown capability and model outside eligible", () => {
    expect(deploymentEnablementError({ deployment, provider, providerStatus: "configured", profile, capabilities: undefined, models: undefined })?.code).toBe("MODEL_DEPLOYMENT_MODEL_UNKNOWN");
    expect(deploymentEnablementError({ deployment: { ...deployment, modelId: "missing" }, provider, providerStatus: "configured", profile, capabilities, models: capabilities.models })?.code).toBe("MODEL_DEPLOYMENT_MODEL_UNKNOWN");
    expect(deploymentExclusions({ deployment, provider, providerStatus: "configured", profile, capabilities: { ...capabilities, compatibility: "unknown-version" }, models: capabilities.models })).toContain("model-unverified");
  });

  it("maps missing credentials and archived re-enable to stable errors", () => {
    expect(deploymentEnablementError({ deployment, provider, providerStatus: "missing", profile, capabilities, models: capabilities.models })?.code).toBe("MODEL_DEPLOYMENT_CREDENTIAL_MISSING");
    expect(deploymentEnablementError({ deployment: { ...deployment, archivedAt: "later" }, provider, providerStatus: "configured", profile, capabilities, models: capabilities.models })?.code).toBe("MODEL_DEPLOYMENT_ARCHIVED");
    expect(summarizeDeployment({ deployment: { ...deployment, enabled: false }, provider, providerStatus: "missing", profile, capabilities: undefined, models: undefined, now: "now" }).eligibility).toBe("disabled");
    expect(summarizeDeployment({ deployment: { ...deployment, archivedAt: "later", enabled: false }, provider, providerStatus: "missing", profile, capabilities: undefined, models: undefined, now: "now" }).eligibility).toBe("archived");
  });

  it("validates patch field types while ignoring unknown fields", () => {
    expect(validateDeploymentPatch({ name: "Renamed", futureField: { ignored: true }, enabled: false }).ok).toBe(true);
    expect(validateDeploymentPatch({ name: " " })).toMatchObject({ ok: false, field: "name" });
    expect(validateDeploymentPatch({ providerId: 42 })).toMatchObject({ ok: false, field: "providerId" });
    expect(validateDeploymentPatch({ enabled: "true" })).toMatchObject({ ok: false, field: "enabled" });
  });
});
