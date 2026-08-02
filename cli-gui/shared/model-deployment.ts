import type { SecretStatus } from "./model-provider.js";

export type DeploymentEligibility = "eligible" | "disabled" | "archived" | "invalid" | "unknown";

export type DeploymentExclusionCode =
  | "provider-missing"
  | "provider-disabled"
  | "profile-missing"
  | "protocol-mismatch"
  | "credential-missing"
  | "model-unverified"
  | "model-missing"
  | "deployment-disabled"
  | "deployment-archived"
  | "engine-incompatible";

export interface ModelDeploymentConfig {
  id: string;
  name: string;
  providerId: string;
  profileId: string;
  modelId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface DeploymentCapabilitySnapshot {
  source: "profile-probe" | "configured";
  observedAt: string;
  modelPresent: boolean;
  nativeSession: boolean | "unknown";
  toolCalling: boolean | "unknown";
  codeEditing: boolean | "unknown";
  contextWindow?: number;
}

export interface ModelDeploymentSummary extends ModelDeploymentConfig {
  providerName?: string;
  profileName?: string;
  providerProtocol?: "openai-compatible" | "anthropic-compatible";
  providerEnabled?: boolean;
  credentialStatus: SecretStatus;
  capability: DeploymentCapabilitySnapshot;
  eligibility: DeploymentEligibility;
  exclusionCodes: DeploymentExclusionCode[];
}

export interface LegacyModelResolution {
  kind: "legacy-profile-model";
  profileId: string;
  modelId: string | null;
  source: "launch-config" | "active-model" | "profile-default";
}
