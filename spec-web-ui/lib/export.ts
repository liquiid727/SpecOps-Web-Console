import fs from "node:fs/promises";
import path from "node:path";

import { stringify } from "yaml";

import { loadAssetFilePreview, loadCatalogAssets } from "@/lib/catalog";
import { toggleReviewNoteTodo } from "@/lib/export-client";
import { loadProject, loadProjectWorkspace } from "@/lib/projects";
import type {
  CatalogAsset,
  ExportBundle,
  ExportDiffPreview,
  ExportFile,
  ExportFileGroup,
  ExportReviewDecision,
  ExportReviewDecisionEntry,
  ExportReviewFile,
  ExportReviewGroup,
  ExportReviewState,
  ExportTreeNode,
  ProjectManifest
} from "@/lib/types";
import { appRoot, repoRoot } from "@/lib/server-paths";

const exportsRoot = path.join(appRoot, "workspace", "exports");
const reviewStateFileName = "export-review.json";
const defaultReviewState: ExportReviewState = {
  decisions: []
};

function getExportDirectory(projectId: string) {
  return path.join(exportsRoot, projectId);
}

function getPreviousExportDirectory(projectId: string) {
  return path.join(getExportDirectory(projectId), ".previous");
}

function getExportReviewStatePath(projectId: string) {
  return path.join(appRoot, "workspace", "projects", projectId, reviewStateFileName);
}

export function buildExportBundle(
  project: ProjectManifest,
  selectedAssets: CatalogAsset[],
  issueSummary: {
    conflictCount: number;
    missingDependencyCount: number;
  }
): ExportBundle {
  const files = selectedAssets.flatMap((asset) =>
    asset.files.map((relativePath) => ({
      sourcePath: relativePath,
      targetPath: relativePath
    }))
  );

  const manifestYaml = stringify({
    id: project.id,
    name: project.name,
    projectType: project.projectType,
    architecture: project.architecture,
    stacks: project.stacks,
    draftTemplateId: project.draftTemplateId,
    draftPath: project.draftPath,
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
    files
  };
}

export async function generateExportBundle(projectId: string) {
  const [project, catalog, workspace] = await Promise.all([
    loadProject(projectId),
    loadCatalogAssets(),
    loadProjectWorkspace(projectId)
  ]);
  const selectedAssets = workspace.selectedAssets;
  const exportBundle = buildExportBundle(project, selectedAssets, {
    conflictCount: workspace.conflicts.length,
    missingDependencyCount: workspace.missingDependencies.length
  });
  const exportDirectory = getExportDirectory(projectId);
  const previousDirectory = getPreviousExportDirectory(projectId);

  await fs.mkdir(exportDirectory, { recursive: true });
  await snapshotPreviousExport(exportDirectory, previousDirectory);
  await fs.writeFile(path.join(exportDirectory, "project-manifest.yaml"), exportBundle.manifestYaml, "utf8");

  for (const file of exportBundle.files) {
    const sourceAbsolutePath = path.resolve(repoRoot, file.sourcePath);
    const targetAbsolutePath = path.join(exportDirectory, file.targetPath);

    await fs.mkdir(path.dirname(targetAbsolutePath), { recursive: true });
    await fs.copyFile(sourceAbsolutePath, targetAbsolutePath);
  }

  return exportBundle;
}

export async function loadGeneratedExportBundle(projectId: string, snapshot: "current" | "previous" = "current") {
  const exportDirectory =
    snapshot === "current" ? getExportDirectory(projectId) : getPreviousExportDirectory(projectId);
  const manifestPath = path.join(exportDirectory, "project-manifest.yaml");

  try {
    const manifestYaml = await fs.readFile(manifestPath, "utf8");
    const files = await collectExportFiles(exportDirectory);

    return {
      generatedAt: (await fs.stat(manifestPath)).mtime.toISOString(),
      summary: `${files.length} exported files ready for review`,
      manifestYaml,
      files
    } satisfies ExportBundle;
  } catch {
    return null;
  }
}

export function normalizeExportReviewState(input?: Partial<ExportReviewState>) {
  return {
    decisions: input?.decisions ?? []
  } satisfies ExportReviewState;
}

async function ensureExportReviewStateFile(projectId: string) {
  const reviewStatePath = getExportReviewStatePath(projectId);
  await fs.mkdir(path.dirname(reviewStatePath), { recursive: true });

  try {
    await fs.access(reviewStatePath);
  } catch {
    await fs.writeFile(reviewStatePath, JSON.stringify(defaultReviewState, null, 2), "utf8");
  }
}

export async function loadExportReviewState(projectId: string) {
  await ensureExportReviewStateFile(projectId);
  const raw = await fs.readFile(getExportReviewStatePath(projectId), "utf8");
  return normalizeExportReviewState(JSON.parse(raw));
}

export async function saveExportReviewState(projectId: string, state: ExportReviewState) {
  await ensureExportReviewStateFile(projectId);
  await fs.writeFile(getExportReviewStatePath(projectId), JSON.stringify(state, null, 2), "utf8");
}

export function setExportReviewDecisions(
  entries: ExportReviewDecisionEntry[],
  targetPaths: string[],
  decision: Exclude<ExportReviewDecision, "pending">,
  nowIso = new Date().toISOString()
) {
  const selected = new Set(targetPaths);
  const existingEntries = new Map(entries.map((entry) => [entry.targetPath, entry]));
  const remaining = entries.filter((entry) => !selected.has(entry.targetPath));
  const nextEntries = [
    ...remaining,
    ...[...selected].sort((left, right) => left.localeCompare(right)).map((targetPath) => ({
      ...existingEntries.get(targetPath),
      targetPath,
      decision,
      updatedAt: nowIso
    }))
  ];

  return nextEntries.sort((left, right) => left.targetPath.localeCompare(right.targetPath));
}

export function clearExportReviewDecisions(entries: ExportReviewDecisionEntry[], targetPaths: string[]) {
  const selected = new Set(targetPaths);
  return entries
    .map((entry) =>
      selected.has(entry.targetPath)
        ? {
            ...entry,
            decision: "pending" as const
          }
        : entry
    )
    .filter((entry) => entry.decision !== "pending" || entry.note?.trim());
}

export function setExportReviewNote(
  entries: ExportReviewDecisionEntry[],
  targetPath: string,
  note: string,
  nowIso = new Date().toISOString()
) {
  const trimmedNote = note.trim();
  const existingEntry = entries.find((entry) => entry.targetPath === targetPath);

  if (!trimmedNote) {
    return entries.filter(
      (entry) => entry.targetPath !== targetPath || entry.decision !== "pending"
    );
  }

  const nextEntry: ExportReviewDecisionEntry = {
    targetPath,
    decision: existingEntry?.decision ?? "pending",
    updatedAt: existingEntry?.updatedAt ?? nowIso,
    note: trimmedNote,
    noteUpdatedAt: nowIso
  };

  return [...entries.filter((entry) => entry.targetPath !== targetPath), nextEntry].sort((left, right) =>
    left.targetPath.localeCompare(right.targetPath)
  );
}

export async function updateExportReviewDecision(
  projectId: string,
  targetPaths: string[],
  decision: ExportReviewDecision
) {
  const reviewState = await loadExportReviewState(projectId);
  const nextState =
    decision === "pending"
      ? {
          decisions: clearExportReviewDecisions(reviewState.decisions, targetPaths)
        }
      : {
          decisions: setExportReviewDecisions(reviewState.decisions, targetPaths, decision)
        };

  await saveExportReviewState(projectId, nextState);
  return nextState;
}

export async function updateExportReviewNote(projectId: string, targetPath: string, note: string) {
  const reviewState = await loadExportReviewState(projectId);
  const nextState = {
    decisions: setExportReviewNote(reviewState.decisions, targetPath, note)
  };

  await saveExportReviewState(projectId, nextState);
  return nextState;
}

export async function updateExportReviewTodo(
  projectId: string,
  targetPath: string,
  itemIndex: number,
  checked: boolean
) {
  const reviewState = await loadExportReviewState(projectId);
  const existingEntry = reviewState.decisions.find((entry) => entry.targetPath === targetPath);
  const nextNote = toggleReviewNoteTodo(existingEntry?.note ?? "", itemIndex, checked);

  const nextState = {
    decisions: setExportReviewNote(reviewState.decisions, targetPath, nextNote)
  };

  await saveExportReviewState(projectId, nextState);
  return nextState;
}

export function groupExportFilesByDirectory<T extends ExportFile>(files: T[]): Array<{
  directory: string;
  files: T[];
}> {
  const grouped = new Map<string, T[]>();

  for (const file of files) {
    const directory = file.targetPath.split("/")[0] ?? "root";
    const current = grouped.get(directory) ?? [];
    current.push(file);
    grouped.set(directory, current);
  }

  return [...grouped.entries()]
    .map(([directory, groupedFiles]) => ({
      directory,
      files: groupedFiles.sort((left, right) => left.targetPath.localeCompare(right.targetPath))
    }))
    .sort((left, right) => left.directory.localeCompare(right.directory));
}

export function buildExportDiffPreview(input: {
  sourcePath: string;
  targetPath: string;
  sourceContent: string;
  generatedContent: string | null;
}): ExportDiffPreview {
  const normalizedSourceLines = splitContent(input.sourceContent);
  const normalizedGeneratedLines = splitContent(input.generatedContent);
  const status =
    input.generatedContent === null
      ? "new"
      : input.sourceContent.trim().length === 0
        ? "removed"
        : input.generatedContent === input.sourceContent
          ? "synced"
          : "changed";

  const previewLines = [
    `--- ${input.generatedContent === null ? "/dev/null" : input.sourcePath}`,
    `+++ ${input.targetPath}`,
    "@@ bundle review @@"
  ];

  const maxLineCount = Math.max(normalizedGeneratedLines.length, normalizedSourceLines.length);

  for (let index = 0; index < Math.min(maxLineCount, 12); index += 1) {
    const oldLine = normalizedGeneratedLines[index];
    const newLine = normalizedSourceLines[index];

    if (oldLine === newLine) {
      if (newLine !== undefined) {
        previewLines.push(` ${newLine}`);
      }
      continue;
    }

    if (oldLine !== undefined) {
      previewLines.push(`-${oldLine}`);
    }

    if (newLine !== undefined) {
      previewLines.push(`+${newLine}`);
    }
  }

  return {
    status,
    preview: previewLines.join("\n")
  };
}

export function getDiffLineEntries(preview: string) {
  return preview.split("\n").map((line) => {
    if (line.startsWith("---") || line.startsWith("+++")) {
      return { kind: "meta" as const, content: line };
    }

    if (line.startsWith("@@")) {
      return { kind: "hunk" as const, content: line };
    }

    if (line.startsWith("+")) {
      return { kind: "add" as const, content: line };
    }

    if (line.startsWith("-")) {
      return { kind: "remove" as const, content: line };
    }

    return { kind: "context" as const, content: line };
  });
}

export function buildExportFileTree(files: ExportFile[]) {
  type MutableTreeNode = {
    name: string;
    path: string;
    children: MutableTreeNode[];
    file?: ExportFile;
  };

  const root: MutableTreeNode[] = [];

  for (const file of [...files].sort((left, right) => left.targetPath.localeCompare(right.targetPath))) {
    const segments = file.targetPath.split("/");
    let level = root;
    let currentPath = "";

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let node = level.find((candidate) => candidate.name === segment);

      if (!node) {
        node = {
          name: segment,
          path: currentPath,
          children: []
        };
        level.push(node);
      }

      if (index === segments.length - 1) {
        node.file = file;
      }

      level = node.children;
    });
  }

  const prune = (nodes: MutableTreeNode[]): ExportTreeNode[] =>
    nodes.map((node) => {
      if (!node.children?.length) {
        const { children: _children, ...rest } = node;
        return rest;
      }

      return {
        ...node,
        children: prune(node.children)
      };
    });

  return prune(root);
}

export function buildExportReviewFiles(input: {
  currentFiles: ExportFile[];
  previousFiles: ExportFile[];
  currentContents: Record<string, string>;
  previousContents: Record<string, string>;
  decisions?: Record<string, ExportReviewDecisionEntry>;
}) {
  const targetPaths = [...new Set([...input.currentFiles, ...input.previousFiles].map((file) => file.targetPath))].sort(
    (left, right) => left.localeCompare(right)
  );

  return targetPaths.map<ExportReviewFile>((targetPath) => {
    const currentFile = input.currentFiles.find((file) => file.targetPath === targetPath) ?? null;
    const previousFile = input.previousFiles.find((file) => file.targetPath === targetPath) ?? null;
    const currentContent = currentFile ? input.currentContents[targetPath] ?? "" : "";
    const previousContent = previousFile ? input.previousContents[targetPath] ?? "" : null;
    const referenceFile = currentFile ?? previousFile;

    if (!referenceFile) {
      throw new Error(`Missing export review file for ${targetPath}`);
    }

    const diff = buildExportDiffPreview({
      sourcePath: referenceFile.sourcePath,
      targetPath: referenceFile.targetPath,
      sourceContent: currentContent,
      generatedContent: previousContent
    });

    return {
      ...referenceFile,
      diff,
      diffLines: getDiffLineEntries(diff.preview),
      decision: input.decisions?.[targetPath]?.decision ?? "pending",
      decisionUpdatedAt: input.decisions?.[targetPath]?.updatedAt,
      note: input.decisions?.[targetPath]?.note,
      noteUpdatedAt: input.decisions?.[targetPath]?.noteUpdatedAt
    };
  });
}

export function getReviewOwnersForFile(file: ExportFile, selectedAssets: CatalogAsset[]) {
  return selectedAssets.filter((asset) =>
    asset.files.some(
      (assetFile) => assetFile === file.sourcePath || assetFile === file.targetPath
    )
  );
}

export function filterExportReviewGroups(
  groups: ExportReviewGroup[],
  mode: "all" | "changes" | "new" | "changed" | "removed" | "synced",
  decision: "all" | ExportReviewDecision = "all"
) {
  return groups
    .map((group) => ({
      ...group,
      files: group.files.filter((file) => {
        const matchesStatus =
          mode === "all"
            ? true
            : mode === "changes"
              ? file.diff.status !== "synced"
              : file.diff.status === mode;
        const matchesDecision =
          decision === "all" ? true : (file.decision ?? "pending") === decision;

        return matchesStatus && matchesDecision;
      })
    }))
    .filter((group) => group.files.length > 0);
}

export function summarizeExportReviewDecisions(groups: ExportReviewGroup[]) {
  return groups.flatMap((group) => group.files).reduce(
    (accumulator, file) => {
      accumulator[file.decision ?? "pending"] += 1;
      return accumulator;
    },
    {
      accepted: 0,
      blocked: 0,
      needs_work: 0,
      pending: 0
    } satisfies Record<ExportReviewDecision, number>
  );
}

export async function loadExportReview(projectId: string, bundle: ExportBundle) {
  const [previousBundle, reviewState] = await Promise.all([
    loadGeneratedExportBundle(projectId, "previous"),
    loadExportReviewState(projectId)
  ]);
  const currentContents = Object.fromEntries(
    await Promise.all(
      bundle.files.map(async (file) => [file.targetPath, await loadAssetFilePreview(file.sourcePath)] as const)
    )
  );
  const previousContents = previousBundle
    ? Object.fromEntries(
        await Promise.all(
          previousBundle.files.map(async (file) => [
            file.targetPath,
            await fs.readFile(path.join(getPreviousExportDirectory(projectId), file.targetPath), "utf8")
          ] as const)
        )
      )
    : {};
  const reviewFiles = buildExportReviewFiles({
    currentFiles: bundle.files,
    previousFiles: previousBundle?.files ?? [],
    currentContents,
    previousContents,
    decisions: Object.fromEntries(reviewState.decisions.map((entry) => [entry.targetPath, entry]))
  });
  const groups = groupExportFilesByDirectory(reviewFiles);

  return Promise.all(
    groups.map(async (group) => ({
      directory: group.directory,
      files: group.files
    }))
  );
}

async function snapshotPreviousExport(currentDirectory: string, previousDirectory: string) {
  await fs.mkdir(currentDirectory, { recursive: true });
  const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
  const liveEntries = entries.filter((entry) => entry.name !== ".previous");

  await fs.rm(previousDirectory, { recursive: true, force: true });

  if (liveEntries.length) {
    await fs.mkdir(previousDirectory, { recursive: true });

    for (const entry of liveEntries) {
      await copyRecursive(path.join(currentDirectory, entry.name), path.join(previousDirectory, entry.name));
    }
  }

  for (const entry of liveEntries) {
    await fs.rm(path.join(currentDirectory, entry.name), { recursive: true, force: true });
  }
}

async function copyRecursive(sourcePath: string, targetPath: string) {
  const stat = await fs.stat(sourcePath);

  if (stat.isDirectory()) {
    await fs.mkdir(targetPath, { recursive: true });
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });

    for (const entry of entries) {
      await copyRecursive(path.join(sourcePath, entry.name), path.join(targetPath, entry.name));
    }

    return;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

function splitContent(content: string | null) {
  if (content === null || content.trim().length === 0) {
    return [];
  }

  return content.trimEnd().split("\n");
}

async function collectExportFiles(directory: string, prefix = ""): Promise<ExportBundle["files"]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: ExportBundle["files"] = [];

  for (const entry of entries) {
    if (entry.name === "project-manifest.yaml" || entry.name === ".previous") {
      continue;
    }

    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectExportFiles(absolutePath, relativePath)));
    } else {
      files.push({ sourcePath: relativePath, targetPath: relativePath });
    }
  }

  return files.sort((left, right) => left.targetPath.localeCompare(right.targetPath));
}
