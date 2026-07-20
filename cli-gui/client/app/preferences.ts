export const preferencesKey = "product-ai-os-cli-gui-ui-preferences-v1";

export type SessionGrouping = "project" | "time" | "recent" | "manual";
export type SessionFilter = "active" | "completed" | "archived";
export type InspectorPreferenceTab = "details" | "preview" | "files" | "languages" | "diff" | "git";
export type CenterView = "transcript" | "terminal";

export interface UiPreferencesV1 {
  version: 1;
  navigatorOpen: boolean;
  inspectorOpen: boolean;
  sessionGrouping: SessionGrouping;
  sessionFilter: SessionFilter;
  inspectorTab: InspectorPreferenceTab;
  centerViewBySession: Record<string, CenterView>;
}

export const defaultPreferences: UiPreferencesV1 = {
  version: 1,
  navigatorOpen: true,
  inspectorOpen: false,
  sessionGrouping: "project",
  sessionFilter: "active",
  inspectorTab: "details",
  centerViewBySession: {}
};

export function parsePreferences(raw: string | null | undefined): UiPreferencesV1 {
  if (!raw) return cloneDefaults();
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value) || value.version !== 1 || typeof value.navigatorOpen !== "boolean" || typeof value.inspectorOpen !== "boolean" || !isGrouping(value.sessionGrouping) || !isFilter(value.sessionFilter) || !isInspectorTab(value.inspectorTab) || !isCenterViews(value.centerViewBySession)) return cloneDefaults();
    return {
      version: 1,
      navigatorOpen: value.navigatorOpen,
      inspectorOpen: value.inspectorOpen,
      sessionGrouping: value.sessionGrouping,
      sessionFilter: value.sessionFilter,
      inspectorTab: value.inspectorTab,
      centerViewBySession: { ...value.centerViewBySession }
    };
  } catch {
    return cloneDefaults();
  }
}

export function readPreferences(storage: Pick<Storage, "getItem"> | undefined = typeof window === "undefined" ? undefined : window.localStorage) {
  try {
    return parsePreferences(storage?.getItem(preferencesKey));
  } catch {
    return cloneDefaults();
  }
}

export function writePreferences(preferences: UiPreferencesV1, storage: Pick<Storage, "setItem"> | undefined = typeof window === "undefined" ? undefined : window.localStorage) {
  try {
    storage?.setItem(preferencesKey, JSON.stringify(preferences));
  } catch {
    // Browser storage is optional; UI state remains usable in memory.
  }
}

function cloneDefaults(): UiPreferencesV1 {
  return { ...defaultPreferences, centerViewBySession: {} };
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isGrouping(value: unknown): value is SessionGrouping {
  return value === "project" || value === "time" || value === "recent" || value === "manual";
}

function isFilter(value: unknown): value is SessionFilter {
  return value === "active" || value === "completed" || value === "archived";
}

function isInspectorTab(value: unknown): value is InspectorPreferenceTab {
  return value === "details" || value === "preview" || value === "files" || value === "languages" || value === "diff" || value === "git";
}

function isCenterViews(value: unknown): value is Record<string, CenterView> {
  return isRecord(value) && Object.entries(value).every(([key, view]) => Boolean(key) && (view === "transcript" || view === "terminal"));
}
