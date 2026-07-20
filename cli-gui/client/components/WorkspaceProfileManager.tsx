import { useState, type FormEvent } from "react";
import type { CliProfile, Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
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

  return <Overlay kind="drawer" title={t("workspaceSettings")} description={t("workspaceSettingsDescription")} onClose={props.onClose}>
    <div className="settings-section">
      <div className="settings-heading"><div><span className="eyebrow">{t("projects").toUpperCase()}</span><h3>{t("workspaces")}</h3></div><span className="count-badge">{props.workspaces.length}</span></div>
      <button className="secondary-button open-folder-button" disabled={props.readonly || openingFolder} onClick={async () => { setOpeningFolder(true); try { await props.onOpenFolder(); } finally { setOpeningFolder(false); } }}><Icon name="folder" />{openingFolder ? t("working") : t("openFolder")}</button>
      <div className="resource-list">
        {props.workspaces.map((workspace) => { const inUse = props.sessions.some((session) => session.workspaceId === workspace.id); return <div className="resource-row" key={workspace.id}><div className="resource-icon"><Icon name="folder" /></div><div><strong>{workspace.name}</strong><small title={workspace.path}>{workspace.path}</small></div><button className="icon-button danger" onClick={() => props.onDeleteWorkspace(workspace)} disabled={props.readonly || inUse} aria-label={`${t("deleteWorkspace")} ${workspace.name}`} title={inUse ? t("deleteSessionsFirst") : t("deleteWorkspace")}><Icon name="trash" /></button></div>; })}
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
        {props.profiles.map((profile) => { const inUse = props.sessions.some((session) => session.profileId === profile.id); return <div className="resource-row" key={profile.id}><div className="resource-icon"><Icon name="terminal" /></div><div><strong>{profile.name}</strong><small className="mono">{[profile.command, ...profile.args].join(" ")}</small></div><button className="icon-button danger" onClick={() => props.onDeleteProfile(profile)} disabled={props.readonly || inUse} aria-label={`${t("deleteCliProfile")} ${profile.name}`} title={inUse ? t("deleteSessionsFirst") : t("deleteCliProfile")}><Icon name="trash" /></button></div>; })}
      </div>
      <form className="compact-form" onSubmit={submitProfile}>
        <label><span>{t("name")}</span><input required placeholder="Review Claude" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></label>
        <div className="field-grid"><label><span>{t("command")}</span><input required placeholder="claude" value={profileForm.command} onChange={(event) => setProfileForm({ ...profileForm, command: event.target.value })} /></label><label><span>{t("arguments")}</span><input placeholder="--model opus" value={profileForm.args} onChange={(event) => setProfileForm({ ...profileForm, args: event.target.value })} /></label></div>
        <button className="primary-button" disabled={props.readonly}><Icon name="add" />{t("saveProfile")}</button>
      </form>
    </div>
  </Overlay>;
}
