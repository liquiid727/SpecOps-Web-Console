import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { Session, Workspace } from "../../shared/types";
import type { AppView, SessionFilter, SessionGrouping } from "../app/preferences";
import type { SessionGroup } from "../app/session-selectors";
import { useI18n, type TranslationKey } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";
import { Icon } from "./ui/Icon";
import { Select } from "./ui/Select";
import { useMobileDrawerFocus } from "./ui/useMobileDrawerFocus";
import { Button, IconButton, Menu } from "./ui";

interface ReorderSection {
  organizationStatus: "active" | "completed" | "archived";
  pinned: boolean;
  expectedRevisions: Record<string, number>;
}

interface SidebarProps {
  sessions: Session[];
  groups: SessionGroup[];
  workspaces: Workspace[];
  activeSessionId?: string;
  currentView: AppView;
  grouping: SessionGrouping;
  filter: SessionFilter;
  readonly: boolean;
  openFolderBusy: boolean;
  activeTurns?: Record<string, string>;
  onViewChange: (view: AppView) => void;
  onNewQuest: () => void;
  onSelectSession: (id: string) => void;
  onGroupingChange: (grouping: SessionGrouping) => void;
  onFilterChange: (filter: SessionFilter) => void;
  onReorder: (sessionIds: string[], section: ReorderSection) => void;
  onOpenFolder: () => void;
  onOpenSettings: () => void;
  onRename: (session: Session) => void;
  onPin: (session: Session) => void;
  onComplete: (session: Session) => void;
  onArchive: (session: Session) => void;
  onFork: (session: Session) => void;
  onDelete: (session: Session) => void;
  onClose?: () => void;
}

const timeLabelKeys = new Set(["today", "yesterday", "previous7Days", "older", "recent", "pinned", "unpinned", "project"]);

export function Sidebar(props: SidebarProps) {
  const { statusLabel, t } = useI18n();
  const [menuSession, setMenuSession] = useState<Session>();
  const [controlsOpen, setControlsOpen] = useState(false);
  const [draggedSessionId, setDraggedSessionId] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const controlsTriggerRef = useRef<HTMLButtonElement>(null);
  useMobileDrawerFocus(panelRef, props.onClose);
  const manual = props.grouping === "manual";
  const totalSessions = props.groups.reduce((count, group) => count + group.sessions.length, 0);

  function openMenu(session: Session, trigger: HTMLButtonElement) {
    menuTriggerRef.current = trigger;
    setMenuSession(session);
  }

  function closeMenu(restoreFocus = true) {
    setMenuSession(undefined);
    if (restoreFocus) requestAnimationFrame(() => menuTriggerRef.current?.focus());
  }

  function reorderGroup(group: SessionGroup, sessionId: string, targetIndex: number) {
    const currentIndex = group.sessions.findIndex((item) => item.id === sessionId);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= group.sessions.length || currentIndex === targetIndex) return;
    const ordered = group.sessions.map((item) => item.id);
    const [moved] = ordered.splice(currentIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const first = group.sessions[0];
    props.onReorder(ordered, {
      organizationStatus: first.organizationStatus ?? "active",
      pinned: first.pinned ?? false,
      expectedRevisions: Object.fromEntries(group.sessions.map((item) => [item.id, item.revision ?? 1]))
    });
  }

  function moveWithinGroup(group: SessionGroup, session: Session, direction: -1 | 1) {
    const index = group.sessions.findIndex((item) => item.id === session.id);
    if (!group.sessions[index + direction]) return;
    reorderGroup(group, session.id, index + direction);
    setAnnouncement(t(direction < 0 ? "movedSessionUp" : "movedSessionDown", { name: session.name }));
  }

  function groupHeading(group: SessionGroup) {
    if (group.workspace) return group.workspace.name;
    return t((timeLabelKeys.has(group.labelKey) ? group.labelKey : "projects") as TranslationKey);
  }

  return <aside ref={panelRef} id="session-navigator" className="qoder-sidebar app-sidebar" aria-label={t("sessions")} onKeyDown={(event) => { if (event.key === "Escape" && menuSession) { event.preventDefault(); closeMenu(); } }}>
    <div className="sidebar-top-zone">
      <Button variant="primary" className="new-quest-button" onClick={props.onNewQuest} disabled={props.readonly}><span><Icon name="add" />{t("qoderNewQuest")}</span><kbd>⌘N</kbd></Button>
    </div>
    <div className="sidebar-scroll-zone">
      <div className="sidebar-section-heading"><strong>{t("qoderQuests")}</strong><div><IconButton appearance="section" icon="list" label={t("qoderComingSoon")} disabled title={t("qoderComingSoon")} /><IconButton ref={controlsTriggerRef} appearance="section" icon="filter" label={t("filterBy")} title={t("filterBy")} aria-haspopup="menu" aria-expanded={controlsOpen} onClick={() => setControlsOpen((open) => !open)} /><IconButton appearance="section" icon="folder" label={t("openFolder")} title={t("openFolder")} onClick={props.onOpenFolder} disabled={props.readonly || props.openFolderBusy} /></div>{controlsOpen && <Menu className="quest-menu sidebar-controls-menu" ariaLabel={t("filterBy")} triggerRef={controlsTriggerRef} onClose={(restoreFocus = true) => { setControlsOpen(false); if (restoreFocus) requestAnimationFrame(() => controlsTriggerRef.current?.focus()); }} items={[
        { id: "group-project", label: t("groupProject"), onSelect: () => props.onGroupingChange("project") },
        { id: "group-time", label: t("groupTime"), onSelect: () => props.onGroupingChange("time") },
        { id: "group-recent", label: t("groupRecent"), onSelect: () => props.onGroupingChange("recent") },
        { id: "group-manual", label: t("groupManual"), onSelect: () => props.onGroupingChange("manual") },
        { id: "filter-active", label: t("filterActive"), onSelect: () => props.onFilterChange("active") },
        { id: "filter-completed", label: t("filterCompleted"), onSelect: () => props.onFilterChange("completed") },
        { id: "filter-archived", label: t("filterArchived"), onSelect: () => props.onFilterChange("archived") }
      ]} />}</div>
      <div className="workspace-chips" aria-label={t("qoderWorkspace")}><span>{t("qoderWorkspace")}</span>{props.workspaces.slice(0, 4).map((workspace) => <span className="workspace-chip" key={workspace.id}>{workspace.name}</span>)}</div>
      <div className="sidebar-filter-row">
        <Select ariaLabel={t("groupBy")} value={props.grouping} options={[{ value: "project", label: t("groupProject") }, { value: "time", label: t("groupTime") }, { value: "recent", label: t("groupRecent") }, { value: "manual", label: t("groupManual") }]} onChange={(value) => props.onGroupingChange(value as SessionGrouping)} />
        <Select ariaLabel={t("filterBy")} value={props.filter} options={[{ value: "active", label: t("filterActive") }, { value: "completed", label: t("filterCompleted") }, { value: "archived", label: t("filterArchived") }]} onChange={(value) => props.onFilterChange(value as SessionFilter)} />
      </div>
      <div className="quest-list">
        {!totalSessions && <p className="sidebar-empty">{t("noSessionsForFilter")}</p>}
        {props.groups.map((group) => <div className="quest-group" key={group.id}>
          <div className="quest-group-heading" id={`quest-group-${group.id}`}>{groupHeading(group)}</div>
          {group.sessions.map((session, sessionIndex) => <div
            className={`quest-row ${session.id === props.activeSessionId ? "active" : ""} ${manual ? "reorderable" : ""}`}
            key={session.id}
            draggable={manual}
            onDragStart={() => manual && setDraggedSessionId(session.id)}
            onDragOver={(event) => { if (manual) event.preventDefault(); }}
            onDrop={(event) => { event.preventDefault(); if (manual && draggedSessionId) reorderGroup(group, draggedSessionId, sessionIndex); setDraggedSessionId(undefined); }}
          >
            <Button variant="ghost" className="quest-row-main" onClick={() => props.onSelectSession(session.id)} onContextMenu={(event: MouseEvent<HTMLButtonElement>) => { event.preventDefault(); openMenu(session, event.currentTarget); }} aria-current={session.id === props.activeSessionId ? "page" : undefined}>
              {session.pinned ? <Icon name="star" className="quest-leading pinned" /> : <span className={`quest-dot ${runtimeStatus(session)}`} />}
              <span className="quest-copy"><strong>{session.name}</strong><span className={`mode-badge ${session.interactionMode ?? "terminal"}`}>{session.interactionMode === "chat" ? t("sessionModeChat") : t("sessionModeTerminal")}</span><small>{props.activeTurns?.[session.id] ? t("turnInProgress") : statusLabel(runtimeStatus(session))}</small></span>
              <span className="quest-time">{relativeTime(session.lastActiveAt)}</span>
            </Button>
            {manual && <div className="quest-reorder" aria-label={t("sessionActions")}>
              <Button variant="ghost" onClick={() => moveWithinGroup(group, session, -1)} aria-label={t("moveUp")} title={t("moveUp")} disabled={props.readonly || sessionIndex === 0}>↑</Button>
              <Button variant="ghost" onClick={() => moveWithinGroup(group, session, 1)} aria-label={t("moveDown")} title={t("moveDown")} disabled={props.readonly || sessionIndex === group.sessions.length - 1}>↓</Button>
            </div>}
            <IconButton className="quest-more" icon="more" label={t("openSessionActions")} aria-haspopup="menu" aria-expanded={menuSession?.id === session.id} onClick={(event) => menuSession?.id === session.id ? closeMenu() : openMenu(session, event.currentTarget)} />
            {menuSession?.id === session.id && <Menu className="quest-menu" ariaLabel={t("sessionActions")} triggerRef={menuTriggerRef} onClose={closeMenu} items={[
              { id: "rename", label: t("rename"), disabled: props.readonly, onSelect: () => props.onRename(session) },
              { id: "pin", label: session.pinned ? t("unpin") : t("pin"), disabled: props.readonly, onSelect: () => props.onPin(session) },
              { id: "complete", label: session.organizationStatus === "completed" ? t("reopen") : t("complete"), disabled: props.readonly, onSelect: () => props.onComplete(session) },
              { id: "archive", label: session.organizationStatus === "archived" ? t("restore") : t("archive"), disabled: props.readonly, onSelect: () => props.onArchive(session) },
              { id: "fork", label: t("fork"), disabled: props.readonly, onSelect: () => props.onFork(session) },
              { id: "delete", label: t("deleteSession"), disabled: props.readonly, danger: true, onSelect: () => props.onDelete(session) }
            ]} />}
          </div>)}
        </div>)}
      </div>
      <div className="sidebar-section-heading chats-heading"><strong>{t("qoderChats")}</strong></div>
      <div className="chat-list">
        {!props.sessions.length && <p className="sidebar-empty">{t("qoderNoQuestYet")}</p>}
        {props.sessions.slice(0, 5).map((session) => <Button variant="ghost" className={`chat-row ${session.id === props.activeSessionId && props.currentView === "chat" ? "active" : ""}`} key={session.id} onClick={() => props.onSelectSession(session.id)}><span className="chat-avatar">{session.name.slice(0, 1).toUpperCase()}</span><span><strong>{session.name}</strong><small>{statusLabel(runtimeStatus(session))}</small></span><time>{relativeTime(session.lastActiveAt)}</time></Button>)}
      </div>
    </div>
    <div className="sidebar-bottom-zone">
      <Button variant="ghost" className={`sidebar-link ${props.currentView === "quest-home" ? "active" : ""}`} onClick={() => props.onViewChange("quest-home")}><span><Icon name="home" />{t("qoderBetterLoop")}</span><small>Help</small></Button>
      <Button variant="ghost" className={`sidebar-link ${props.currentView === "knowledge" ? "active" : ""}`} onClick={() => props.onViewChange("knowledge")}><span><Icon name="book" />{t("qoderKnowledge")}</span></Button>
      <Button variant="ghost" className={`sidebar-link ${props.currentView === "marketplace" ? "active" : ""}`} onClick={() => props.onViewChange("marketplace")}><span><Icon name="shopping" />{t("qoderMarketplace")}</span></Button>
      <Button variant="ghost" className="open-folder-sidebar" onClick={props.onOpenFolder} disabled={props.readonly || props.openFolderBusy}><Icon name="folder" />{props.openFolderBusy ? t("working") : t("openFolder")}</Button>
      <div className="sidebar-user"><span className="chat-avatar">L</span><span className="user-copy"><strong>liquiid</strong><small>Local</small></span><LanguageToggle /><IconButton appearance="section" icon="settings" onClick={props.onOpenSettings} label={t("openSettings")} /></div>
    </div>
    <div className="navigator-live-region" aria-live="polite">{announcement}</div>
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
