import { useState, type FormEvent } from "react";
import type { CliProfile, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { Overlay } from "./ui/Overlay";
import { Select } from "./ui/Select";

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
        <label><span>{t("workspace")}</span><Select ariaLabel={t("workspace")} value={form.workspaceId} options={workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name }))} onChange={(workspaceId) => setForm({ ...form, workspaceId })} /></label>
        <label><span>{t("cliProfile")}</span><Select ariaLabel={t("cliProfile")} value={form.profileId} options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))} onChange={(profileId) => setForm({ ...form, profileId })} /></label>
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
