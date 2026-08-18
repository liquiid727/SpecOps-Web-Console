export interface BundleAsset {
  id: string;
  files: string[];
  contentFiles?: Record<string, string>;
}

export interface BundleProject {
  id: string;
  name: string;
  projectType: "backend" | "frontend" | "mixed";
  architecture: string;
  stacks: string[];
  prdTemplateId: string;
  prdPath: string;
  exportTargets: string[];
}

export interface BundleIssueSummary {
  conflictCount: number;
  missingDependencyCount: number;
}

export interface ExportFile {
  sourcePath: string;
  targetPath: string;
}

export type BundleProjectType = "backend" | "frontend" | "mixed" | "fullstack" | "spec-only";

export interface SpecosBundleInstall {
  target: string;
  from: string;
}

export interface SpecosBundleManifest {
  id: string;
  name: string;
  version: string;
  specosVersion: string;
  projectTypes: BundleProjectType[];
  installs: SpecosBundleInstall[];
  workflow: {
    default: string;
    available: string[];
  };
  entrypoints: {
    prdTemplate: string;
    designTemplate: string;
    featureTemplate: string;
    issueTemplate: string;
    workflowId: string;
  };
  capabilities: {
    refineSpec: boolean;
    generateTestPlan: boolean;
    runApiTests: boolean;
    runUiTests: boolean;
    normalizeResults: boolean;
  };
}

export interface GeneratedExportFile {
  targetPath: string;
  content: string;
}

export interface BundlePlan {
  generatedAt: string;
  summary: string;
  manifestYaml: string;
  files: ExportFile[];
  bundleManifest: SpecosBundleManifest;
  bundleManifestYaml: string;
  bundleFiles: GeneratedExportFile[];
}
