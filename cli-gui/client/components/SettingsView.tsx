import { useEffect, useState } from "react";
import type { CliProfileV2, ProfileModelEntry } from "../../shared/types";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { detectShortcutPlatform, formatShortcut, SHORTCUT_CATEGORY_LABEL, SHORTCUTS, type ShortcutCategory } from "../app/shortcuts";
import { readPreferences, writePreferences, type CliMode } from "../app/preferences";
import { Icon } from "./ui/Icon";
import { Badge, Button, Select, TextField, useFeedback } from "./ui";
import { SettingsSection, ViewHeader } from "./patterns";
import { useClientRuntime } from "../runtime/client-runtime";

type SettingsTab = "account" | "models" | "mcp" | "shortcuts" | "security";

const tabs: { id: SettingsTab; label: string; icon: string }[] = [
  { id: "account", label: "qoderSettingsAccount", icon: "user" },
  { id: "models", label: "qoderSettingsModels", icon: "bot" },
  { id: "mcp", label: "qoderSettingsMcp", icon: "settings" },
  { id: "shortcuts", label: "qoderSettingsShortcuts", icon: "command" },
  { id: "security", label: "qoderSettingsSecurity", icon: "shield" }
];

const shortcutCategories: ShortcutCategory[] = ["navigation", "panels", "session", "composer"];

export function SettingsView() {
  const { t, language, setLanguage } = useI18n();
  const platform = useClientRuntime().platform;
  const shortcutPlatform = detectShortcutPlatform();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  return (
    <div className="settings-view">
      <ViewHeader title={<><Icon name="settings" />{t("qoderSettings")}</>} />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label={t("settingsCategory")}>
          {tabs.map((tab) => (
            <Button variant="ghost"
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon as "user" | "bot" | "settings" | "command" | "shield"} />
              {t(tab.label)}
            </Button>
          ))}
        </nav>
        <div className="settings-panel">
          {activeTab === "account" && (
            <>
              <SettingsSection title={t("qoderSettingsAccount")}>
                <p className="settings-description">{t("qoderAccountDescription")}</p>
                <div className="settings-credits">
                  <Icon name="sparkles" />
                  <div>
                    <strong>{t("qoderCredits")}</strong>
                    <span>1,200</span>
                  </div>
                </div>
                <p className="settings-description"><strong>{t("qoderPlatform")}:</strong> {platform.kind === "tauri" ? "Tauri" : "Web"}</p>
              </SettingsSection>
              {/* 界面语言（QA 调节）：默认中文，与标题栏 LanguageToggle 共享同一 localStorage 偏好 */}
              <SettingsSection title={t("languageSettingTitle")}>
                <p className="settings-description">{t("languageSettingDescription")}</p>
                <Select
                  ariaLabel={t("languageSettingTitle")}
                  className="language-select"
                  value={language}
                  options={[
                    { value: "zh", label: "中文" },
                    { value: "en", label: "English" }
                  ]}
                  onChange={(value) => setLanguage(value as "zh" | "en")}
                />
              </SettingsSection>
            </>
          )}
          {activeTab === "models" && (
            <>
              <CliModeSettings />
              <SettingsSection title={t("qoderSettingsModels")}>
                <p className="settings-description">{t("qoderModelsDescription")}</p>
                <ModelsSettings />
              </SettingsSection>
            </>
          )}
          {activeTab === "mcp" && (
            <SettingsSection title={t("qoderSettingsMcp")}>
              <p className="settings-description">{t("qoderMcpDescription")}</p>
              <h4>{t("qoderMcpSkills")}</h4>
            </SettingsSection>
          )}
          {activeTab === "shortcuts" && (
            <SettingsSection title={t("qoderSettingsShortcuts")}>
              <p className="settings-description">{t("shortcutsDescription")}</p>
              {/* 表格与 app/shortcuts.ts 定义同源，按平台展示 ⌘/Ctrl（console-gaps SPEC §4） */}
              {shortcutCategories.map((category) => (
                <div className="shortcuts-group" key={category}>
                  <h4>{t(SHORTCUT_CATEGORY_LABEL[category])}</h4>
                  <table className="shortcuts-table">
                    <thead><tr><th>{t("shortcutAction")}</th><th>{t("shortcutKeys")}</th></tr></thead>
                    <tbody>
                      {SHORTCUTS.filter((shortcut) => shortcut.category === category).map((shortcut) => (
                        <tr key={shortcut.id}><td>{t(shortcut.labelKey)}</td><td><kbd>{formatShortcut(shortcut.keys, shortcutPlatform)}</kbd></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </SettingsSection>
          )}
          {activeTab === "security" && (
            <SettingsSection title={t("qoderSettingsSecurity")}>
              <p className="settings-description">{t("qoderSecurityDescription")}</p>
              <p className="settings-description">{t("qoderSecuritySettingsDescription")}</p>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}

/** Settings > CLI Mode（issue-052，cli-structured-tui-adaptation spec §2.3）：auto / codex-cli / claude-cli，写入 UI preferences */
function CliModeSettings() {
  const { t } = useI18n();
  const [cliMode, setCliMode] = useState<CliMode>(() => readPreferences().cliMode);

  const changeMode = (value: string) => {
    const mode = value as CliMode;
    setCliMode(mode);
    // 快捷键（⌘⇧C/⌘⇧L）与设置页共享同一 localStorage 偏好；基于最新存储合并避免覆盖其它字段
    writePreferences({ ...readPreferences(), cliMode: mode });
  };

  return (
    <SettingsSection title={t("cliModeTitle")}>
      <p className="settings-description">{t("cliModeDescription")}</p>
      <Select
        ariaLabel={t("cliModeTitle")}
        className="cli-mode-select"
        value={cliMode}
        options={[
          { value: "auto", label: t("cliModeAuto") },
          { value: "codex-cli", label: t("cliModeCodex") },
          { value: "claude-cli", label: t("cliModeClaude") }
        ]}
        onChange={changeMode}
      />
    </SettingsSection>
  );
}

/** Settings > Models：三层来源合并列表 + Sync + 自定义导入（console-gaps SPEC §2.6） */
function ModelsSettings() {
  const { t } = useI18n();
  const feedback = useFeedback();
  const runtime = useClientRuntime();
  const [profiles, setProfiles] = useState<CliProfileV2[]>([]);
  const [readonly, setReadonly] = useState(false);
  const [models, setModels] = useState<Record<string, ProfileModelEntry[]>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const state = await runtime.sessions.state();
        if (cancelled) return;
        setProfiles(state.profiles);
        setReadonly(state.readonly);
        const loaded = await Promise.all(state.profiles.map(async (profile) => [profile.id, (await runtime.engines.profileModels(profile.id)).models ?? []] as const));
        if (cancelled) return;
        setModels(Object.fromEntries(loaded));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sync = async (profileId: string) => {
    setSyncing(profileId);
    try {
      const result = await runtime.engines.syncProfileModels(profileId);
      setModels((current) => ({ ...current, [profileId]: result.models ?? [] }));
      feedback.success({ title: t("modelsSyncDone"), description: t("modelsSyncCount", { count: (result.synced ?? []).length }) });
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t, "modelsSyncFailed", `models-sync:${profileId}`));
    } finally {
      setSyncing(null);
    }
  };

  const addModel = async (profileId: string) => {
    const model = (drafts[profileId] ?? "").trim();
    if (!model) return;
    try {
      const result = await runtime.engines.addProfileModel(profileId, model);
      setModels((current) => ({ ...current, [profileId]: result.models ?? [] }));
      setDrafts((current) => ({ ...current, [profileId]: "" }));
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t, "modelsAddFailed", `models-add:${profileId}`));
    }
  };

  const removeModel = async (profileId: string, model: string) => {
    try {
      const result = await runtime.engines.removeProfileModel(profileId, model);
      setModels((current) => ({ ...current, [profileId]: result.models ?? [] }));
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t, "modelsRemoveFailed", `models-remove:${profileId}`));
    }
  };

  if (status === "loading") return <p className="settings-description models-loading">{t("loading")}</p>;
  if (status === "error") return <p className="settings-description models-error" role="alert">{t("modelsLoadFailed")}</p>;
  if (!profiles.length) return <p className="settings-description models-empty">{t("modelsEmpty")}</p>;

  return (
    <div className="models-settings">
      {readonly && <p className="settings-description models-readonly">{t("modelsReadonly")}</p>}
      {profiles.map((profile) => (
        <div className="models-profile" key={profile.id} data-profile-id={profile.id}>
          <div className="models-profile-header">
            <h4>{profile.name}</h4>
            <Button variant="secondary" disabled={readonly || syncing === profile.id} onClick={() => void sync(profile.id)}>
              <Icon name="refresh" />
              {syncing === profile.id ? t("modelsSyncing") : t("modelsSyncButton")}
            </Button>
          </div>
          <ul className="models-list">
            {(models[profile.id] ?? []).map((entry) => (
              <li className="models-item" key={entry.id}>
                <span className="models-item-id">{entry.id}</span>
                <Badge className={`models-source models-source-${entry.source}`}>{t(entry.source === "builtin" ? "modelSourceBuiltin" : entry.source === "synced" ? "modelSourceSynced" : "modelSourceCustom")}</Badge>
                {entry.source === "custom" && !readonly && (
                  <Button variant="ghost" className="models-remove" aria-label={t("modelsRemove")} onClick={() => void removeModel(profile.id, entry.id)}>
                    <Icon name="trash" />
                  </Button>
                )}
              </li>
            ))}
            {!(models[profile.id] ?? []).length && <li className="models-item models-item-empty">{t("modelsNoneDetected")}</li>}
          </ul>
          {!readonly && (
            <form
              className="models-add"
              onSubmit={(event) => {
                event.preventDefault();
                void addModel(profile.id);
              }}
            >
              <TextField
                value={drafts[profile.id] ?? ""}
                maxLength={128}
                placeholder={t("modelsAddPlaceholder")}
                aria-label={t("modelsAddPlaceholder")}
                onChange={(event) => setDrafts((current) => ({ ...current, [profile.id]: event.target.value }))}
              />
              <Button type="submit" variant="secondary" disabled={!(drafts[profile.id] ?? "").trim()}>{t("modelsAddButton")}</Button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
