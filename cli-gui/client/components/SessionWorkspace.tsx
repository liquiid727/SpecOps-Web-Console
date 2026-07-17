import type { CliProfile, Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { TerminalView } from "../terminal";
import { Icon } from "./ui/Icon";
import { StatusBadge } from "./StatusBadge";

interface SessionWorkspaceProps {
  profile?: CliProfile;
  readonly: boolean;
  session?: Session;
  workspace?: Workspace;
  onNewSession: () => void;
  onOpenInspector: () => void;
  onResume: () => void;
  onStatus: () => void;
  onStop: () => void;
}

export function SessionWorkspace({ profile, readonly, session, workspace, onNewSession, onOpenInspector, onResume, onStatus, onStop }: SessionWorkspaceProps) {
  const { statusLabel, t } = useI18n();
  return <section className="session-workspace">
    <header className="workspace-toolbar">
      <div className="workspace-title-block">
        <div className="workspace-title-row"><h1>{session?.name ?? t("cliWorkspace")}</h1>{session && <StatusBadge status={session.status} />}</div>
        <p>{session ? `${profile?.name ?? t("profileFallback")} · ${workspace?.name ?? t("unknownWorkspace")}` : t("runNativeTerminal")}</p>
      </div>
      <div className="workspace-actions">
        {readonly && <span className="readonly-label">{t("readonly")}</span>}
        {!session && <button className="primary-button" onClick={onNewSession} disabled={readonly}><Icon name="add" />{t("newSession")}</button>}
        {session?.status === "running" && <button className="secondary-button" onClick={onStop}><Icon name="stop" />{t("stop")}</button>}
        {session && session.status !== "running" && <button className="primary-button" onClick={onResume} disabled={readonly}><Icon name="play" />{t("resume")}</button>}
        {session && <button className="icon-button" onClick={onOpenInspector} aria-label={t("openSessionDetails")} title={t("sessionDetails")}><Icon name="panel" /></button>}
      </div>
    </header>
    <div className="terminal-surface">
      <div className="terminal-chrome"><span className="terminal-label"><Icon name="terminal" />{t("terminal")}</span><span>{workspace?.path ?? "127.0.0.1"}</span></div>
      {session?.status === "running" ? <TerminalView sessionId={session.id} onStatus={onStatus} /> : <EmptyWorkspace session={session} onNewSession={onNewSession} readonly={readonly} statusText={session ? statusLabel(session.status) : undefined} />}
    </div>
  </section>;
}

function EmptyWorkspace({ session, onNewSession, readonly, statusText }: { session?: Session; onNewSession: () => void; readonly: boolean; statusText?: string }) {
  const { t } = useI18n();
  const error = session?.status === "error";
  return <div className={`empty-workspace ${error ? "error" : ""}`}>
    <div className="empty-icon"><Icon name={error ? "info" : "terminal"} /></div>
    <strong>{session ? (error ? t("sessionStoppedWithError") : t("sessionIsStatus", { status: statusText })) : t("startFirstSession")}</strong>
    <p>{session ? session.error ?? t("resumeFreshPty") : t("startFirstSessionDescription")}</p>
    {!session && <button className="primary-button" onClick={onNewSession} disabled={readonly}><Icon name="add" />{t("newSession")}</button>}
  </div>;
}
