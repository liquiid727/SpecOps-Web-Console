import { stringify } from "yaml";

import { deriveInstallMappings } from "./config/install-targets.js";
import type {
  BundleAsset,
  BundleIssueSummary,
  BundlePlan,
  BundleProject,
  ExportFile,
  SpecosBundleManifest
} from "./types.js";

const DEFAULT_WORKFLOW_ID = "spec-driven-default";

export function buildBundlePlan(
  project: BundleProject,
  selectedAssets: BundleAsset[],
  issueSummary: BundleIssueSummary
): BundlePlan {
  const files = selectedAssets.flatMap((asset) =>
    asset.files.map((relativePath) => ({
      sourcePath: asset.contentFiles?.[relativePath] ?? relativePath,
      targetPath: relativePath
    }))
  );
  const bundleManifest = buildSpecosBundleManifest(project, files);
  const bundleManifestYaml = stringify(bundleManifest);
  const workflowFile = buildBundleWorkflowFile();
  const bundleFiles = [
    {
      targetPath: ".specos-bundle/bundle.yaml",
      content: bundleManifestYaml
    },
    {
      targetPath: ".specos-bundle/manifest.json",
      content: `${JSON.stringify(
        {
          projectId: project.id,
          selectedAssetIds: selectedAssets.map((asset) => asset.id),
          generatedAt: new Date().toISOString(),
          workflowId: bundleManifest.workflow.default
        },
        null,
        2
      )}\n`
    },
    {
      targetPath: `.specos-bundle/files/.specos/workflows/${DEFAULT_WORKFLOW_ID}.yaml`,
      content: workflowFile
    },
    {
      targetPath: ".specos-bundle/checksums.json",
      content: `${JSON.stringify({}, null, 2)}\n`
    }
  ].sort((left, right) => left.targetPath.localeCompare(right.targetPath));

  const manifestYaml = stringify({
    id: project.id,
    name: project.name,
    projectType: project.projectType,
    architecture: project.architecture,
    stacks: project.stacks,
    prdTemplateId: project.prdTemplateId,
    prdPath: project.prdPath,
    selectedAssetIds: selectedAssets.map((asset) => asset.id),
    exportTargets: project.exportTargets,
    checks: {
      conflicts: issueSummary.conflictCount,
      missingDependencies: issueSummary.missingDependencyCount
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: `${selectedAssets.length} selected assets, ${files.length} exported files`,
    manifestYaml,
    files,
    bundleManifest,
    bundleManifestYaml,
    bundleFiles
  };
}

function buildSpecosBundleManifest(
  project: BundleProject,
  files: ExportFile[]
): SpecosBundleManifest {
  return {
    id: `${project.id}-bundle`,
    name: `${project.name} Bundle`,
    version: "0.1.0",
    specosVersion: ">=0.1.0",
    projectTypes: [project.projectType],
    installs: deriveInstallMappings(files),
    workflow: {
      default: DEFAULT_WORKFLOW_ID,
      available: [DEFAULT_WORKFLOW_ID]
    },
    entrypoints: {
      prdTemplate: project.prdTemplateId,
      designTemplate: "template-platform-design",
      featureTemplate: "template-feature-spec",
      issueTemplate: "template-issue",
      workflowId: DEFAULT_WORKFLOW_ID
    },
    capabilities: {
      refineSpec: true,
      generateTestPlan: true,
      runApiTests: false,
      runUiTests: false,
      normalizeResults: true
    }
  };
}

function buildBundleWorkflowFile() {
  return stringify({
    id: DEFAULT_WORKFLOW_ID,
    name: "Spec Driven Default",
    steps: [
      {
        id: "bundle_smoke",
        run: "node -e \"console.log('specos-bundle-installed')\""
      }
    ]
  });
}
