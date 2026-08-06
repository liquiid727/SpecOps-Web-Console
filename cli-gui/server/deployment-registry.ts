import type { CliAdapterId, CliProfileCapabilities } from "../shared/types.js";
import type { ModelProviderConfig, SecretStatus } from "../shared/model-provider.js";
import type { DeploymentCapabilitySnapshot, DeploymentExclusionCode, ModelDeploymentConfig, ModelDeploymentSummary } from "../shared/model-deployment.js";

export interface DeploymentValidationContext {
  provider?: ModelProviderConfig;
  providerStatus?: SecretStatus;
  profile?: { id: string; adapterId: CliAdapterId; name: string };
  capabilities?: CliProfileCapabilities;
  models?: readonly { id: string }[];
  now: string;
}
export interface DeploymentSummaryContext extends DeploymentValidationContext {
  deployment: ModelDeploymentConfig;
}

export function deploymentEnablementError({ deployment, provider, providerStatus, profile, capabilities, models }: Omit<DeploymentSummaryContext, "now">) {
  if (deployment.archivedAt) return { status: 409, code: "MODEL_DEPLOYMENT_ARCHIVED", message: "Archived deployment cannot be enabled." } as const;
  if (!provider || !profile) return { status: 400, code: "MODEL_DEPLOYMENT_INCOMPATIBLE", message: "Provider and profile references are required." } as const;
  if (!providerProtocolMatchesAdapter(provider.protocol, profile.adapterId) || provider.enabled === false) return { status: 400, code: "MODEL_DEPLOYMENT_INCOMPATIBLE", message: "Provider protocol or engine is incompatible." } as const;
  if (providerStatus !== "configured" && providerStatus !== "legacy-environment") return { status: 409, code: "MODEL_DEPLOYMENT_CREDENTIAL_MISSING", message: "Provider credential is unavailable." } as const;
  if (!capabilities || capabilities.compatibility !== "supported" || !models || !models.some((model) => model.id === deployment.modelId)) return { status: 400, code: "MODEL_DEPLOYMENT_MODEL_UNKNOWN", message: "Model is not present in the verified profile catalog." } as const;
  return undefined;
}

export function providerProtocolMatchesAdapter(protocol: ModelProviderConfig["protocol"], adapterId: CliAdapterId | undefined) {
  if (!adapterId) return false;
  if (protocol === "anthropic-compatible") return ["claude-code", "kimi", "glm"].includes(adapterId);
  return adapterId === "codex";
}

export function deploymentExclusions({ deployment, provider, providerStatus, profile, capabilities, models }: Omit<DeploymentSummaryContext, "now">): DeploymentExclusionCode[] {
  const codes: DeploymentExclusionCode[] = [];
  if (!provider) codes.push("provider-missing");
  if (provider?.enabled === false) codes.push("provider-disabled");
  if (!profile) codes.push("profile-missing");
  if (provider && profile && !providerProtocolMatchesAdapter(provider.protocol, profile.adapterId)) codes.push("protocol-mismatch");
  if (providerStatus !== undefined && !["configured", "legacy-environment"].includes(providerStatus)) codes.push("credential-missing");
  if (!deployment.enabled) codes.push("deployment-disabled");
  if (deployment.archivedAt) codes.push("deployment-archived");
  if (models && !models.some((model) => model.id === deployment.modelId)) codes.push("model-missing");
  if (!models || capabilities === undefined || capabilities.compatibility !== "supported") codes.push("model-unverified");
  if (capabilities && capabilities.compatibility !== "supported") codes.push("engine-incompatible");
  return [...new Set(codes)];
}

export function summarizeDeployment(context: DeploymentSummaryContext): ModelDeploymentSummary {
  const exclusionCodes = deploymentExclusions(context);
  const capability: DeploymentCapabilitySnapshot = {
    source: context.capabilities ? "profile-probe" : "configured",
    observedAt: context.now,
    modelPresent: Boolean(context.models?.some((model) => model.id === context.deployment.modelId)),
    nativeSession: context.capabilities?.supportsResume ?? "unknown",
    toolCalling: context.capabilities?.supportsStructuredRecognition ?? "unknown",
    codeEditing: context.capabilities?.supportsHeadlessTurns ?? "unknown"
  };
  const eligibility = context.deployment.archivedAt
    ? "archived"
    : !context.deployment.enabled
      ? "disabled"
      : !context.models || context.capabilities === undefined
        ? "unknown"
        : exclusionCodes.length
          ? "invalid"
          : "eligible";
  return {
    ...context.deployment,
    providerName: context.provider?.name,
    profileName: context.profile?.name,
    providerProtocol: context.provider?.protocol,
    providerEnabled: context.provider?.enabled !== false,
    credentialStatus: context.providerStatus ?? "missing",
    capability,
    eligibility,
    exclusionCodes
  };
}

export function validateDeploymentInput(value: unknown) {
  if (!value || typeof value !== "object") return { ok: false as const, field: "deployment", message: "Deployment must be an object." };
  const input = value as Record<string, unknown>;
  for (const field of ["id", "name", "providerId", "profileId", "modelId"]) if (typeof input[field] !== "string" || !(input[field] as string).trim()) return { ok: false as const, field, message: `${field} is required.` };
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") return { ok: false as const, field: "enabled", message: "enabled must be a boolean." };
  return { ok: true as const };
}

export function validateDeploymentPatch(value: unknown) {
  if (!value || typeof value !== "object") return { ok: false as const, field: "deployment", message: "Deployment patch must be an object." };
  const input = value as Record<string, unknown>;
  for (const field of ["name", "providerId", "profileId", "modelId"]) {
    if (input[field] !== undefined && (typeof input[field] !== "string" || !(input[field] as string).trim())) return { ok: false as const, field, message: `${field} must be a non-empty string.` };
  }
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") return { ok: false as const, field: "enabled", message: "enabled must be a boolean." };
  return { ok: true as const };
}
