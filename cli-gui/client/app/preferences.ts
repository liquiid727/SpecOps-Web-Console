export const preferencesKey = "product-ai-os-cli-gui-ui-preferences-v1";

export type SessionGrouping = "project" | "time" | "recent" | "manual";
export type SessionFilter = "active" | "completed" | "archived";
export type InspectorPreferenceTab = "details" | "preview" | "files" | "languages" | "diff" | "git";
export type CenterView = "transcript" | "terminal";
export type AppView = "quest-home" | "chat" | "quests" | "knowledge" | "marketplace" | "settings";
export type RightPanelTab = "summary" | "terminal" | "files";
/** Persisted union keeps old values readable; MVP02 exposes only real modes. */
export type ComposerWorkMode = "default" | "spec" | "goal" | "plan";
/** CLI 模式（cli-structured-tui-adaptation spec §2）：auto 跟随 profile，否则强制 Codex/Claude 协议偏好 */
export type CliMode = "auto" | "codex-cli" | "claude-cli";

export const WORK_MODES: ComposerWorkMode[] = ["default", "plan"];

/** Ctrl+Tab 正向 / Ctrl+Shift+Tab 反向循环 */
export function cycleWorkMode(mode: ComposerWorkMode, delta: 1 | -1): ComposerWorkMode {
  const index = WORK_MODES.indexOf(mode);
  return WORK_MODES[(index + delta + WORK_MODES.length) % WORK_MODES.length];
}

export interface ModelPreferences {
  lastUsedModel: Record<string, string>;
}

export interface UiPreferencesV1 {
  version: 1;
  navigatorOpen: boolean;
  inspectorOpen: boolean;
  sessionGrouping: SessionGrouping;
  sessionFilter: SessionFilter;
  inspectorTab: InspectorPreferenceTab;
  centerViewBySession: Record<string, CenterView>;
  currentView: AppView;
  rightPanelTab: RightPanelTab;
  composerWorkMode: ComposerWorkMode;
  cliMode: CliMode;
  modelPreferences: ModelPreferences;
}

export const defaultPreferences: UiPreferencesV1 = {
  version: 1,
  navigatorOpen: true,
  inspectorOpen: false,
  sessionGrouping: "project",
  sessionFilter: "active",
  inspectorTab: "details",
  centerViewBySession: {},
  currentView: "quest-home",
  rightPanelTab: "summary",
  composerWorkMode: "default",
  cliMode: "auto",
  modelPreferences: { lastUsedModel: {} }
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
      centerViewBySession: { ...value.centerViewBySession },
      currentView: isAppView(value.currentView) ? value.currentView : "quest-home",
      rightPanelTab: isRightPanelTab(value.rightPanelTab) ? value.rightPanelTab : "summary",
      composerWorkMode: isWorkMode(value.composerWorkMode) ? value.composerWorkMode : "default",
      cliMode: isCliMode(value.cliMode) ? value.cliMode : "auto",
      modelPreferences: isModelPreferences(value.modelPreferences) ? value.modelPreferences : { lastUsedModel: {} }
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
  return { ...defaultPreferences, centerViewBySession: {}, modelPreferences: { lastUsedModel: {} } };
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

function isAppView(value: unknown): value is AppView {
  return value === "quest-home" || value === "chat" || value === "quests" || value === "knowledge" || value === "marketplace" || value === "settings";
}

function isRightPanelTab(value: unknown): value is RightPanelTab {
  return value === "summary" || value === "terminal" || value === "files";
}

function isWorkMode(value: unknown): value is ComposerWorkMode {
  return WORK_MODES.includes(value as ComposerWorkMode);
}

function isCliMode(value: unknown): value is CliMode {
  return value === "auto" || value === "codex-cli" || value === "claude-cli";
}

function isModelPreferences(value: unknown): value is ModelPreferences {
  return isRecord(value) && isRecord(value.lastUsedModel);
}
