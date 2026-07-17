import type { Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

interface SessionNavigatorProps {
  activeSessionId?: string;
  groups: Array<{ workspace: Workspace; sessions: Session[] }>;
  onNewSession: () => void;
  onSelect: (id: string) => void;
}

export function SessionNavigator({ activeSessionId, groups, onNewSession, onSelect }: SessionNavigatorProps) {
  const { statusLabel, t } = useI18n();
  const sessionCount = groups.reduce((count, group) => count + group.sessions.length, 0);
  return <nav className="session-navigator" aria-label={t("sessions")}>
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
          {sessions.map((session) => <button className={`session-row ${session.id === activeSessionId ? "active" : ""}`} key={session.id} onClick={() => onSelect(session.id)} aria-current={session.id === activeSessionId ? "page" : undefined}>
            <span className={`status-dot ${session.status}`} />
            <span className="session-copy"><strong>{session.name}</strong><small>{statusLabel(session.status)}</small></span>
            <Icon name="chevron" />
          </button>)}
        </div>
      </section>)}
    </div>
  </nav>;
}
