/**
 * Model Providers are credential/API catalogs, never runnable Agent Engines.
 * They intentionally do not share an ID union with AgentBackend.
 */
export type ModelProviderProtocol = "openai-compatible" | "anthropic-compatible";

export type SecretRef = `keychain:${string}` | `env:${string}`;

export type SecretStatus = "configured" | "missing" | "legacy-environment" | "store-unavailable";

export interface SecretStore {
  put(scope: { providerId: string }, secret: string): Promise<SecretRef>;
  resolve(ref: SecretRef): Promise<string>;
  remove(ref: SecretRef): Promise<void>;
  status(ref: SecretRef): Promise<SecretStatus>;
}

export interface ModelProviderConfig {
  id: string;
  name: string;
  protocol: ModelProviderProtocol;
  baseUrl: string;
  /** SecretRef after schema v6; a bare env name is accepted only for v5 migration compatibility. */
  credentialRef?: SecretRef | string;
  models: string[];
  supportedEngineIds?: string[];
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModelProviderSummary extends Omit<ModelProviderConfig, "credentialRef"> {
  id: string;
  name: string;
  protocol: ModelProviderProtocol;
  configured: boolean;
  credentialStatus: SecretStatus;
  hasCredential: boolean;
}

export interface ProviderConnectionSummary extends ModelProviderSummary {
  /** Deliberately no credentialRef or secret value. */
}
