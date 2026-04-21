import fs from "node:fs/promises";
import path from "node:path";

import { loadCatalogAssets } from "@/lib/catalog";
import type {
  CatalogAsset,
  ConflictIssue,
  MissingDependencyIssue,
  ProjectManifest,
  ProjectWorkspace
} from "@/lib/types";
import { appRoot } from "@/lib/server-paths";
import { createSlug, uniq } from "@/lib/utils";

const projectsRoot = path.join(appRoot, "workspace", "projects");

function getProjectDirectory(projectId: string) {
  return path.join(projectsRoot, projectId);
}

function getProjectManifestPath(projectId: string) {
  return path.join(getProjectDirectory(projectId), "project.manifest.json");
}

export async function listProjects() {
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
  const projects = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadProject(entry.name))
  );

  return projects.sort((left, right) => left.name.localeCompare(right.name));
}

export async function loadProject(projectId: string) {
  const raw = await fs.readFile(getProjectManifestPath(projectId), "utf8");
  return JSON.parse(raw) as ProjectManifest;
}

export async function loadProjectDraft(project: ProjectManifest) {
  return fs.readFile(path.join(appRoot, project.draftPath.replace(/^spec-web-ui\//, "")), "utf8");
}

export async function saveProjectDraft(projectId: string, markdown: string) {
  const project = await loadProject(projectId);
  const draftAbsolutePath = path.join(appRoot, project.draftPath.replace(/^spec-web-ui\//, ""));
  await fs.writeFile(draftAbsolutePath, markdown, "utf8");

  return project;
}

export async function createProject(input: {
  name: string;
  projectType: ProjectManifest["projectType"];
  architecture: string;
  stacks: string[];
}) {
  const id = createSlug(input.name);
  const projectDirectory = getProjectDirectory(id);

  await fs.mkdir(projectDirectory, { recursive: false });

  const project: ProjectManifest = {
    id,
    name: input.name,
    projectType: input.projectType,
    architecture: input.architecture,
    stacks: input.stacks,
    selectedAssets: [],
    draftTemplateId: "template-feature-draft",
    draftPath: `spec-web-ui/workspace/projects/${id}/draft.md`,
    exportTargets: ["rules/", "spec/_template/", "ai/agents/", "project-manifest.yaml"]
  };

  await fs.writeFile(getProjectManifestPath(id), JSON.stringify(project, null, 2), "utf8");
  await fs.writeFile(
    path.join(projectDirectory, "draft.md"),
    "# New Feature Draft\n\n## 背景\n\n",
    "utf8"
  );

  return project;
}

export async function updateProjectAssetSelection(
  projectId: string,
  assetId: string,
  enabled: boolean
) {
  const project = await loadProject(projectId);
  const nextSelections = [...project.selectedAssets];
  const existingIndex = nextSelections.findIndex((item) => item.assetId === assetId);

  if (existingIndex >= 0) {
    nextSelections[existingIndex] = { assetId, enabled };
  } else {
    nextSelections.push({ assetId, enabled });
  }

  const nextProject: ProjectManifest = {
    ...project,
    selectedAssets: nextSelections.filter((item) => item.enabled)
  };

  await fs.writeFile(getProjectManifestPath(projectId), JSON.stringify(nextProject, null, 2), "utf8");

  return nextProject;
}

export async function addProjectAssets(projectId: string, assetIds: string[]) {
  const project = await loadProject(projectId);
  const selectedIds = new Set(project.selectedAssets.filter((item) => item.enabled).map((item) => item.assetId));

  for (const assetId of assetIds) {
    selectedIds.add(assetId);
  }

  const nextProject: ProjectManifest = {
    ...project,
    selectedAssets: [...selectedIds]
      .sort((left, right) => left.localeCompare(right))
      .map((assetId) => ({ assetId, enabled: true }))
  };

  await fs.writeFile(getProjectManifestPath(projectId), JSON.stringify(nextProject, null, 2), "utf8");

  return nextProject;
}

export function resolveProjectWorkspace(
  project: ProjectManifest,
  catalog: CatalogAsset[]
): ProjectWorkspace {
  const selectedAssets = project.selectedAssets
    .filter((item) => item.enabled)
    .map((item) => catalog.find((asset) => asset.id === item.assetId))
    .filter((asset): asset is CatalogAsset => Boolean(asset));

  const selectedIds = new Set(selectedAssets.map((asset) => asset.id));
  const missingDependencies: MissingDependencyIssue[] = selectedAssets
    .map((asset) => ({
      assetId: asset.id,
      missingAssetIds: asset.dependsOn.filter((dependencyId) => !selectedIds.has(dependencyId))
    }))
    .filter((issue) => issue.missingAssetIds.length > 0);

  const conflicts: ConflictIssue[] = selectedAssets
    .map((asset) => ({
      assetId: asset.id,
      conflictingAssetIds: asset.conflictsWith.filter((conflictId) => selectedIds.has(conflictId))
    }))
    .filter((issue) => issue.conflictingAssetIds.length > 0)
    .filter(
      (issue, index, issues) =>
        issues.findIndex((candidate) => {
          const left = [issue.assetId, ...issue.conflictingAssetIds].sort().join(",");
          const right = [candidate.assetId, ...candidate.conflictingAssetIds].sort().join(",");

          return left === right;
        }) === index
    );

  const recommendationIds = uniq(
    missingDependencies.flatMap((issue) => issue.missingAssetIds).concat(
      catalog
        .filter((asset) => !selectedIds.has(asset.id))
        .filter((asset) => asset.stacks.some((stack) => project.stacks.includes(stack)))
        .filter((asset) => asset.appliesTo.some((scope) => scope === project.projectType || scope === "frontend" || scope === "backend"))
        .slice(0, 4)
        .map((asset) => asset.id)
    )
  );

  const recommendedAssets = recommendationIds
    .map((assetId) => catalog.find((asset) => asset.id === assetId))
    .filter((asset): asset is CatalogAsset => Boolean(asset))
    .filter((asset) => !selectedIds.has(asset.id));

  return {
    project,
    selectedAssets,
    missingDependencies,
    conflicts,
    recommendedAssets
  };
}

export async function loadProjectWorkspace(projectId: string) {
  const [project, catalog] = await Promise.all([loadProject(projectId), loadCatalogAssets()]);
  return resolveProjectWorkspace(project, catalog);
}

export function buildAssetCompositionPreview(workspace: ProjectWorkspace, asset: CatalogAsset) {
  const nextSelectedAssets = workspace.selectedAssets.some((selectedAsset) => selectedAsset.id === asset.id)
    ? workspace.selectedAssets
    : [...workspace.selectedAssets, asset];
  const nextSelectedIds = new Set(nextSelectedAssets.map((selectedAsset) => selectedAsset.id));
  const remainingMissingDependencies = uniq(
    nextSelectedAssets.flatMap((selectedAsset) =>
      selectedAsset.dependsOn.filter((dependencyId) => !nextSelectedIds.has(dependencyId))
    )
  );
  const exportDirectories = uniq(asset.files.map((file) => file.split("/")[0])).sort((left, right) =>
    left.localeCompare(right)
  );

  return {
    selectedAssetCount: nextSelectedAssets.length,
    exportDirectories,
    remainingMissingDependencies,
    introducedConflicts: nextSelectedAssets
      .filter((selectedAsset) => selectedAsset.id !== asset.id)
      .filter(
        (selectedAsset) =>
          selectedAsset.conflictsWith.includes(asset.id) || asset.conflictsWith.includes(selectedAsset.id)
      )
      .map((selectedAsset) => selectedAsset.id)
  };
}
