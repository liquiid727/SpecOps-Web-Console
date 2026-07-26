import { useState, type FormEvent } from "react";
import type { CliProfile, Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { Icon } from "./ui/Icon";
import { Overlay } from "./ui/Overlay";
import { Button, IconButton, Tabs, TextField } from "./ui";
import { ResourceRow, SettingsSection } from "./patterns";

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
      <Tabs className="settings-nav" ariaLabel={t("settingsCategory")} value={category} onChange={setCategory} items={categories.map(([id, label]) => ({ id, label, buttonProps: { "data-settings-category": id } }))} />
      <div className="settings-content">
        {category === "environment" ? <>
          <SettingsSection title={<span className="visually-hidden">{t("projects")}</span>}>
            <div className="settings-heading"><div><span className="eyebrow">{t("projects").toUpperCase()}</span><h3>{t("projects")}</h3></div><span className="count-badge">{props.workspaces.length}</span></div>
            <Button variant="secondary" className="secondary-button open-folder-button" disabled={props.readonly} loading={openingFolder} loadingLabel={t("working")} onClick={async () => { setOpeningFolder(true); try { await props.onOpenFolder(); } finally { setOpeningFolder(false); } }}><Icon name="folder" />{t("openFolder")}</Button>
            <div className="resource-list">
              {props.workspaces.map((workspace) => {
                const inUse = props.sessions.some((session) => session.workspaceId === workspace.id);
                return <ResourceRow key={workspace.id} icon={<div className="resource-icon"><Icon name="folder" /></div>} primary={workspace.name} secondary={<span title={workspace.path}>{workspace.path}</span>} actions={<IconButton className="danger" icon="trash" onClick={() => props.onDeleteWorkspace(workspace)} disabled={props.readonly || inUse} label={`${t("deleteWorkspace")} ${workspace.name}`} title={inUse ? t("deleteSessionsFirst") : t("deleteWorkspace")} />} />;
              })}
              {!props.workspaces.length && <p className="resource-empty">{t("noWorkspacesRegistered")}</p>}
            </div>
            <form className="compact-form" onSubmit={submitWorkspace}>
              <TextField label={t("name")} required placeholder="Payment platform" value={workspaceForm.name} onChange={(event) => setWorkspaceForm({ ...workspaceForm, name: event.target.value })} />
              <TextField label={t("localPath")} required placeholder="/Users/me/project" value={workspaceForm.path} onChange={(event) => setWorkspaceForm({ ...workspaceForm, path: event.target.value })} />
              <Button type="submit" variant="primary" className="primary-button" disabled={props.readonly}><Icon name="add" />{t("addWorkspace")}</Button>
            </form>
          </SettingsSection>

          <SettingsSection title={<span className="visually-hidden">{t("cliProfiles")}</span>}>
            <div className="settings-heading"><div><span className="eyebrow">{t("launchers").toUpperCase()}</span><h3>{t("cliProfiles")}</h3></div><span className="count-badge">{props.profiles.length}</span></div>
            <div className="resource-list">
              {props.profiles.map((profile) => {
                const inUse = props.sessions.some((session) => session.profileId === profile.id);
                return <ResourceRow key={profile.id} icon={<div className="resource-icon"><Icon name="terminal" /></div>} primary={profile.name} secondary={<span className="mono">{[profile.command, ...profile.args].join(" ")}</span>} actions={<IconButton className="danger" icon="trash" onClick={() => props.onDeleteProfile(profile)} disabled={props.readonly || inUse} label={`${t("deleteCliProfile")} ${profile.name}`} title={inUse ? t("deleteSessionsFirst") : t("deleteCliProfile")} />} />;
              })}
            </div>
            <form className="compact-form" onSubmit={submitProfile}>
              <TextField label={t("name")} required placeholder="Review Claude" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} />
              <div className="field-grid"><TextField label={t("command")} required placeholder="claude" value={profileForm.command} onChange={(event) => setProfileForm({ ...profileForm, command: event.target.value })} /><TextField label={t("arguments")} placeholder="--model opus" value={profileForm.args} onChange={(event) => setProfileForm({ ...profileForm, args: event.target.value })} /></div>
              <Button type="submit" variant="primary" className="primary-button" disabled={props.readonly}><Icon name="add" />{t("saveProfile")}</Button>
            </form>
          </SettingsSection>
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
        {(["en", "zh"] as const).map((value) => <Button variant="ghost" key={value} data-language-choice={value} role="radio" aria-checked={language === value} className={language === value ? "active" : ""} onClick={() => setLanguage(value)}>
          <span>{value === "en" ? t("languageEnglish") : t("languageChinese")}</span>
        </Button>)}
      </div>
    </div>
    <div className="settings-section">
      <div className="settings-heading"><div><span className="eyebrow">{t("settingsAppearance").toUpperCase()}</span><h3>{t("theme")}</h3></div></div>
      <div className="theme-choice-list" role="radiogroup" aria-label={t("theme")}>
        {themes.map((option) => <Button variant="ghost" key={option.id} data-theme-choice={option.id} role="radio" aria-checked={theme === option.id} className={theme === option.id ? "active" : ""} onClick={() => setTheme(option.id)}>
          <span>{t(option.labelKey)}</span>
          <small>{t(option.id === "qoder-light" ? "themeQoderLightDescription" : option.id === "neo" ? "themeNeoDescription" : "themeClassicDescription")}</small>
        </Button>)}
      </div>
    </div>
  </div>;
}
