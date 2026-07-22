import { useState } from "react";
import type { Session, Workspace } from "../../shared/types";
import type { AppView, SessionFilter, SessionGrouping } from "../app/preferences";
import { useI18n } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";
import { Icon } from "./ui/Icon";
import { Select } from "./ui/Select";

interface SidebarProps {
  sessions: Session[];
  workspaces: Workspace[];
  activeSessionId?: string;
  currentView: AppView;
  grouping: SessionGrouping;
  filter: SessionFilter;
  readonly: boolean;
  openFolderBusy: boolean;
  onViewChange: (view: AppView) => void;
  onNewQuest: () => void;
  onSelectSession: (id: string) => void;
  onGroupingChange: (grouping: SessionGrouping) => void;
  onFilterChange: (filter: SessionFilter) => void;
  onOpenFolder: () => void;
  onOpenSettings: () => void;
  onRename: (session: Session) => void;
  onPin: (session: Session) => void;
  onComplete: (session: Session) => void;
  onArchive: (session: Session) => void;
  onFork: (session: Session) => void;
  onDelete: (session: Session) => void;
}

export function Sidebar(props: SidebarProps) {
  const { statusLabel, t } = useI18n();
  const [menuSession, setMenuSession] = useState<Session>();
  const visibleSessions = props.sessions.filter((session) => props.filter === "active" ? session.organizationStatus === "active" : session.organizationStatus === props.filter);
  return <aside id="session-navigator" className="qoder-sidebar app-sidebar" aria-label={t("sessions")}>
    <div className="sidebar-top-zone">
      <button className="new-quest-button" type="button" onClick={props.onNewQuest} disabled={props.readonly}><span><Icon name="add" />{t("qoderNewQuest")}</span><kbd>⌘N</kbd></button>
    </div>
    <div className="sidebar-scroll-zone">
      <div className="sidebar-section-heading"><strong>{t("qoderQuests")}</strong><div><button type="button" className="section-icon" disabled title={t("qoderComingSoon")}><Icon name="list" /></button><button type="button" className="section-icon" disabled title={t("qoderComingSoon")}><Icon name="filter" /></button></div></div>
      <div className="workspace-chips" aria-label={t("qoderWorkspace")}><span>{t("qoderWorkspace")}</span>{props.workspaces.slice(0, 4).map((workspace) => <span className="workspace-chip" key={workspace.id}>{workspace.name}</span>)}</div>
      <div className="sidebar-filter-row">
        <Select ariaLabel={t("groupBy")} value={props.grouping} options={[{ value: "project", label: t("groupProject") }, { value: "time", label: t("groupTime") }, { value: "recent", label: t("groupRecent") }, { value: "manual", label: t("groupManual") }]} onChange={(value) => props.onGroupingChange(value as SessionGrouping)} />
        <Select ariaLabel={t("filterBy")} value={props.filter} options={[{ value: "active", label: t("filterActive") }, { value: "completed", label: t("filterCompleted") }, { value: "archived", label: t("filterArchived") }]} onChange={(value) => props.onFilterChange(value as SessionFilter)} />
      </div>
      <div className="quest-list">
        {!visibleSessions.length && <p className="sidebar-empty">{t("noSessionsForFilter")}</p>}
        {visibleSessions.map((session) => <div className={`quest-row ${session.id === props.activeSessionId ? "active" : ""}`} key={session.id}>
          <button type="button" className="quest-row-main" onClick={() => props.onSelectSession(session.id)}>
            {session.pinned ? <Icon name="star" className="quest-leading pinned" /> : <span className={`quest-dot ${runtimeStatus(session)}`} />}
            <span className="quest-copy"><strong>{session.name}</strong><small>{statusLabel(runtimeStatus(session))}</small></span>
            <span className="quest-time">{relativeTime(session.lastActiveAt)}</span>
          </button>
          <button type="button" className="quest-more" aria-label={t("openSessionActions")} onClick={() => setMenuSession(menuSession?.id === session.id ? undefined : session)}><Icon name="more" /></button>
          {menuSession?.id === session.id && <div className="quest-menu" role="menu">
            <button role="menuitem" onClick={() => { props.onRename(session); setMenuSession(undefined); }}>{t("rename")}</button>
            <button role="menuitem" onClick={() => { props.onPin(session); setMenuSession(undefined); }}>{session.pinned ? t("unpin") : t("pin")}</button>
            <button role="menuitem" onClick={() => { props.onComplete(session); setMenuSession(undefined); }}>{session.organizationStatus === "completed" ? t("reopen") : t("complete")}</button>
            <button role="menuitem" onClick={() => { props.onArchive(session); setMenuSession(undefined); }}>{session.organizationStatus === "archived" ? t("restore") : t("archive")}</button>
            <button role="menuitem" onClick={() => { props.onFork(session); setMenuSession(undefined); }}>{t("fork")}</button>
            <button role="menuitem" className="danger" onClick={() => { props.onDelete(session); setMenuSession(undefined); }}>{t("deleteSession")}</button>
          </div>}
        </div>)}
      </div>
      <div className="sidebar-section-heading chats-heading"><strong>{t("qoderChats")}</strong></div>
      <div className="chat-list">
        {!props.sessions.length && <p className="sidebar-empty">{t("qoderNoQuestYet")}</p>}
        {props.sessions.slice(0, 5).map((session) => <button type="button" className={`chat-row ${session.id === props.activeSessionId && props.currentView === "chat" ? "active" : ""}`} key={session.id} onClick={() => props.onSelectSession(session.id)}><span className="chat-avatar">{session.name.slice(0, 1).toUpperCase()}</span><span><strong>{session.name}</strong><small>{statusLabel(runtimeStatus(session))}</small></span><time>{relativeTime(session.lastActiveAt)}</time></button>)}
      </div>
    </div>
    <div className="sidebar-bottom-zone">
      <button type="button" className={`sidebar-link ${props.currentView === "quest-home" ? "active" : ""}`} onClick={() => props.onViewChange("quest-home")}><span><Icon name="home" />{t("qoderBetterLoop")}</span><small>Help</small></button>
      <button type="button" className={`sidebar-link ${props.currentView === "knowledge" ? "active" : ""}`} onClick={() => props.onViewChange("knowledge")}><span><Icon name="book" />{t("qoderKnowledge")}</span></button>
      <button type="button" className={`sidebar-link ${props.currentView === "marketplace" ? "active" : ""}`} onClick={() => props.onViewChange("marketplace")}><span><Icon name="shopping" />{t("qoderMarketplace")}</span></button>
      <button type="button" className="open-folder-sidebar" onClick={props.onOpenFolder} disabled={props.readonly || props.openFolderBusy}><Icon name="folder" />{props.openFolderBusy ? t("working") : t("openFolder")}</button>
      <div className="sidebar-user"><span className="chat-avatar">L</span><span className="user-copy"><strong>liquiid</strong><small>Local</small></span><LanguageToggle /><button className="section-icon" type="button" onClick={props.onOpenSettings} aria-label={t("openSettings")}><Icon name="settings" /></button></div>
    </div>
  </aside>;
}

function runtimeStatus(session: Session) { return session.runtimeStatus ?? session.status ?? "stopped"; }
function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1_440)}d`;
}
