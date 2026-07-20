import { useState } from "react";
import type { Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

interface SessionNavigatorProps {
  activeSessionId?: string;
  groups: Array<{ workspace: Workspace; sessions: Session[] }>;
  onArchive: (session: Session) => void;
  onComplete: (session: Session) => void;
  onFork: (session: Session) => void;
  onPin: (session: Session) => void;
  onNewSession: () => void;
  onSelect: (id: string) => void;
}

export function SessionNavigator({ activeSessionId, groups, onArchive, onComplete, onFork, onNewSession, onPin, onSelect }: SessionNavigatorProps) {
  const { statusLabel, t } = useI18n();
  const [menuSession, setMenuSession] = useState<Session>();
  const sessionCount = groups.reduce((count, group) => count + group.sessions.length, 0);
  function action(handler: (session: Session) => void) {
    return () => {
      if (menuSession) handler(menuSession);
      setMenuSession(undefined);
    };
  }
  return <nav id="session-navigator" className="session-navigator" aria-label={t("sessions")} onKeyDown={(event) => { if (event.key === "Escape") setMenuSession(undefined); }}>
    <header className="navigator-header">
      <div><span className="eyebrow">{t("workspaces").toUpperCase()}</span><strong>{t("sessions")}</strong></div>
      <span className="count-badge">{sessionCount}</span>
    </header>
    <button className="new-session-button" onClick={onNewSession}><Icon name="add" />{t("newSession")}</button>
    <div className="navigator-scroll">
      {groups.length === 0 && <div className="navigator-empty"><Icon name="folder" /><strong>{t("noWorkspacesYet")}</strong><p>{t("noWorkspacesDescription")}</p></div>}
      {groups.map(({ workspace, sessions }) => <section className="workspace-group" key={workspace.id} aria-labelledby={`workspace-${workspace.id}`}>
        <div className="workspace-heading">
          <Icon name="folder" />
          <div><strong id={`workspace-${workspace.id}`}>{workspace.name}</strong><span title={workspace.path}>{workspace.path}</span></div>
        </div>
        <div className="workspace-sessions">
          {sessions.length === 0 && <p className="workspace-empty">{t("noSessions")}</p>}
          {sessions.map((session) => <div className={`session-row-wrap ${session.id === activeSessionId ? "active" : ""}`} key={session.id}>
            <button className="session-row" onClick={() => onSelect(session.id)} onContextMenu={(event) => { event.preventDefault(); setMenuSession(session); }} aria-current={session.id === activeSessionId ? "page" : undefined}>
              <span className={`status-dot ${session.status}`} />
              <span className="session-copy"><strong>{session.pinned ? `★ ${session.name}` : session.name}</strong><small>{statusLabel(session.status)}</small></span>
              <Icon name="chevron" />
            </button>
            <div className="session-inline-actions" aria-label={t("sessionActions")}>
              <button type="button" onClick={() => onPin(session)}>{session.pinned ? t("unpin") : t("pin")}</button>
              <button type="button" onClick={() => onComplete(session)}>{session.organizationStatus === "completed" ? t("reopen") : t("complete")}</button>
              <button type="button" onClick={() => onArchive(session)}>{session.organizationStatus === "archived" ? t("restore") : t("archive")}</button>
              <button type="button" onClick={() => onFork(session)}>{t("fork")}</button>
            </div>
          </div>)}
        </div>
      </section>)}
    </div>
    {menuSession && <div className="session-menu" role="menu" aria-label={t("sessionActions")}>
      <button role="menuitem" onClick={action(onPin)}>{menuSession.pinned ? t("unpin") : t("pin")}</button>
      <button role="menuitem" onClick={action(onComplete)}>{menuSession.organizationStatus === "completed" ? t("reopen") : t("complete")}</button>
      <button role="menuitem" onClick={action(onArchive)}>{menuSession.organizationStatus === "archived" ? t("restore") : t("archive")}</button>
      <button role="menuitem" onClick={action(onFork)}>{t("fork")}</button>
    </div>}
  </nav>;
}
