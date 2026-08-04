import { useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { Session, Workspace } from "../../shared/types";
import type { AppView, SessionFilter, SessionGrouping } from "../app/preferences";
import type { SessionGroup } from "../app/session-selectors";
import { CHAT_ENABLED } from "../feature-flags";
import { useI18n, type TranslationKey } from "../i18n";
import { Icon } from "./ui/Icon";
import { Select } from "./ui/Select";
import { useMobileDrawerFocus } from "./ui/useMobileDrawerFocus";
import { Button, IconButton, Menu, TextField } from "./ui";

interface ReorderSection {
  organizationStatus: "active" | "completed" | "archived";
  pinned: boolean;
  expectedRevisions: Record<string, number>;
}

interface SidebarProps {
  questGroups: SessionGroup[];
  chatGroups: SessionGroup[];
  workspaces: Workspace[];
  activeSessionId?: string;
  currentView: AppView;
  grouping: SessionGrouping;
  filter: SessionFilter;
  readonly: boolean;
  openFolderBusy: boolean;
  activeTurns?: Record<string, string>;
  /** 新建 Quest 草稿态：Quests 区顶部展示虚线占位行，发送首条消息后替换为真实会话 */
  questDraftActive?: boolean;
  /** 重开草稿行时保留当前 Workspace 上下文 */
  questDraftWorkspaceId?: string;
  onViewChange: (view: AppView) => void;
  onNewQuest: (workspaceId?: string) => void;
  onSelectSession: (id: string) => void;
  onGroupingChange: (grouping: SessionGrouping) => void;
  onFilterChange: (filter: SessionFilter) => void;
  onReorder: (sessionIds: string[], section: ReorderSection) => void;
  onOpenFolder: () => void;
  onOpenSettings: () => void;
  onRename: (session: Session, newName: string) => void;
  onPin: (session: Session) => void;
  onComplete: (session: Session) => void;
  onArchive: (session: Session) => void;
  onFork: (session: Session) => void;
  onDelete: (session: Session) => void;
  onClose?: () => void;
}

const timeLabelKeys = new Set(["today", "yesterday", "previous7Days", "older", "recent", "pinned", "unpinned", "project"]);

export function Sidebar(props: SidebarProps) {
  const { t } = useI18n();
  const [menuSession, setMenuSession] = useState<Session>();
  const [controlsOpen, setControlsOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [folderMenuId, setFolderMenuId] = useState<string>();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [questsCollapsed, setQuestsCollapsed] = useState(false);
  const [chatsCollapsed, setChatsCollapsed] = useState(false);
  const [draggedSessionId, setDraggedSessionId] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const [renamingSessionId, setRenamingSessionId] = useState<string>();
  const [renameValue, setRenameValue] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const controlsTriggerRef = useRef<HTMLButtonElement>(null);
  const workspaceTriggerRef = useRef<HTMLButtonElement>(null);
  const folderMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  useMobileDrawerFocus(panelRef, props.onClose);
  const manual = props.grouping === "manual";
  const totalSessions = props.questGroups.reduce((count, group) => count + group.sessions.length, 0);
  const hasWorkspaceGroups = props.questGroups.some((group) => Boolean(group.workspace));

  function openMenu(session: Session, trigger: HTMLButtonElement) {
    menuTriggerRef.current = trigger;
    setMenuSession(session);
  }

  function closeMenu(restoreFocus = true) {
    setMenuSession(undefined);
    if (restoreFocus) requestAnimationFrame(() => menuTriggerRef.current?.focus());
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
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

  function startRename(session: Session) {
    setRenamingSessionId(session.id);
    setRenameValue(session.name);
    requestAnimationFrame(() => { renameInputRef.current?.focus(); renameInputRef.current?.select(); });
  }

  function commitRename(session: Session) {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== session.name) props.onRename(session, trimmed);
    setRenamingSessionId(undefined);
  }

  function cancelRename() {
    setRenamingSessionId(undefined);
  }

  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>, session: Session) {
    if (event.key === "Enter") { event.preventDefault(); commitRename(session); }
    if (event.key === "Escape") { event.preventDefault(); cancelRename(); }
  }

  function sessionMenuItems(session: Session) {
    return [
      { id: "rename", icon: "file" as const, label: t("rename"), disabled: props.readonly, onSelect: () => startRename(session) },
      { id: "pin", icon: "star" as const, label: session.pinned ? t("unpin") : t("pin"), disabled: props.readonly, onSelect: () => props.onPin(session) },
      { id: "archive", icon: "archive" as const, label: session.organizationStatus === "archived" ? t("restore") : t("archive"), disabled: props.readonly, onSelect: () => props.onArchive(session) },
      { id: "complete", icon: "check" as const, label: session.organizationStatus === "completed" ? t("reopen") : t("complete"), disabled: props.readonly, onSelect: () => props.onComplete(session) },
      { id: "fork", icon: "git" as const, label: t("fork"), disabled: props.readonly, onSelect: () => props.onFork(session) },
      { id: "delete", icon: "trash" as const, label: t("deleteSession"), disabled: props.readonly, danger: true, onSelect: () => props.onDelete(session) }
    ];
  }

  function folderMenuItems(group: SessionGroup) {
    return [
      { id: "new-quest", icon: "add" as const, label: t("newQuestInFolder"), disabled: props.readonly, onSelect: () => props.onNewQuest(group.workspace?.id) },
      { id: "remove-folder", icon: "trash" as const, label: t("removeFolder"), disabled: props.readonly, danger: true, onSelect: () => undefined }
    ];
  }

  return <aside ref={panelRef} id="session-navigator" className="qoder-sidebar app-sidebar" aria-label={t("sessions")} onKeyDown={(event) => { if (event.key === "Escape" && menuSession) { event.preventDefault(); closeMenu(); } }}>
    <div className="sidebar-top-zone">
      <Button variant="primary" className="new-quest-button" onClick={() => props.onNewQuest()} disabled={props.readonly}><span><Icon name="add" />{t("qoderNewQuest")}</span><kbd>⌘N</kbd></Button>
    </div>
    <div className="sidebar-scroll-zone">
      <div className="sidebar-section-heading section-collapsible" onClick={() => setQuestsCollapsed((v) => !v)} role="button" aria-expanded={!questsCollapsed} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setQuestsCollapsed((v) => !v); } }}><Icon name={questsCollapsed ? "chevron" : "chevron-down"} className="section-chevron" /><strong>{t("qoderQuests")}</strong><div onClick={(event) => event.stopPropagation()}><IconButton appearance="section" className={props.currentView === "quests" ? "active" : undefined} icon="list" label={t("qoderViewAllQuests")} title={t("qoderViewAllQuests")} aria-pressed={props.currentView === "quests"} onClick={() => props.onViewChange("quests")} /><IconButton ref={controlsTriggerRef} appearance="section" icon="filter" label={t("filterBy")} title={t("filterBy")} aria-haspopup="menu" aria-expanded={controlsOpen} onClick={() => setControlsOpen((open) => !open)} /><IconButton ref={workspaceTriggerRef} appearance="section" icon="folder" label={t("workspaceActions")} title={t("workspaceActions")} aria-haspopup="menu" aria-expanded={workspaceMenuOpen} onClick={() => setWorkspaceMenuOpen((open) => !open)} disabled={props.readonly} /></div>{workspaceMenuOpen && <Menu className="quest-menu sidebar-controls-menu" ariaLabel={t("workspaceActions")} triggerRef={workspaceTriggerRef} onClose={(restoreFocus = true) => { setWorkspaceMenuOpen(false); if (restoreFocus) requestAnimationFrame(() => workspaceTriggerRef.current?.focus()); }} items={[
        { id: "open-folder", icon: "folder", label: props.openFolderBusy ? t("working") : t("openFolder"), disabled: props.readonly || props.openFolderBusy, onSelect: props.onOpenFolder },
        { id: "setup-workspace", icon: "settings", label: t("setupWorkspace"), disabled: props.readonly, onSelect: props.onOpenSettings },
        { id: "connect-ssh", icon: "server", label: t("connectSsh"), disabled: true, onSelect: () => undefined }
      ]} />}{controlsOpen && <Menu className="quest-menu sidebar-controls-menu" ariaLabel={t("filterBy")} triggerRef={controlsTriggerRef} onClose={(restoreFocus = true) => { setControlsOpen(false); if (restoreFocus) requestAnimationFrame(() => controlsTriggerRef.current?.focus()); }} items={[
        { id: "group-project", label: t("groupProject"), onSelect: () => props.onGroupingChange("project") },
        { id: "group-time", label: t("groupTime"), onSelect: () => props.onGroupingChange("time") },
        { id: "group-recent", label: t("groupRecent"), onSelect: () => props.onGroupingChange("recent") },
        { id: "group-manual", label: t("groupManual"), onSelect: () => props.onGroupingChange("manual") },
        { id: "filter-active", label: t("filterActive"), onSelect: () => props.onFilterChange("active") },
        { id: "filter-completed", label: t("filterCompleted"), onSelect: () => props.onFilterChange("completed") },
        { id: "filter-archived", label: t("filterArchived"), onSelect: () => props.onFilterChange("archived") }
      ]} />}</div>
      {!questsCollapsed && <>
      <div className="workspace-chips" aria-label={t("qoderWorkspace")}><span>{t("qoderWorkspace")}</span>{props.workspaces.slice(0, 4).map((workspace) => <span className="workspace-chip" key={workspace.id}>{workspace.name}</span>)}</div>
      <div className="sidebar-filter-row">
        <Select ariaLabel={t("groupBy")} value={props.grouping} options={[{ value: "project", label: t("groupProject") }, { value: "time", label: t("groupTime") }, { value: "recent", label: t("groupRecent") }, { value: "manual", label: t("groupManual") }]} onChange={(value) => props.onGroupingChange(value as SessionGrouping)} />
        <Select ariaLabel={t("filterBy")} value={props.filter} options={[{ value: "active", label: t("filterActive") }, { value: "completed", label: t("filterCompleted") }, { value: "archived", label: t("filterArchived") }]} onChange={(value) => props.onFilterChange(value as SessionFilter)} />
      </div>
      <div className="quest-list">
        {props.questDraftActive && <Button unstyled className="quest-draft-row" aria-current="true" aria-label={t("qoderNewQuestDraft")} onClick={() => props.onNewQuest(props.questDraftWorkspaceId)}>
          <span className="quest-draft-name">{t("qoderNewQuestDraft")}</span>
          <span className="quest-draft-badge">{t("qoderQuestBadge")}</span>
          <span className="quest-draft-dot" aria-hidden="true" />
        </Button>}
        {!totalSessions && !props.questDraftActive && !hasWorkspaceGroups && <p className="sidebar-empty">{t("noSessionsForFilter")}</p>}
        {props.questGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.id);
          return <div className="quest-group" key={group.id}>
            <div className={`quest-folder-row${isCollapsed ? " collapsed" : ""}`}>
              <Button unstyled className="quest-folder-toggle" onClick={() => toggleGroup(group.id)} aria-expanded={!isCollapsed} title={isCollapsed ? t("expandFolder") : t("collapseFolder")}>
                <Icon name={isCollapsed ? "chevron" : "chevron-down"} className="folder-chevron" />
                <Icon name="folder" className="folder-icon" />
                <span className="folder-name">{groupHeading(group)}</span>
                <span className="folder-count">{group.sessions.length}</span>
              </Button>
              <div className="folder-actions">
                <IconButton className="folder-action-btn" icon="add" label={t("newQuestInFolder")} title={t("newQuestInFolder")} onClick={() => props.onNewQuest(group.workspace?.id)} disabled={props.readonly} />
                <IconButton ref={folderMenuId === group.id ? folderMenuTriggerRef : undefined} className="folder-action-btn" icon="more" label={t("moreFolderActions")} title={t("moreFolderActions")} aria-haspopup="menu" aria-expanded={folderMenuId === group.id} onClick={(event) => { if (folderMenuId === group.id) { setFolderMenuId(undefined); } else { folderMenuTriggerRef.current = event.currentTarget; setFolderMenuId(group.id); } }} />
              </div>
              {folderMenuId === group.id && <Menu className="quest-menu folder-menu" ariaLabel={t("moreFolderActions")} triggerRef={folderMenuTriggerRef} onClose={(restoreFocus = true) => { setFolderMenuId(undefined); if (restoreFocus) requestAnimationFrame(() => folderMenuTriggerRef.current?.focus()); }} items={folderMenuItems(group)} />}
            </div>
            {!isCollapsed && <div className="quest-folder-children">
              {group.sessions.map((session, sessionIndex) => <div
                className={`quest-row ${session.id === props.activeSessionId ? "active" : ""} ${manual ? "reorderable" : ""}`}
                key={session.id}
                draggable={manual}
                onDragStart={() => manual && setDraggedSessionId(session.id)}
                onDragOver={(event) => { if (manual) event.preventDefault(); }}
                onDrop={(event) => { event.preventDefault(); if (manual && draggedSessionId) reorderGroup(group, draggedSessionId, sessionIndex); setDraggedSessionId(undefined); }}
              >
                <Button variant="ghost" className="quest-row-main" onClick={() => props.onSelectSession(session.id)} onContextMenu={(event: MouseEvent<HTMLButtonElement>) => { event.preventDefault(); openMenu(session, event.currentTarget); }} aria-current={session.id === props.activeSessionId ? "page" : undefined}>
                  {session.pinned ? <Icon name="star" className="quest-leading pinned" /> : <span className="quest-dot" />}
                  {renamingSessionId === session.id
                    ? <TextField unstyled ref={renameInputRef} className="quest-rename-input" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => onRenameKeyDown(event, session)} onBlur={() => commitRename(session)} onClick={(event) => event.stopPropagation()} aria-label={t("rename")} />
                    : <span className="quest-copy"><strong>{session.name}</strong>{props.activeTurns?.[session.id] && <small>{t("turnInProgress")}</small>}</span>}
                  <span className="quest-time">{relativeTime(session.lastActiveAt, t)}</span>
                </Button>
                {manual && <div className="quest-reorder" aria-label={t("sessionActions")}>
                  <Button variant="ghost" onClick={() => moveWithinGroup(group, session, -1)} aria-label={t("moveUp")} title={t("moveUp")} disabled={props.readonly || sessionIndex === 0}>↑</Button>
                  <Button variant="ghost" onClick={() => moveWithinGroup(group, session, 1)} aria-label={t("moveDown")} title={t("moveDown")} disabled={props.readonly || sessionIndex === group.sessions.length - 1}>↓</Button>
                </div>}
                <div className="quest-row-actions">
                  <IconButton className="quest-action-btn" icon="add" label={t("newQuestInFolder")} title={t("newQuestInFolder")} onClick={() => props.onNewQuest(session.workspaceId)} disabled={props.readonly} />
                  <IconButton className="quest-action-btn" icon="more" label={t("openSessionActions")} aria-haspopup="menu" aria-expanded={menuSession?.id === session.id} onClick={(event) => menuSession?.id === session.id ? closeMenu() : openMenu(session, event.currentTarget)} />
                </div>
                {menuSession?.id === session.id && <Menu className="quest-menu" ariaLabel={t("sessionActions")} triggerRef={menuTriggerRef} onClose={closeMenu} items={sessionMenuItems(session)} />}
              </div>)}
            </div>}
          </div>;
        })}
      </div>
      </>}
      <div className={`sidebar-section-heading chats-heading section-collapsible${CHAT_ENABLED ? "" : " chats-disabled"}`} onClick={() => setChatsCollapsed((v) => !v)} role="button" aria-expanded={!chatsCollapsed} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setChatsCollapsed((v) => !v); } }}><Icon name={chatsCollapsed ? "chevron" : "chevron-down"} className="section-chevron" /><strong>{t("qoderChats")}</strong>{!CHAT_ENABLED && <span className="coming-soon-badge">{t("comingSoon")}</span>}</div>
      {!chatsCollapsed && <div className={`chat-list${CHAT_ENABLED ? "" : " chats-disabled"}`}>
        {/* Chat 是后续版本功能（feature-flags CHAT_ENABLED）：分区置灰，仅存量 chat 会话保留可打开 */}
        {!props.chatGroups.some((group) => group.sessions.length > 0) && <p className="sidebar-empty">{CHAT_ENABLED ? t("qoderNoChatsYet") : t("chatComingSoonHint")}</p>}
        {props.chatGroups.flatMap((group) => group.sessions).map((session) => <div className="chat-row-shell" key={session.id}>
          <Button
            variant="ghost"
            className={`chat-row ${session.id === props.activeSessionId ? "active" : ""}`}
            onClick={() => props.onSelectSession(session.id)}
            onContextMenu={(event: MouseEvent<HTMLButtonElement>) => { event.preventDefault(); openMenu(session, event.currentTarget); }}
            aria-current={session.id === props.activeSessionId ? "page" : undefined}
          >
            <span className="chat-avatar">{session.name.slice(0, 1).toUpperCase()}</span>
            <span className="chat-copy"><strong>{session.name}</strong><small>{t("chatDirectoryHint")}</small></span>
            <time>{relativeTime(session.lastActiveAt, t)}</time>
          </Button>
          <div className="chat-row-actions">
            <IconButton className="quest-action-btn" icon="add" label={t("newQuestInFolder")} title={t("newQuestInFolder")} onClick={() => props.onNewQuest(session.workspaceId)} disabled={props.readonly} />
            <IconButton className="quest-action-btn" icon="more" label={t("openSessionActions")} aria-haspopup="menu" aria-expanded={menuSession?.id === session.id} onClick={(event) => menuSession?.id === session.id ? closeMenu() : openMenu(session, event.currentTarget)} />
          </div>
          {menuSession?.id === session.id && <Menu className="quest-menu" ariaLabel={t("sessionActions")} triggerRef={menuTriggerRef} onClose={closeMenu} items={sessionMenuItems(session)} />}
        </div>)}
      </div>}
    </div>
    <div className="sidebar-bottom-zone">
      <Button variant="ghost" className={`sidebar-link ${props.currentView === "quest-home" ? "active" : ""}`} onClick={() => props.onViewChange("quest-home")}><span><Icon name="home" />{t("qoderBetterLoop")}</span><small>{t("help")}</small></Button>
      <Button variant="ghost" className={`sidebar-link ${props.currentView === "knowledge" ? "active" : ""}`} onClick={() => props.onViewChange("knowledge")}><span><Icon name="book" />{t("qoderKnowledge")}</span></Button>
      <Button variant="ghost" className={`sidebar-link ${props.currentView === "marketplace" ? "active" : ""}`} onClick={() => props.onViewChange("marketplace")}><span><Icon name="shopping" />{t("qoderMarketplace")}</span></Button>
      <Button variant="ghost" className="open-folder-sidebar" onClick={props.onOpenFolder} disabled={props.readonly || props.openFolderBusy}><Icon name="folder" />{props.openFolderBusy ? t("working") : t("openFolder")}</Button>
      {/* 语言切换收入设置 Appearance，左栏不再常驻（console-gaps SPEC §6） */}
      <div className="sidebar-user"><span className="chat-avatar">L</span><span className="user-copy"><strong>liquiid</strong><small>{t("qoderLocal")}</small></span><IconButton appearance="section" icon="settings" onClick={props.onOpenSettings} label={t("openSettings")} /></div>
    </div>
    <div className="navigator-live-region" aria-live="polite">{announcement}</div>
  </aside>;
}

// 相对时间随界面语言本地化（QA 调节：中文模式不再出现 now/m/h/d）
function relativeTime(value: string, t: (key: TranslationKey, params?: Record<string, string | number>) => string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return t("timeJustNow");
  if (minutes < 60) return t("timeMinutesShort", { n: minutes });
  if (minutes < 1_440) return t("timeHoursShort", { n: Math.floor(minutes / 60) });
  return t("timeDaysShort", { n: Math.floor(minutes / 1_440) });
}
