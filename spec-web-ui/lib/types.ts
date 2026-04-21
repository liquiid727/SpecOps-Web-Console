export type CatalogAssetType = "rule" | "spec_template" | "agent_role";
export type CatalogDirection = "backend" | "frontend" | "ui" | "fullstack";
export type ProjectType = "backend" | "frontend" | "mixed";

export interface CatalogAsset {
  id: string;
  type: CatalogAssetType;
  title: string;
  summary: string;
  direction: CatalogDirection;
  stacks: string[];
  tags: string[];
  appliesTo: string[];
  dependsOn: string[];
  conflictsWith: string[];
  sourcePath: string;
  files: string[];
  version: string;
  draftHints?: string[];
  sampleOutput?: string;
}

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

export interface PresetBundle {
  id: string;
  title: string;
  summary: string;
  assetIds: string[];
  projectTypes: ProjectType[];
  featured?: boolean;
}

export interface CatalogFilters {
  query?: string;
  types?: CatalogAssetType[];
  directions?: CatalogDirection[];
  stacks?: string[];
  tags?: string[];
}

export interface CatalogFilterOptions {
  directions: CatalogDirection[];
  stacks: string[];
  tags: string[];
  types: CatalogAssetType[];
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
  draftTemplateId: string;
  draftPath: string;
  exportTargets: string[];
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

export interface ExportFile {
  sourcePath: string;
  targetPath: string;
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

export interface ExportBundle {
  generatedAt: string;
  summary: string;
  manifestYaml: string;
  files: ExportFile[];
}
