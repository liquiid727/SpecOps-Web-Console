import type { LegacyModelResolution } from "../shared/model-deployment.js";

export interface LegacyModelResolverInput {
  profileId: string;
  activeModel?: string | null;
  launchConfigModel?: string | null;
  profileDefaultModel?: string | null;
}

function normalizeModel(value: string | null | undefined): string | null {
  const model = typeof value === "string" ? value.trim() : "";
  return !model || model === "default" ? null : model;
}

export function resolveLegacyModel(input: LegacyModelResolverInput): LegacyModelResolution {
  const activeModel = normalizeModel(input.activeModel);
  if (activeModel) return { kind: "legacy-profile-model", profileId: input.profileId, modelId: activeModel, source: "active-model" };
  const launchModel = normalizeModel(input.launchConfigModel);
  if (launchModel) return { kind: "legacy-profile-model", profileId: input.profileId, modelId: launchModel, source: "launch-config" };
  return { kind: "legacy-profile-model", profileId: input.profileId, modelId: normalizeModel(input.profileDefaultModel), source: "profile-default" };
}
