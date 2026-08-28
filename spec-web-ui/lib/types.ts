import type {
  CatalogAsset,
  CatalogCategory,
  CatalogDirection,
  CatalogDirectionGroup,
  CatalogFilterOptions,
  CatalogFilters,
  CatalogAssetType,
  ConfigurationPreset,
  ProjectType
} from "@specos/catalog";

export type {
  CatalogAsset,
  CatalogAssetType,
  CatalogCategory,
  CatalogDirection,
  CatalogDirectionGroup,
  CatalogFilterOptions,
  CatalogFilters,
  ConfigurationPreset,
  ProjectType
};

export interface SavedCompareSet {
  id: string;
  name: string;
  assetIds: string[];
  projectId?: string;
  createdAt: string;
}

export interface FavoriteEntry {
  assetId: string;
  label?: string;
}

export interface PresetDisplayEntry {
  presetId: string;
  label?: string;
  hidden?: boolean;
}

export interface DiscoverPreferences {
  favoriteEntries: FavoriteEntry[];
  compareSets: SavedCompareSet[];
  presetDisplays: PresetDisplayEntry[];
}

export interface ProjectAssetSelection {
  assetId: string;
  enabled: boolean;
}

export interface ProjectManifest {
  id: string;
  name: string;
  projectType: ProjectType;
  architecture: string;
  stacks: string[];
  selectedAssets: ProjectAssetSelection[];
  prdTemplateId: string;
  prdPath: string;
  configurationTargets: string[];
}

export type RequirementType = "feature" | "change" | "bug" | "refactor";
export type RequirementStatus = "draft" | "review" | "approved" | "implementing" | "done" | "example";
export type RequirementDocument = "prd" | "acceptance" | "spec" | "test" | "review" | "issues";
export type RequirementGateStatus = "pass" | "warn" | "block";

export interface RequirementFileState {
  present: boolean;
  status?: string;
  ids: number;
}

export interface RequirementPackageSummary {
  id: string;
  slug: string;
  title: string;
  type: RequirementType;
  status: RequirementStatus;
  priority?: string;
  updatedAt?: string;
  files: Record<RequirementDocument, RequirementFileState>;
  issueCounts: { total: number; done: number };
  gates: {
    package: RequirementGateStatus;
    prd: RequirementGateStatus;
    spec: RequirementGateStatus;
    test: RequirementGateStatus;
    feature: RequirementGateStatus;
  };
  warnings: string[];
  specCount: number;
}

export interface RequirementDocumentData {
  document: RequirementDocument;
  path: string;
  source: string;
  metadata: Record<string, unknown>;
}

export interface RequirementPackageDetail extends RequirementPackageSummary {
  index: RequirementDocumentData;
  documents: Partial<Record<RequirementDocument, RequirementDocumentData>>;
  specs: RequirementSpecSummary[];
}

export interface RequirementSpecSummary {
  id: string;
  slug: string;
  title: string;
  status: string;
  path: string;
  documents: Record<"spec" | "test" | "review" | "issues", RequirementFileState>;
}

export interface RequirementSpecDetail extends RequirementSpecSummary {
  requirementId: string;
  sources: Partial<Record<Exclude<RequirementDocument, "prd">, RequirementDocumentData>>;
  evidence: string[];
}

export interface MissingDependencyIssue {
  assetId: string;
  missingAssetIds: string[];
}

export interface ConflictIssue {
  assetId: string;
  conflictingAssetIds: string[];
}

export interface ProjectWorkspace {
  project: ProjectManifest;
  selectedAssets: CatalogAsset[];
  missingDependencies: MissingDependencyIssue[];
  conflicts: ConflictIssue[];
  recommendedAssets: CatalogAsset[];
}

export interface DraftAdvice {
  missingSections: string[];
  ruleHints: string[];
}
