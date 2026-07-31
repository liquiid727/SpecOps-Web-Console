import type { TranslationKey } from "../i18n";

/**
 * 快捷键单一定义源（console-gaps SPEC §4，落实 workbench US-024 Shortcuts 分类）。
 * App.tsx 的全局监听与设置页 Shortcuts 表格均消费此清单；
 * composer 的 Enter / Shift+Enter 保持组件内实现，仅入表展示（display: true 之外无行为绑定）。
 */
export type ShortcutCategory = "navigation" | "panels" | "session" | "composer";

/** "Mod" = ⌘（mac）/ Ctrl（其它平台）；"Ctrl" 为字面 Ctrl（Ctrl+Tab 系列跨平台一致） */
export interface ShortcutDefinition {
  id: string;
  keys: string[];
  labelKey: TranslationKey;
  category: ShortcutCategory;
  /** 仅展示于设置表格，不参与全局 keydown 匹配（组件内自带实现） */
  displayOnly?: boolean;
}

export const SHORTCUTS: ShortcutDefinition[] = [
  { id: "toggle-navigator", keys: ["Mod", "B"], labelKey: "shortcutToggleNavigator", category: "panels" },
  { id: "toggle-inspector", keys: ["Mod", "J"], labelKey: "shortcutToggleInspector", category: "panels" },
  { id: "toggle-inspector-alt", keys: ["Mod", "Shift", "I"], labelKey: "shortcutToggleInspectorAlt", category: "panels" },
  { id: "new-session", keys: ["Mod", "N"], labelKey: "shortcutNewSession", category: "session" },
  { id: "cli-mode-codex", keys: ["Mod", "Shift", "C"], labelKey: "shortcutCliModeCodex", category: "session" },
  { id: "cli-mode-claude", keys: ["Mod", "Shift", "L"], labelKey: "shortcutCliModeClaude", category: "session" },
  { id: "view-quest-home", keys: ["Mod", "1"], labelKey: "shortcutViewQuestHome", category: "navigation" },
  { id: "view-chat", keys: ["Mod", "2"], labelKey: "shortcutViewChat", category: "navigation" },
  { id: "view-knowledge", keys: ["Mod", "3"], labelKey: "shortcutViewKnowledge", category: "navigation" },
  { id: "view-marketplace", keys: ["Mod", "4"], labelKey: "shortcutViewMarketplace", category: "navigation" },
  { id: "view-settings", keys: ["Mod", "5"], labelKey: "shortcutViewSettings", category: "navigation" },
  { id: "work-mode-next", keys: ["Ctrl", "Tab"], labelKey: "shortcutWorkModeNext", category: "composer" },
  { id: "work-mode-previous", keys: ["Ctrl", "Shift", "Tab"], labelKey: "shortcutWorkModePrevious", category: "composer" },
  { id: "send-prompt", keys: ["Enter"], labelKey: "shortcutSendPrompt", category: "composer", displayOnly: true },
  { id: "insert-newline", keys: ["Shift", "Enter"], labelKey: "shortcutInsertNewline", category: "composer", displayOnly: true }
];

export const SHORTCUT_CATEGORY_LABEL: Record<ShortcutCategory, TranslationKey> = {
  navigation: "shortcutCategoryNavigation",
  panels: "shortcutCategoryPanels",
  session: "shortcutCategorySession",
  composer: "shortcutCategoryComposer"
};

const byId = new Map(SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]));

export function getShortcut(id: string): ShortcutDefinition {
  const shortcut = byId.get(id);
  if (!shortcut) throw new Error(`unknown shortcut: ${id}`);
  return shortcut;
}

/**
 * 严格修饰键匹配：keys 未声明的修饰键必须未按下（⌘⇧B 不触发 ⌘B）。
 * "Mod" 接受 meta 或 ctrl；字面 "Ctrl" 要求 ctrlKey 且非 metaKey。
 */
export function matchesShortcut(event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">, id: string): boolean {
  const shortcut = getShortcut(id);
  if (shortcut.displayOnly) return false;
  const modifiers = new Set(shortcut.keys.slice(0, -1));
  const mainKey = shortcut.keys[shortcut.keys.length - 1];
  if (event.key.toLowerCase() !== mainKey.toLowerCase()) return false;
  if (modifiers.has("Mod") ? !(event.metaKey || event.ctrlKey) : modifiers.has("Ctrl") ? !(event.ctrlKey && !event.metaKey) : event.metaKey || event.ctrlKey) return false;
  if (modifiers.has("Shift") !== event.shiftKey) return false;
  if (event.altKey) return false;
  return true;
}

/** 设置表格展示：mac 用 ⌘/⇧/⌃ 符号紧排，其它平台用 Ctrl/Shift + 号连接 */
export function formatShortcut(keys: string[], platform: "mac" | "other"): string {
  if (platform === "mac") {
    return keys.map((key) => key === "Mod" ? "⌘" : key === "Shift" ? "⇧" : key === "Ctrl" ? "⌃" : key).join("");
  }
  return keys.map((key) => (key === "Mod" ? "Ctrl" : key)).join("+");
}

export function detectShortcutPlatform(): "mac" | "other" {
  if (typeof navigator === "undefined") return "other";
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? "mac" : "other";
}
