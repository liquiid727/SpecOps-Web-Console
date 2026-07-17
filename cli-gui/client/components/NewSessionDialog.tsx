import { useState, type FormEvent } from "react";
import type { CliProfile, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { Overlay } from "./ui/Overlay";

interface NewSessionDialogProps {
  profiles: CliProfile[];
  readonly: boolean;
  workspaces: Workspace[];
  onClose: () => void;
  onCreate: (input: { name: string; workspaceId: string; profileId: string }) => Promise<void>;
  onOpenSettings: () => void;
}

export function NewSessionDialog({ profiles, readonly, workspaces, onClose, onCreate, onOpenSettings }: NewSessionDialogProps) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", workspaceId: workspaces[0]?.id ?? "", profileId: profiles[0]?.id ?? "" });
  const [submitting, setSubmitting] = useState(false);
  const ready = workspaces.length > 0 && profiles.length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.workspaceId || !form.profileId) return;
    setSubmitting(true);
    try { await onCreate({ ...form, name: form.name.trim() }); } finally { setSubmitting(false); }
  }

  return <Overlay title={t("newCliSession")} description={t("newSessionDescription")} onClose={onClose}>
    {!ready ? <div className="setup-required"><div className="empty-icon"><Icon name="settings" /></div><strong>{t("setupFirst")}</strong><p>{t("setupFirstDescription")}</p><button className="primary-button" onClick={onOpenSettings}><Icon name="settings" />{t("openSettings")}</button></div> : <form className="dialog-form" onSubmit={submit}>
      <label><span>{t("sessionName")}</span><input autoFocus required placeholder="Backend refactor" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <div className="field-grid">
        <label><span>{t("workspace")}</span><select required value={form.workspaceId} onChange={(event) => setForm({ ...form, workspaceId: event.target.value })}>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
        <label><span>{t("cliProfile")}</span><select required value={form.profileId} onChange={(event) => setForm({ ...form, profileId: event.target.value })}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
      </div>
      <LaunchPreview workspace={workspaces.find((item) => item.id === form.workspaceId)} profile={profiles.find((item) => item.id === form.profileId)} />
      <footer className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>{t("cancel")}</button><button className="primary-button" disabled={readonly || submitting}>{submitting ? t("starting") : t("confirmAndStart")}</button></footer>
    </form>}
  </Overlay>;
}

function LaunchPreview({ workspace, profile }: { workspace?: Workspace; profile?: CliProfile }) {
  const { t } = useI18n();
  const command = profile ? [profile.command, ...profile.args].map((part) => JSON.stringify(part)).join(" ") : "—";
  return <div className="launch-preview"><span>{t("launchPreview")}</span><code>{command}</code><small>{workspace?.path ?? t("selectWorkspace")}</small></div>;
}
