import { useEffect, useState, type FormEvent } from "react";
import type { CliProfile, CliProfileCapabilities, Workspace } from "../../shared/types";
import { api } from "../api";
import { CHAT_INTERACTION_ENABLED } from "../app/feature-flags";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { Overlay } from "./ui/Overlay";
import { Select } from "./ui/Select";
import { Button, EmptyState, TextField } from "./ui";
import { DialogActions } from "./patterns";

interface NewSessionDialogProps {
  profiles: CliProfile[];
  readonly: boolean;
  workspaces: Workspace[];
  onClose: () => void;
  onCreate: (input: { name: string; workspaceId: string; profileId: string; interactionMode: "chat" | "terminal" }) => Promise<void>;
  onOpenSettings: () => void;
  /** 新建入口默认 chat（Quest/Chat 均为对话会话）；用户可手动改选 terminal */
  defaultMode?: "chat" | "terminal";
  /** capability 加载入口（默认 api.profileCapabilities；测试可注入，frontend-spec §6） */
  loadCapabilities?: (profileId: string, signal?: AbortSignal) => Promise<CliProfileCapabilities>;
}

export function NewSessionDialog({ profiles, readonly, workspaces, onClose, onCreate, onOpenSettings, defaultMode = "chat", loadCapabilities = api.profileCapabilities }: NewSessionDialogProps) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", workspaceId: workspaces[0]?.id ?? "", profileId: profiles[0]?.id ?? "" });
  const [mode, setMode] = useState<"chat" | "terminal">(defaultMode);
  const [capabilities, setCapabilities] = useState<CliProfileCapabilities>();
  const [submitting, setSubmitting] = useState(false);
  const ready = workspaces.length > 0 && profiles.length > 0;
  // chat 功能开关关闭 → 全局锁定 terminal（console-gaps SPEC §1）；否则按 capability 锁定：
  // 所选 Profile 不支持 headless → 模式锁定 terminal 并展示降级说明；加载失败保持可选，以服务端结果为准（frontend-spec §6）
  const chatLocked = !CHAT_INTERACTION_ENABLED || capabilities?.supportsHeadlessTurns === false;
  const effectiveMode = chatLocked ? "terminal" : mode;

  useEffect(() => {
    if (!form.profileId) { setCapabilities(undefined); return; }
    const controller = new AbortController();
    setCapabilities(undefined);
    loadCapabilities(form.profileId, controller.signal).then((next) => { if (!controller.signal.aborted) setCapabilities(next); }).catch(() => undefined);
    return () => controller.abort();
  }, [form.profileId, loadCapabilities]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.workspaceId || !form.profileId) return;
    // 名称可选：留空时用「工作区名 + 时间」自动生成，免去每次手动输入
    const workspaceName = workspaces.find((item) => item.id === form.workspaceId)?.name;
    const name = form.name.trim() || generateSessionName(workspaceName || t("newCliSession"));
    setSubmitting(true);
    try { await onCreate({ ...form, name, interactionMode: effectiveMode }); } finally { setSubmitting(false); }
  }

  return <Overlay title={t("newCliSession")} description={t("newSessionDescription")} onClose={onClose}>
    {!ready ? <EmptyState className="setup-required" icon={<div className="empty-icon"><Icon name="settings" /></div>} title={t("setupFirst")} description={t("setupFirstDescription")} actions={<Button variant="primary" className="primary-button" onClick={onOpenSettings}><Icon name="settings" />{t("openSettings")}</Button>} /> : <form className="dialog-form" onSubmit={submit}>
      <TextField autoFocus label={t("sessionName")} placeholder={t("sessionNameOptionalPlaceholder")} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <div className="field-grid">
        <label><span>{t("workspace")}</span><Select ariaLabel={t("workspace")} value={form.workspaceId} options={workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name }))} onChange={(workspaceId) => setForm({ ...form, workspaceId })} /></label>
        <label><span>{t("cliProfile")}</span><Select ariaLabel={t("cliProfile")} value={form.profileId} options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))} onChange={(profileId) => setForm({ ...form, profileId })} /></label>
      </div>
      <label className="interaction-mode-field"><span>{t("interactionModeLabel")}</span><Select ariaLabel={t("interactionModeLabel")} value={effectiveMode} disabled={chatLocked} options={[{ value: "chat", label: t("interactionModeChat") }, { value: "terminal", label: t("interactionModeTerminal") }]} onChange={(next) => setMode(next as "chat" | "terminal")} /></label>
      {chatLocked && <small className="interaction-mode-locked">{t(CHAT_INTERACTION_ENABLED ? "interactionModeLocked" : "chatTemporarilyDisabled")}</small>}
      <LaunchPreview workspace={workspaces.find((item) => item.id === form.workspaceId)} profile={profiles.find((item) => item.id === form.profileId)} />
      <DialogActions><Button variant="secondary" className="secondary-button" onClick={onClose}>{t("cancel")}</Button><Button type="submit" variant="primary" className="primary-button" disabled={readonly} loading={submitting} loadingLabel={t("starting")}>{t("confirmAndStart")}</Button></DialogActions>
    </form>}
  </Overlay>;
}

/** 自动会话名：「前缀 MM-DD HH:mm」，保证非空且可区分 */
function generateSessionName(prefix: string) {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${prefix} ${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function LaunchPreview({ workspace, profile }: { workspace?: Workspace; profile?: CliProfile }) {
  const { t } = useI18n();
  const command = profile ? [profile.command, ...profile.args].map((part) => JSON.stringify(part)).join(" ") : "—";
  return <div className="launch-preview"><span>{t("launchPreview")}</span><code>{command}</code><small>{workspace?.path ?? t("selectWorkspace")}</small></div>;
}
