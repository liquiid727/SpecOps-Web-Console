import type {
  BundlePlan,
  ExportFile,
  GeneratedExportFile,
  SpecosBundleManifest
} from "@specos/bundler";
import type {
  CatalogAsset,
  CatalogCategory,
  CatalogDirection,
  CatalogFilterOptions,
  CatalogFilters,
  CatalogAssetType,
  PresetBundle,
  ProjectType
} from "@specos/catalog";

export type {
  CatalogAsset,
  CatalogAssetType,
  CatalogCategory,
  CatalogDirection,
  CatalogFilterOptions,
  CatalogFilters,
  ExportFile,
  GeneratedExportFile,
  PresetBundle,
  ProjectType,
  SpecosBundleManifest
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
  exportTargets: string[];
}

export type RequirementType = "feature" | "change" | "bug" | "refactor";
export type RequirementStatus = "draft" | "review" | "approved" | "implementing" | "done" | "example";
export type RequirementDocument = "prd" | "spec" | "test" | "issues";
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
}

export interface RequirementDocumentData {
  document: RequirementDocument;
  path: string;
  source: string;
  metadata: Record<string, unknown>;
}

export interface RequirementPackageDetail extends RequirementPackageSummary {
  documents: Partial<Record<RequirementDocument, RequirementDocumentData>>;
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

export interface ExportFileGroup {
  directory: string;
  files: ExportFile[];
}

export interface ExportDiffPreview {
  status: "new" | "changed" | "synced" | "removed";
  preview: string;
}

export type ExportReviewDecision = "pending" | "accepted" | "needs_work" | "blocked";

export interface ExportReviewDecisionEntry {
  targetPath: string;
  decision: ExportReviewDecision;
  updatedAt: string;
  note?: string;
  noteUpdatedAt?: string;
}

export interface ExportReviewState {
  decisions: ExportReviewDecisionEntry[];
}

export interface ExportReviewFile extends ExportFile {
  diff: ExportDiffPreview;
  diffLines: Array<{
    kind: "meta" | "hunk" | "add" | "remove" | "context";
    content: string;
  }>;
  decision?: ExportReviewDecision;
  decisionUpdatedAt?: string;
  note?: string;
  noteUpdatedAt?: string;
  owners?: Array<{
    id: string;
    title: string;
  }>;
}

export interface ExportReviewGroup {
  directory: string;
  files: ExportReviewFile[];
}

export interface ExportTreeNode {
  name: string;
  path: string;
  children?: ExportTreeNode[];
  file?: ExportFile;
}

export type ExportBundle = BundlePlan;
