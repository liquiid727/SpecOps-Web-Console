import { useState, type FormEvent } from "react";
import type { CliProfile, Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { Icon } from "./ui/Icon";
import { Overlay } from "./ui/Overlay";

interface WorkspaceProfileManagerProps {
  profiles: CliProfile[];
  readonly: boolean;
  sessions: Session[];
  workspaces: Workspace[];
  onClose: () => void;
  onCreateProfile: (input: { name: string; command: string; args: string[] }) => Promise<void>;
  onCreateWorkspace: (input: { name: string; path: string }) => Promise<void>;
  onOpenFolder: () => Promise<void>;
  onDeleteProfile: (profile: CliProfile) => void;
  onDeleteWorkspace: (workspace: Workspace) => void;
}

export function WorkspaceProfileManager(props: WorkspaceProfileManagerProps) {
  const { t } = useI18n();
  const [category, setCategory] = useState<"environment" | "appearance" | "runtime" | "about">("environment");
  const [workspaceForm, setWorkspaceForm] = useState({ name: "", path: "" });
  const [profileForm, setProfileForm] = useState({ name: "", command: "", args: "" });
  const [openingFolder, setOpeningFolder] = useState(false);

  async function submitWorkspace(event: FormEvent) {
    event.preventDefault();
    await props.onCreateWorkspace(workspaceForm);
    setWorkspaceForm({ name: "", path: "" });
  }

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    await props.onCreateProfile({ name: profileForm.name, command: profileForm.command, args: profileForm.args.split(" ").filter(Boolean) });
    setProfileForm({ name: "", command: "", args: "" });
  }

  const categories = [
    ["environment", t("settingsEnvironment")],
    ["appearance", t("settingsAppearance")],
    ["runtime", t("settingsRuntime")],
    ["about", t("settingsAbout")]
  ] as const;

  return <Overlay kind="drawer" title={t("workspaceSettings")} description={t("workspaceSettingsDescription")} onClose={props.onClose}>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label={t("settingsCategory")} role="tablist">
        {categories.map(([id, label]) => <button key={id} role="tab" data-settings-category={id} aria-selected={category === id} className={category === id ? "active" : ""} onClick={() => setCategory(id)}>{label}</button>)}
      </nav>
      <div className="settings-content">
        {category === "environment" ? <>
          <div className="settings-section">
            <div className="settings-heading"><div><span className="eyebrow">{t("projects").toUpperCase()}</span><h3>{t("projects")}</h3></div><span className="count-badge">{props.workspaces.length}</span></div>
            <button className="secondary-button open-folder-button" disabled={props.readonly || openingFolder} onClick={async () => { setOpeningFolder(true); try { await props.onOpenFolder(); } finally { setOpeningFolder(false); } }}><Icon name="folder" />{openingFolder ? t("working") : t("openFolder")}</button>
            <div className="resource-list">
              {props.workspaces.map((workspace) => {
                const inUse = props.sessions.some((session) => session.workspaceId === workspace.id);
                return <div className="resource-row" key={workspace.id}><div className="resource-icon"><Icon name="folder" /></div><div><strong>{workspace.name}</strong><small title={workspace.path}>{workspace.path}</small></div><button className="icon-button danger" onClick={() => props.onDeleteWorkspace(workspace)} disabled={props.readonly || inUse} aria-label={`${t("deleteWorkspace")} ${workspace.name}`} title={inUse ? t("deleteSessionsFirst") : t("deleteWorkspace")}><Icon name="trash" /></button></div>;
              })}
              {!props.workspaces.length && <p className="resource-empty">{t("noWorkspacesRegistered")}</p>}
            </div>
            <form className="compact-form" onSubmit={submitWorkspace}>
              <label><span>{t("name")}</span><input required placeholder="Payment platform" value={workspaceForm.name} onChange={(event) => setWorkspaceForm({ ...workspaceForm, name: event.target.value })} /></label>
              <label><span>{t("localPath")}</span><input required placeholder="/Users/me/project" value={workspaceForm.path} onChange={(event) => setWorkspaceForm({ ...workspaceForm, path: event.target.value })} /></label>
              <button className="primary-button" disabled={props.readonly}><Icon name="add" />{t("addWorkspace")}</button>
            </form>
          </div>

          <div className="settings-section">
            <div className="settings-heading"><div><span className="eyebrow">{t("launchers").toUpperCase()}</span><h3>{t("cliProfiles")}</h3></div><span className="count-badge">{props.profiles.length}</span></div>
            <div className="resource-list">
              {props.profiles.map((profile) => {
                const inUse = props.sessions.some((session) => session.profileId === profile.id);
                return <div className="resource-row" key={profile.id}><div className="resource-icon"><Icon name="terminal" /></div><div><strong>{profile.name}</strong><small className="mono">{[profile.command, ...profile.args].join(" ")}</small></div><button className="icon-button danger" onClick={() => props.onDeleteProfile(profile)} disabled={props.readonly || inUse} aria-label={`${t("deleteCliProfile")} ${profile.name}`} title={inUse ? t("deleteSessionsFirst") : t("deleteCliProfile")}><Icon name="trash" /></button></div>;
              })}
            </div>
            <form className="compact-form" onSubmit={submitProfile}>
              <label><span>{t("name")}</span><input required placeholder="Review Claude" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></label>
              <div className="field-grid"><label><span>{t("command")}</span><input required placeholder="claude" value={profileForm.command} onChange={(event) => setProfileForm({ ...profileForm, command: event.target.value })} /></label><label><span>{t("arguments")}</span><input placeholder="--model opus" value={profileForm.args} onChange={(event) => setProfileForm({ ...profileForm, args: event.target.value })} /></label></div>
              <button className="primary-button" disabled={props.readonly}><Icon name="add" />{t("saveProfile")}</button>
            </form>
          </div>
      </> : category === "appearance" ? <AppearanceSettings /> : <div className="settings-placeholder"><Icon name="info" /><strong>{categories.find(([id]) => id === category)?.[1]}</strong><p>{t("settingsPlaceholder")}</p></div>}
      </div>
    </div>
  </Overlay>;
}

function AppearanceSettings() {
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme, themes } = useTheme();
  return <div className="appearance-settings">
    <div className="settings-section">
      <div className="settings-heading"><div><span className="eyebrow">{t("settingsAppearance").toUpperCase()}</span><h3>{t("language")}</h3></div></div>
      <div className="theme-choice-list" role="radiogroup" aria-label={t("language")}>
        {(["en", "zh"] as const).map((value) => <button key={value} type="button" data-language-choice={value} role="radio" aria-checked={language === value} className={language === value ? "active" : ""} onClick={() => setLanguage(value)}>
          <span>{value === "en" ? t("languageEnglish") : t("languageChinese")}</span>
        </button>)}
      </div>
    </div>
    <div className="settings-section">
      <div className="settings-heading"><div><span className="eyebrow">{t("settingsAppearance").toUpperCase()}</span><h3>{t("theme")}</h3></div></div>
      <div className="theme-choice-list" role="radiogroup" aria-label={t("theme")}>
        {themes.map((option) => <button key={option.id} type="button" data-theme-choice={option.id} role="radio" aria-checked={theme === option.id} className={theme === option.id ? "active" : ""} onClick={() => setTheme(option.id)}>
          <span>{t(option.labelKey)}</span>
          <small>{t(option.id === "neo" ? "themeNeoDescription" : "themeClassicDescription")}</small>
        </button>)}
      </div>
    </div>
  </div>;
}
