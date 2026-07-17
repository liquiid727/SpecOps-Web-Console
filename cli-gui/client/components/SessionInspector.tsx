import type { CliProfile, Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { StatusBadge } from "./StatusBadge";

interface SessionInspectorProps {
  profile?: CliProfile;
  readonly: boolean;
  session: Session;
  workspace?: Workspace;
  onClose: () => void;
  onDelete: () => void;
  onRename: () => void;
}

export function SessionInspector({ profile, readonly, session, workspace, onClose, onDelete, onRename }: SessionInspectorProps) {
  const { language, t } = useI18n();
  const command = profile ? [profile.command, ...profile.args].map((part) => JSON.stringify(part)).join(" ") : "—";
  return <aside className="session-inspector" aria-label={t("sessionInspector")}>
    <header className="inspector-header"><div><span className="eyebrow">{t("session").toUpperCase()}</span><h2>{t("details")}</h2></div><button className="icon-button" onClick={onClose} aria-label={t("closeSessionDetails")}><Icon name="close" /></button></header>
    <div className="inspector-content">
      <div className="inspector-summary"><div className="session-avatar"><Icon name="terminal" /></div><div><strong>{session.name}</strong><StatusBadge status={session.status} /></div></div>
      <Detail label={t("cliProfile")} value={profile?.name ?? t("unknownProfile")} />
      <Detail label={t("command")} value={command} mono />
      <Detail label={t("workspace")} value={workspace?.name ?? t("unknownWorkspace")} />
      <Detail label={t("directory")} value={workspace?.path ?? "—"} mono />
      <Detail label={t("created")} value={formatDate(session.createdAt, language)} />
      <Detail label={t("lastActive")} value={formatDate(session.lastActiveAt, language)} />
      {session.exitCode !== undefined && <Detail label={t("exitCode")} value={String(session.exitCode)} mono />}
      {session.error && <div className="session-error"><span>{t("error")}</span><p>{session.error}</p></div>}
    </div>
    <footer className="inspector-actions">
      <button className="secondary-button" onClick={onRename}>{t("rename")}</button>
      <button className="danger-button" onClick={onDelete} disabled={readonly}><Icon name="trash" />{t("deleteSession")}</button>
    </footer>
  </aside>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="detail-row"><span>{label}</span><strong className={mono ? "mono" : ""}>{value}</strong></div>;
}

function formatDate(value: string, language: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
