/**
 * Model Providers are credential/API catalogs, never runnable Agent Engines.
 * They intentionally do not share an ID union with AgentBackend.
 */
export type ModelProviderProtocol = "openai-compatible" | "anthropic-compatible";

export interface ModelProviderConfig {
  id: string;
  name: string;
  protocol: ModelProviderProtocol;
  baseUrl: string;
  credentialRef?: string;
  models: string[];
}

export interface ModelProviderSummary {
  id: string;
  name: string;
  protocol: ModelProviderProtocol;
  configured: boolean;
  models: string[];
}
