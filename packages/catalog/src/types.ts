export type CatalogAssetType =
  | "rule"
  | "spec_template"
  | "agent_role"
  | "agent_team"
  | "skill"
  | "engineering_pack";
export type CatalogAgentTier = "main" | "specialist";
export type CatalogDirection = "backend" | "frontend" | "ui" | "fullstack";
export type CatalogCategory = "product" | "operations" | "testing" | "deployment" | "frontend" | "backend";
export type CatalogDirectionGroup = "product" | "business" | "frontend" | "backend" | "operations" | "qa";
export type ProjectType = "backend" | "frontend" | "mixed";

export interface CatalogAsset {
  id: string;
  type: CatalogAssetType;
  tier?: CatalogAgentTier;
  managedBy?: string;
  title: string;
  summary: string;
  summaryZh?: string;
  direction: CatalogDirection;
  directionGroups?: CatalogDirectionGroup[];
  categories?: CatalogCategory[];
  stacks: string[];
  tags: string[];
  appliesTo: string[];
  dependsOn: string[];
  conflictsWith: string[];
  sourcePath: string;
  files: string[];
  contentFiles?: Record<string, string>;
  version: string;
  draftHints?: string[];
  sampleOutput?: string;
}

export interface ConfigurationPreset {
  id: string;
  title: string;
  summary: string;
  assetIds: string[];
  projectTypes: ProjectType[];
  featured?: boolean;
}

export interface CatalogFilters {
  query?: string;
  categories?: CatalogCategory[];
  directionGroups?: CatalogDirectionGroup[];
  types?: CatalogAssetType[];
  directions?: CatalogDirection[];
  stacks?: string[];
  tags?: string[];
}

export interface CatalogFilterOptions {
  directions: CatalogDirection[];
  directionGroups: CatalogDirectionGroup[];
  stacks: string[];
  tags: string[];
  types: CatalogAssetType[];
}

export interface CatalogDirectionGroupDefinition {
  label: string;
  description: string;
  agents: string[];
  rules: string[];
  skills: string[];
}

export interface CatalogDirectionManifest {
  version: number;
  directions: Record<CatalogDirectionGroup, CatalogDirectionGroupDefinition>;
}

export interface WorkspaceAssetContext {
  selectedAssetIds: string[];
  requiredAssetIds: string[];
  recommendedAssetIds: string[];
  conflictingAssetIds: string[];
}
