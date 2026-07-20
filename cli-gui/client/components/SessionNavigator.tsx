import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { Session, Workspace } from "../../shared/types";
import type { SessionFilter, SessionGrouping } from "../app/preferences";
import { useI18n, type TranslationKey } from "../i18n";
import { Icon } from "./ui/Icon";
import { Select } from "./ui/Select";
import { useMobileDrawerFocus } from "./ui/useMobileDrawerFocus";

interface NavigatorGroup {
  id?: string;
  labelKey?: string;
  workspace?: Workspace;
  sessions: Session[];
}

interface SessionNavigatorProps {
  activeSessionId?: string;
  groups: NavigatorGroup[];
  grouping?: SessionGrouping;
  filter?: SessionFilter;
  openFolderBusy?: boolean;
  readonly?: boolean;
  onGroupingChange?: (grouping: SessionGrouping) => void;
  onFilterChange?: (filter: SessionFilter) => void;
  onOpenFolder?: () => void;
  onArchive?: (session: Session) => void;
  onComplete?: (session: Session) => void;
  onFork?: (session: Session) => void;
  onPin?: (session: Session) => void;
  onRename?: (session: Session) => void;
  onDelete?: (session: Session) => void;
  onClose?: () => void;
  onReorder?: (sessionIds: string[], section: { organizationStatus: "active" | "completed" | "archived"; pinned: boolean; expectedRevisions: Record<string, number> }) => void;
  onNewSession: () => void;
  onSelect: (id: string) => void;
}

const menuActions = ["rename", "pin", "complete", "archive", "fork", "delete"] as const;

export function SessionNavigator({ activeSessionId, groups, grouping = "project", filter = "active", readonly = false, openFolderBusy = false, onGroupingChange, onFilterChange, onOpenFolder, onArchive, onComplete, onFork, onPin, onRename, onDelete, onReorder, onNewSession, onSelect, onClose }: SessionNavigatorProps) {
  const { statusLabel, t } = useI18n();
  const [menuSession, setMenuSession] = useState<Session>();
  const [menuClosing, setMenuClosing] = useState(false);
  const [draggedSessionId, setDraggedSessionId] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuCloseTimer = useRef<number | undefined>(undefined);
  const panelRef = useRef<HTMLElement>(null);
  useMobileDrawerFocus(panelRef, onClose);
  const sessionCount = groups.reduce((count, group) => count + group.sessions.length, 0);

  useEffect(() => {
    if (!menuSession) return;
    const onPointerDown = (event: globalThis.MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) closeMenu(); };
    document.addEventListener("mousedown", onPointerDown);
    menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuSession]);

  useEffect(() => () => {
    if (menuCloseTimer.current !== undefined) window.clearTimeout(menuCloseTimer.current);
  }, []);

  function closeMenu() {
    if (!menuSession || menuClosing) return;
    setMenuClosing(true);
    menuCloseTimer.current = window.setTimeout(() => {
      setMenuSession(undefined);
      setMenuClosing(false);
      triggerRef.current?.focus();
    }, 160);
  }

  function openMenu(session: Session, trigger: HTMLButtonElement) {
    if (menuCloseTimer.current !== undefined) window.clearTimeout(menuCloseTimer.current);
    triggerRef.current = trigger;
    setMenuClosing(false);
    setMenuSession(session);
  }

  function invoke(action: typeof menuActions[number]) {
    if (!menuSession) return;
    if (action === "rename") onRename?.(menuSession);
    if (action === "pin") onPin?.(menuSession);
    if (action === "complete") onComplete?.(menuSession);
    if (action === "archive") onArchive?.(menuSession);
    if (action === "fork") onFork?.(menuSession);
    if (action === "delete") onDelete?.(menuSession);
    closeMenu();
  }

  function reorderGroup(group: NavigatorGroup, sessionId: string, targetIndex: number) {
    if (!onReorder) return;
    const currentIndex = group.sessions.findIndex((item) => item.id === sessionId);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= group.sessions.length || currentIndex === targetIndex) return;
    const ordered = group.sessions.map((item) => item.id);
    const [moved] = ordered.splice(currentIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const first = group.sessions[0];
    onReorder(ordered, { organizationStatus: first.organizationStatus ?? "active", pinned: first.pinned ?? false, expectedRevisions: Object.fromEntries(group.sessions.map((item) => [item.id, item.revision ?? 1])) });
  }

  function moveWithinGroup(group: NavigatorGroup, session: Session, direction: -1 | 1) {
    const index = group.sessions.findIndex((item) => item.id === session.id);
    const next = group.sessions[index + direction];
    if (!next) return;
    reorderGroup(group, session.id, index + direction);
    setAnnouncement(t(direction < 0 ? "movedSessionUp" : "movedSessionDown", { name: session.name }));
  }

  return <nav ref={panelRef} id="session-navigator" className="session-navigator" aria-label={t("sessions")} onKeyDown={(event) => { if (event.key === "Escape" && menuSession) { event.preventDefault(); closeMenu(); } }}>
    <header className="navigator-header">
      <div><span className="eyebrow">{t("workspaces").toUpperCase()}</span><strong>{t("sessions")}</strong></div>
      <span className="count-badge" aria-label={t("sessionCount", { count: sessionCount })}>{sessionCount}</span>
    </header>
    <div className="navigator-controls">
      <label><span>{t("groupBy")}</span><Select ariaLabel={t("groupBy")} value={grouping} options={[{ value: "project", label: t("groupProject") }, { value: "time", label: t("groupTime") }, { value: "recent", label: t("groupRecent") }, { value: "manual", label: t("groupManual") }]} onChange={(value) => onGroupingChange?.(value as SessionGrouping)} /></label>
      <label><span>{t("filterBy")}</span><Select ariaLabel={t("filterBy")} value={filter} options={[{ value: "active", label: t("filterActive") }, { value: "completed", label: t("filterCompleted") }, { value: "archived", label: t("filterArchived") }]} onChange={(value) => onFilterChange?.(value as SessionFilter)} /></label>
    </div>
    <button className="new-session-button" onClick={onNewSession}><Icon name="add" />{t("newSession")}</button>
    {onOpenFolder && <button className="open-folder-nav-button" disabled={readonly || openFolderBusy} onClick={onOpenFolder}><Icon name="folder" />{openFolderBusy ? t("working") : t("openFolder")}</button>}
    <div className="navigator-scroll">
      {groups.length === 0 && <div className="navigator-empty"><Icon name="folder" /><strong>{t("noSessionsForFilter")}</strong><p>{t("noSessionsForFilterDescription")}</p></div>}
      {groups.map((group) => <section className="workspace-group" key={group.id ?? group.workspace?.id ?? group.labelKey} aria-labelledby={`workspace-${group.id ?? group.workspace?.id ?? group.labelKey}`}>
        <div className="workspace-heading">
          <Icon name="folder" />
          <div><strong id={`workspace-${group.id ?? group.workspace?.id ?? group.labelKey}`}>{group.workspace?.name ?? t((group.labelKey === "today" || group.labelKey === "yesterday" || group.labelKey === "previous7Days" || group.labelKey === "older" || group.labelKey === "recent" || group.labelKey === "pinned" || group.labelKey === "unpinned" ? group.labelKey : "projects") as TranslationKey)}</strong>{group.workspace?.path && <span title={group.workspace.path}>{group.workspace.path}</span>}</div>
        </div>
        <div className="workspace-sessions">
          {group.sessions.length === 0 && <p className="workspace-empty">{t("noSessions")}</p>}
          {group.sessions.map((session, sessionIndex) => <div className={`session-row-wrap ${session.id === activeSessionId ? "active" : ""}`} key={session.id} draggable={grouping === "manual"} onDragStart={() => setDraggedSessionId(session.id)} onDragOver={(event) => { if (grouping === "manual") event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (grouping === "manual" && draggedSessionId) reorderGroup(group, draggedSessionId, sessionIndex); setDraggedSessionId(undefined); }}>
            <button className="session-row" onClick={() => onSelect(session.id)} onContextMenu={(event: MouseEvent<HTMLButtonElement>) => { event.preventDefault(); openMenu(session, event.currentTarget); }} aria-current={session.id === activeSessionId ? "page" : undefined}>
              <span className={`status-dot ${runtimeStatus(session)}`} />
              <span className="session-copy"><strong>{session.pinned ? `[${t("pinned")}] ${session.name}` : session.name}</strong><small>{statusLabel(runtimeStatus(session))}</small></span>
              <Icon name="chevron" />
            </button>
            <div className="session-inline-actions" aria-label={t("sessionActions")}>
              {grouping === "manual" && <><button type="button" onClick={() => moveWithinGroup(group, session, -1)} aria-label={t("moveUp")} title={t("moveUp")}>↑</button><button type="button" onClick={() => moveWithinGroup(group, session, 1)} aria-label={t("moveDown")} title={t("moveDown")}>↓</button></>}
              <button type="button" disabled={readonly} onClick={() => onPin?.(session)}>{session.pinned ? t("unpin") : t("pin")}</button>
              <button type="button" disabled={readonly} onClick={() => onComplete?.(session)}>{session.organizationStatus === "completed" ? t("reopen") : t("complete")}</button>
              <button type="button" disabled={readonly} onClick={() => onArchive?.(session)}>{session.organizationStatus === "archived" ? t("restore") : t("archive")}</button>
              <button type="button" disabled={readonly} onClick={() => onFork?.(session)}>{t("fork")}</button>
              <button type="button" disabled={readonly} className="session-menu-trigger" aria-label={t("openSessionActions")} title={t("openSessionActions")} onClick={(event) => openMenu(session, event.currentTarget)}><Icon name="menu" /></button>
            </div>
          </div>)}
        </div>
      </section>)}
    </div>
    <div className="navigator-live-region" aria-live="polite">{announcement}</div>
    {menuSession && <div ref={menuRef} className={`session-menu ${menuClosing ? "closing" : ""}`} role="menu" aria-label={t("sessionActions")} onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
      const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? [])];
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus(); }
      if (event.key === "Home") { event.preventDefault(); items[0]?.focus(); }
      if (event.key === "End") { event.preventDefault(); items.at(-1)?.focus(); }
      if (event.key === "Escape") closeMenu();
    }}>
      <button role="menuitem" disabled={readonly} onClick={() => invoke("rename")}>{t("rename")}</button>
      <button role="menuitem" disabled={readonly} onClick={() => invoke("pin")}>{menuSession.pinned ? t("unpin") : t("pin")}</button>
      <button role="menuitem" disabled={readonly} onClick={() => invoke("complete")}>{menuSession.organizationStatus === "completed" ? t("reopen") : t("complete")}</button>
      <button role="menuitem" disabled={readonly} onClick={() => invoke("archive")}>{menuSession.organizationStatus === "archived" ? t("restore") : t("archive")}</button>
      <button role="menuitem" disabled={readonly} onClick={() => invoke("fork")}>{t("fork")}</button>
      <button role="menuitem" disabled={readonly} onClick={() => invoke("delete")}>{t("deleteSession")}</button>
    </div>}
  </nav>;
}

function runtimeStatus(session: Session) {
  return session.runtimeStatus ?? session.status ?? "stopped";
}
