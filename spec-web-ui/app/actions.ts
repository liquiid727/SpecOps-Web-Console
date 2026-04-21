"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  generateExportBundle,
  updateExportReviewDecision,
  updateExportReviewNote,
  updateExportReviewTodo
} from "@/lib/export";
import { loadCatalogAssets } from "@/lib/catalog";
import {
  buildDiscoverReorderFeedback,
  loadPresetBundles,
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
} from "@/lib/discover";
import {
  addProjectAssets,
  createProject,
  saveProjectDraft,
  updateProjectAssetSelection
} from "@/lib/projects";

export async function createProjectAction(formData: FormData) {
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
  revalidatePath(`/projects/${projectId}/exports`);

  redirect(redirectTo);
}

export async function saveDraftAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const content = String(formData.get("content") ?? "");

  await saveProjectDraft(projectId, content);

  revalidatePath(`/projects/${projectId}/draft`);
  redirect(`/projects/${projectId}/draft`);
}

export async function generateExportAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));

  await generateExportBundle(projectId);

  revalidatePath("/exports");
  revalidatePath(`/projects/${projectId}/exports`);
  redirect(`/projects/${projectId}/exports`);
}

export async function toggleFavoriteAssetAction(formData: FormData) {
  const assetId = String(formData.get("assetId"));
  const redirectTo = String(formData.get("redirectTo") ?? "/discover");

  await toggleFavoriteAsset(assetId);

  revalidatePath("/discover");
  revalidatePath(`/discover/${assetId}`);
  redirect(redirectTo);
}

export async function saveCompareSetAction(formData: FormData) {
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

export async function applyPresetBundleAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const presetId = String(formData.get("presetId"));
  const redirectTo = String(formData.get("redirectTo") ?? `/discover?projectId=${projectId}`);
  const presetBundles = await loadPresetBundles();
  const preset = presetBundles.find((bundle) => bundle.id === presetId);

  if (!preset) {
    throw new Error(`Unknown preset bundle: ${presetId}`);
  }

  await addProjectAssets(projectId, preset.assetIds);

  revalidatePath("/discover");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/draft`);
  revalidatePath(`/projects/${projectId}/exports`);
  redirect(redirectTo);
}

export async function updateFavoriteEntryAction(formData: FormData) {
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

export async function setExportReviewDecisionAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? `/projects/${projectId}/exports`);
  const decision = String(formData.get("decision") ?? "pending") as
    | "pending"
    | "accepted"
    | "needs_work"
    | "blocked";
  const targetPaths = formData
    .getAll("targetPath")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!projectId || !targetPaths.length) {
    redirect(redirectTo);
  }

  await updateExportReviewDecision(projectId, targetPaths, decision);

  revalidatePath(`/projects/${projectId}/exports`);
  redirect(redirectTo);
}

export async function moveDiscoverCollectionItemAction(formData: FormData) {
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

export async function saveExportReviewNoteAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const targetPath = String(formData.get("targetPath") ?? "");
  const note = String(formData.get("note") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? `/projects/${projectId}/exports`);

  if (!projectId || !targetPath) {
    redirect(redirectTo);
  }

  await updateExportReviewNote(projectId, targetPath, note);

  revalidatePath(`/projects/${projectId}/exports`);
  redirect(redirectTo);
}

export async function toggleExportReviewTodoAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const targetPath = String(formData.get("targetPath") ?? "");
  const itemIndex = Number(formData.get("itemIndex") ?? -1);
  const checked = String(formData.get("checked") ?? "false") === "true";
  const redirectTo = String(formData.get("redirectTo") ?? `/projects/${projectId}/exports`);

  if (!projectId || !targetPath || Number.isNaN(itemIndex) || itemIndex < 0) {
    redirect(redirectTo);
  }

  await updateExportReviewTodo(projectId, targetPath, itemIndex, checked);

  revalidatePath(`/projects/${projectId}/exports`);
  redirect(redirectTo);
}
