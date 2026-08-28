"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadCatalogAssets } from "@/features/catalog/server";
import {
  buildDiscoverReorderFeedback,
  loadConfigurationPresets,
  moveCompareSetsToFront,
  moveCompareSetBefore,
  moveFavoriteEntriesToFront,
  moveFavoriteEntryBefore,
  movePresetDisplaysToFront,
  movePresetDisplayBefore,
  removeCompareSets,
  removeFavoriteEntries,
  removeCompareSet,
  removeFavoriteEntry,
  renameCompareSet,
  renameFavoriteEntry,
  renamePresetDisplay,
  reorderCompareSets,
  reorderFavoriteEntries,
  reorderPresetDisplays,
  saveCompareSet,
  setPresetDisplaysHiddenBatch,
  setPresetDisplayHidden,
  toggleFavoriteAsset,
  updateDiscoverPreferences
} from "@/features/catalog/preferences";
import {
  addProjectAssets,
  createProject,
  saveProjectDraft,
  updateProjectAssetSelection
} from "@/lib/projects";
import { assertWorkspaceWritable } from "@/lib/runtime";

export async function createProjectAction(formData: FormData) {
  assertWorkspaceWritable();
  const name = String(formData.get("name") ?? "").trim();
  const projectType = String(formData.get("projectType") ?? "mixed") as
    | "backend"
    | "frontend"
    | "mixed";
  const architecture = String(formData.get("architecture") ?? "modular-monolith").trim();
  const stacks = String(formData.get("stacks") ?? "")
    .split(",")
    .map((stack) => stack.trim())
    .filter(Boolean);

  if (!name) {
    throw new Error("Project name is required");
  }

  const project = await createProject({
    name,
    projectType,
    architecture,
    stacks: stacks.length ? stacks : ["go", "react"]
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function setProjectAssetSelectionAction(formData: FormData) {
  assertWorkspaceWritable();
  const projectId = String(formData.get("projectId"));
  const assetId = String(formData.get("assetId"));
  const enabled = String(formData.get("enabled")) === "true";
  const redirectTo = String(formData.get("redirectTo") ?? `/projects/${projectId}`);

  await updateProjectAssetSelection(projectId, assetId, enabled);

  revalidatePath("/discover");
  revalidatePath(`/discover/${assetId}`);
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/draft`);

  redirect(redirectTo);
}

export async function saveDraftAction(formData: FormData) {
  assertWorkspaceWritable();
  const projectId = String(formData.get("projectId"));
  const content = String(formData.get("content") ?? "");

  await saveProjectDraft(projectId, content);

  revalidatePath(`/projects/${projectId}/draft`);
  redirect(`/projects/${projectId}/draft`);
}

export async function toggleFavoriteAssetAction(formData: FormData) {
  assertWorkspaceWritable();
  const assetId = String(formData.get("assetId"));
  const redirectTo = String(formData.get("redirectTo") ?? "/discover");

  await toggleFavoriteAsset(assetId);

  revalidatePath("/discover");
  revalidatePath(`/discover/${assetId}`);
  redirect(redirectTo);
}

export async function saveCompareSetAction(formData: FormData) {
  assertWorkspaceWritable();
  const redirectTo = String(formData.get("redirectTo") ?? "/discover");
  const projectId = String(formData.get("projectId") ?? "") || undefined;
  const assetIds = String(formData.get("assetIds") ?? "")
    .split(",")
    .map((assetId) => assetId.trim())
    .filter(Boolean);
  const name = String(formData.get("name") ?? "");
  const catalog = await loadCatalogAssets();

  await saveCompareSet({
    assetIds,
    projectId,
    name,
    catalog
  });

  revalidatePath("/discover");
  redirect(redirectTo);
}

export async function applyConfigurationPresetAction(formData: FormData) {
  assertWorkspaceWritable();
  const projectId = String(formData.get("projectId"));
  const presetId = String(formData.get("presetId"));
  const redirectTo = String(formData.get("redirectTo") ?? `/discover?projectId=${projectId}`);
  const presets = await loadConfigurationPresets();
  const preset = presets.find((candidate) => candidate.id === presetId);

  if (!preset) {
    throw new Error(`Unknown configuration preset: ${presetId}`);
  }

  await addProjectAssets(projectId, preset.assetIds);

  revalidatePath("/discover");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/draft`);
  redirect(redirectTo);
}

export async function updateFavoriteEntryAction(formData: FormData) {
  assertWorkspaceWritable();
  const assetId = String(formData.get("assetId"));
  const redirectTo = String(formData.get("redirectTo") ?? "/discover");
  const intent = String(formData.get("intent"));
  const label = String(formData.get("label") ?? "");
  const direction = String(formData.get("direction") ?? "up") as "up" | "down";

  await updateDiscoverPreferences((preferences) => {
    if (intent === "rename") {
      return renameFavoriteEntry(preferences, assetId, label);
    }

    if (intent === "move") {
      return reorderFavoriteEntries(preferences, assetId, direction);
    }

    return removeFavoriteEntry(preferences, assetId);
  });

  revalidatePath("/discover");
  redirect(redirectTo);
}

export async function updateCompareSetAction(formData: FormData) {
  assertWorkspaceWritable();
  const compareSetId = String(formData.get("compareSetId"));
  const redirectTo = String(formData.get("redirectTo") ?? "/discover");
  const intent = String(formData.get("intent"));
  const name = String(formData.get("name") ?? "");
  const direction = String(formData.get("direction") ?? "up") as "up" | "down";

  await updateDiscoverPreferences((preferences) => {
    if (intent === "rename") {
      return renameCompareSet(preferences, compareSetId, name);
    }

    if (intent === "move") {
      return reorderCompareSets(preferences, compareSetId, direction);
    }

    return removeCompareSet(preferences, compareSetId);
  });

  revalidatePath("/discover");
  redirect(redirectTo);
}

export async function updatePresetDisplayAction(formData: FormData) {
  assertWorkspaceWritable();
  const presetId = String(formData.get("presetId"));
  const redirectTo = String(formData.get("redirectTo") ?? "/discover");
  const intent = String(formData.get("intent"));
  const label = String(formData.get("label") ?? "");
  const direction = String(formData.get("direction") ?? "up") as "up" | "down";

  await updateDiscoverPreferences((preferences) => {
    if (intent === "rename") {
      return renamePresetDisplay(preferences, presetId, label);
    }

    if (intent === "move") {
      return reorderPresetDisplays(preferences, presetId, direction);
    }

    if (intent === "restore") {
      return setPresetDisplayHidden(preferences, presetId, false);
    }

    return setPresetDisplayHidden(preferences, presetId, true);
  });

  revalidatePath("/discover");
  redirect(redirectTo);
}

export async function batchUpdateDiscoverCollectionAction(formData: FormData) {
  assertWorkspaceWritable();
  const scope = String(formData.get("scope") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/discover");
  const ids = formData
    .getAll("ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!ids.length) {
    redirect(redirectTo);
  }

  await updateDiscoverPreferences((preferences) => {
    if (scope === "favorites") {
      if (intent === "promote") {
        return moveFavoriteEntriesToFront(preferences, ids);
      }

      return removeFavoriteEntries(preferences, ids);
    }

    if (scope === "compareSets") {
      if (intent === "promote") {
        return moveCompareSetsToFront(preferences, ids);
      }

      return removeCompareSets(preferences, ids);
    }

    if (scope === "presets") {
      if (intent === "promote") {
        return movePresetDisplaysToFront(preferences, ids);
      }

      if (intent === "restore") {
        return setPresetDisplaysHiddenBatch(preferences, ids, false);
      }

      return setPresetDisplaysHiddenBatch(preferences, ids, true);
    }

    return preferences;
  });

  revalidatePath("/discover");
  redirect(redirectTo);
}

export async function moveDiscoverCollectionItemAction(formData: FormData) {
  assertWorkspaceWritable();
  const scope = String(formData.get("scope") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const beforeId = String(formData.get("beforeId") ?? "");
  const undoBeforeId = String(formData.get("undoBeforeId") ?? "");
  const itemLabel = String(formData.get("itemLabel") ?? "item");
  const suppressToast = String(formData.get("suppressToast") ?? "") === "true";
  const redirectTo = String(formData.get("redirectTo") ?? "/discover");

  if (!scope || !itemId || itemId === beforeId || (!suppressToast && beforeId === undoBeforeId)) {
    redirect(redirectTo);
  }

  await updateDiscoverPreferences((preferences) => {
    if (scope === "favorites") {
      return moveFavoriteEntryBefore(preferences, itemId, beforeId);
    }

    if (scope === "compareSets") {
      return moveCompareSetBefore(preferences, itemId, beforeId);
    }

    if (scope === "presets") {
      return movePresetDisplayBefore(preferences, itemId, beforeId);
    }

    return preferences;
  });

  revalidatePath("/discover");

  if (suppressToast) {
    redirect(redirectTo);
  }

  const feedback = buildDiscoverReorderFeedback({
    scope: scope as "favorites" | "compareSets" | "presets",
    label: itemLabel,
    itemId,
    undoBeforeId
  });
  const url = new URL(redirectTo, "http://localhost:3000");
  url.searchParams.set("toastTitle", feedback.title);
  url.searchParams.set("toastDescription", feedback.description);
  url.searchParams.set("undoScope", feedback.undo.scope);
  url.searchParams.set("undoItemId", feedback.undo.itemId);
  url.searchParams.set("undoBeforeId", feedback.undo.beforeId);

  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}
