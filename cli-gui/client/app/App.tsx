import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/ui/Icon";
import type { CliProfile, SessionLaunchConfig, WorkspaceV2 } from "../../shared/types";
import { api, type ClientAppState, mergeState } from "../api";
import { useI18n, type TranslationKey } from "../i18n";
import { toFeedbackError } from "../feedback-errors";
import { ActionDialog } from "../components/ActionDialog";
import { NewSessionDialog } from "../components/NewSessionDialog";
import { TitleBar } from "../components/TitleBar";
import { Sidebar } from "../components/Sidebar";
import { MainArea } from "../components/MainArea";
import { RightPanel } from "../components/RightPanel";
import { WorkspaceProfileManager } from "../components/WorkspaceProfileManager";
import { useFeedback } from "../components/ui/Feedback";
import { readPreferences, writePreferences, type UiPreferencesV1 } from "./preferences";
import { groupSessions } from "./session-selectors";
import { usePlatform } from "../lib/platform";
import { Button } from "../components/ui";

const emptyState: ClientAppState = { workspaces: [], profiles: [], sessions: [] };
const viewShortcuts: Record<string, UiPreferencesV1["currentView"]> = { "1": "quest-home", "2": "chat", "3": "knowledge", "4": "marketplace", "5": "settings" };
type OverlayState = "new-session" | "settings" | "resume" | "rename" | "delete-session" | "archive-session" | "complete-session" | "fork-session" | undefined;
type PendingDelete = { type: "workspace"; item: WorkspaceV2 } | { type: "profile"; item: CliProfile } | undefined;

export function App() {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [state, setState] = useState<ClientAppState>(emptyState);
  const [readonly, setReadonly] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [preferences, setPreferences] = useState<UiPreferencesV1>(() => readPreferences());
  const [overlay, setOverlay] = useState<OverlayState>();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>();
  const [pickerBusy, setPickerBusy] = useState(false);
  const [activeTurns, setActiveTurns] = useState<Record<string, string>>({});
  const pickerBusyRef = useRef(false);
  const platform = usePlatform();
  const refreshRequestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const updatePreferences = useCallback((update: Partial<UiPreferencesV1>) => {
    setPreferences((current) => ({ ...current, ...update, centerViewBySession: update.centerViewBySession ?? current.centerViewBySession }));
  }, []);

  const handleViewChange = useCallback((view: string) => {
    updatePreferences({ currentView: view as UiPreferencesV1["currentView"], inspectorOpen: view === "quest-home" || view === "chat" });
  }, [updatePreferences]);

  const refresh = useCallback(async (notify = false) => {
    const requestId = ++refreshRequestRef.current;
    try {
      const next = await api.state();
      if (requestId !== refreshRequestRef.current) return;
      setState((previous) => mergeState(previous, next));
      setReadonly(next.readonly);
      setActiveSessionId((current) => current && next.sessions.some((session) => session.id === current) ? current : next.sessions[0]?.id);
      setLoadError(false);
      hasLoadedRef.current = true;
    } catch (cause) {
      if (requestId !== refreshRequestRef.current) return;
      if (!hasLoadedRef.current) setLoadError(true);
      if (notify) feedback.error(toFeedbackError(cause, t, "failedToLoadWorkspace", "state-load"));
    } finally {
      if (requestId === refreshRequestRef.current) setLoading(false);
    }
  }, [feedback, t]);
  const refreshStatus = useCallback(() => { void refresh(); }, [refresh]);

  useEffect(() => { void refresh(true); const timer = window.setInterval(() => void refresh(), 2000); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => { writePreferences(preferences); }, [preferences]);
  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [role='dialog'], .xterm")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") { event.preventDefault(); updatePreferences({ navigatorOpen: !preferences.navigatorOpen }); }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "i" && activeSessionId) { event.preventDefault(); updatePreferences({ inspectorOpen: !preferences.inspectorOpen }); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") { event.preventDefault(); setOverlay("new-session"); }
      // ⌘/Ctrl + 1..5 switch the primary view (Quest Home, Chat, Knowledge, Marketplace, Settings).
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && viewShortcuts[event.key]) {
        const view = viewShortcuts[event.key];
        if (view === "chat" && !activeSessionId) return;
        event.preventDefault();
        handleViewChange(view);
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [activeSessionId, handleViewChange, preferences.inspectorOpen, preferences.navigatorOpen, updatePreferences]);

  const activeSession = state.sessions.find((session) => session.id === activeSessionId);
  const activeWorkspace = state.workspaces.find((workspace) => workspace.id === activeSession?.workspaceId);
  const activeProfile = state.profiles.find((profile) => profile.id === activeSession?.profileId);
  const groupedSessions = useMemo(() => groupSessions(state.sessions, state.workspaces, preferences.sessionGrouping, preferences.sessionFilter), [preferences.sessionFilter, preferences.sessionGrouping, state.sessions, state.workspaces]);

  async function runAction(action: () => Promise<unknown>, closeOverlay = true, success: TranslationKey | false = "operationCompleted", closeOverlayOnError = closeOverlay) {
    try {
      await action();
      if (closeOverlay) window.setTimeout(() => setOverlay(undefined), 160);
      if (success) feedback.success({ title: t(success) });
      await refresh();
    } catch (cause) {
      if (closeOverlayOnError) window.setTimeout(() => setOverlay(undefined), 160);
      feedback.error(toFeedbackError(cause, t));
      await refresh();
    }
  }

  async function createSession(input: { name: string; workspaceId: string; profileId: string }) {
    await runAction(async () => {
      const result = await api.createSession({ ...input, start: true, confirmed: true });
      // profile 不支持 headless → 服务端降级 terminal，一次性说明（api-spec §2.6 / frontend-spec 降级说明）
      if (result.interactionModeDowngraded) feedback.warning({ title: t("sessionDowngradedToTerminal") });
      setActiveSessionId(result.session?.id ?? result.id);
      updatePreferences({ currentView: "chat" });
    }, true, "sessionCreated");
  }

  async function resumeSession(id: string) {
    await runAction(() => api.startSession(id), false, false);
  }

  async function stopSession(id: string) {
    await runAction(() => api.stopSession(id), false, false);
  }

  function selectSession(id: string) {
    setActiveSessionId(id);
    updatePreferences({
      currentView: "chat",
      ...(isNarrowViewport() ? { inspectorOpen: true, navigatorOpen: false } : {}),
    });
  }

  const reorderSessions = useCallback((sessionIds: string[], section: { organizationStatus: "active" | "completed" | "archived"; pinned: boolean; expectedRevisions: Record<string, number> }) => {
    void runAction(() => api.reorderSessions(sessionIds, section.expectedRevisions, section.organizationStatus, section.pinned), false, false);
  }, []);

  async function openFolder() {
    if (pickerBusyRef.current) return;
    pickerBusyRef.current = true;
    setPickerBusy(true);
    try {
      if (platform.kind === "tauri") {
        const picked = await platform.pickFolder();
        if (picked) {
          const name = picked.split("/").filter(Boolean).pop() ?? picked;
          await runAction(async () => { await api.createWorkspace({ name, path: picked }); }, false);
          return;
        }
      }
      await runAction(async () => {
        const result = await api.pickWorkspace();
        if (!result.cancelled) {
          const existingSession = state.sessions.find((session) => session.workspaceId === result.workspace.id);
          if (existingSession) setActiveSessionId(existingSession.id);
        }
      }, false, false, overlay === "settings");
    } finally {
      pickerBusyRef.current = false;
      setPickerBusy(false);
    }
  }

  const sendPrompt = useCallback(async (content: string, clientMessageId: string) => {
    if (!activeSession) return;
    const result = await api.sendMessage(activeSession.id, { clientMessageId, content, startIfStopped: true, confirmedStart: true });
    await refresh();
    return result;
  }, [activeSession, refresh]);

  // 会话列表的轮次进行中指示（frontend-spec §6）：由 ChatView 上报轮次活动
  const reportTurnActivity = useCallback((sessionId: string, turnId?: string) => {
    setActiveTurns((current) => {
      if (turnId) return current[sessionId] === turnId ? current : { ...current, [sessionId]: turnId };
      if (!(sessionId in current)) return current;
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
  }, []);

  const updateLaunchConfig = useCallback((change: Partial<SessionLaunchConfig>) => {
    if (!activeSession) return;
    void runAction(() => api.updateLaunchConfig(activeSession.id, change, activeSession.revision ?? 1), false, false);
  }, [activeSession]);

  const showRightPanel = preferences.currentView === "quest-home" || preferences.currentView === "chat";

  if (loading) return <main className="center-state"><span className="brand-orbit" aria-hidden="true">✦</span>{t("loadingWorkspace")}</main>;
  if (loadError) return <main className="center-state"><Icon name="warning" /><strong>{t("failedToLoadWorkspace")}</strong><Button variant="secondary" className="secondary-button" onClick={() => { setLoading(true); void refresh(true); }}><Icon name="refresh" />{t("retry")}</Button></main>;

  return <div className="qoder-app">
    <TitleBar title={activeSession?.name} workspaceName={activeWorkspace?.name} sidebarOpen={preferences.navigatorOpen} rightPanelOpen={showRightPanel && preferences.inspectorOpen} onToggleSidebar={() => updatePreferences({ navigatorOpen: !preferences.navigatorOpen })} onToggleRightPanel={() => updatePreferences({ inspectorOpen: !preferences.inspectorOpen })} />
    <main className={`qoder-body ${preferences.navigatorOpen ? "sidebar-open" : ""} ${showRightPanel && preferences.inspectorOpen ? "right-open" : ""}`}>
      {preferences.navigatorOpen && <Sidebar sessions={state.sessions} groups={groupedSessions} workspaces={state.workspaces} activeSessionId={activeSessionId} activeTurns={activeTurns} currentView={preferences.currentView} grouping={preferences.sessionGrouping} filter={preferences.sessionFilter} readonly={readonly} openFolderBusy={pickerBusy} onViewChange={handleViewChange} onNewQuest={() => { updatePreferences({ currentView: "quest-home" }); setOverlay("new-session"); }} onSelectSession={selectSession} onGroupingChange={(sessionGrouping) => updatePreferences({ sessionGrouping })} onFilterChange={(sessionFilter) => updatePreferences({ sessionFilter })} onReorder={reorderSessions} onOpenFolder={openFolder} onOpenSettings={() => setOverlay("settings")} onRename={(session) => { setActiveSessionId(session.id); setOverlay("rename"); }} onPin={(session) => void runAction(() => api.pinSession(session.id, !session.pinned, session.revision ?? 1), false)} onComplete={(session) => { setActiveSessionId(session.id); if (session.organizationStatus === "completed") void runAction(() => api.restoreSession(session.id, session.revision ?? 1), false); else setOverlay("complete-session"); }} onArchive={(session) => { setActiveSessionId(session.id); if (session.organizationStatus === "archived") void runAction(() => api.restoreSession(session.id, session.revision ?? 1), false); else setOverlay("archive-session"); }} onFork={(session) => { setActiveSessionId(session.id); setOverlay("fork-session"); }} onDelete={(session) => { setActiveSessionId(session.id); setOverlay("delete-session"); }} onClose={() => updatePreferences({ navigatorOpen: false })} />}
      {preferences.navigatorOpen && <Button unstyled className="drawer-backdrop navigator-backdrop" aria-label={t("closeSessionList")} onClick={() => updatePreferences({ navigatorOpen: false })} />}
      <div className="qoder-main-column">
        <MainArea currentView={preferences.currentView} activeSession={activeSession} activeWorkspace={activeWorkspace} activeProfile={activeProfile} workspaces={state.workspaces} readonly={readonly} centerView={activeSession ? preferences.centerViewBySession[activeSession.id] ?? "transcript" : "transcript"} onCenterViewChange={(view) => activeSession && updatePreferences({ centerViewBySession: { ...preferences.centerViewBySession, [activeSession.id]: view } })} onLaunchConfigChange={updateLaunchConfig} onNewSession={() => setOverlay("new-session")} onSendPrompt={sendPrompt} onStatus={refreshStatus} onOpenSettings={() => handleViewChange("settings")} onResume={resumeSession} onStop={stopSession} onTurnActivity={reportTurnActivity} />
      </div>
      {showRightPanel && preferences.inspectorOpen && activeSession && <RightPanel session={activeSession} workspace={activeWorkspace} profile={activeProfile} readonly={readonly} activeTab={preferences.rightPanelTab} onTabChange={(tab) => updatePreferences({ rightPanelTab: tab as UiPreferencesV1["rightPanelTab"] })} onClose={() => updatePreferences({ inspectorOpen: false })} />}
      {showRightPanel && preferences.inspectorOpen && activeSession && <Button unstyled className="drawer-backdrop inspector-backdrop" aria-label={t("closeSessionDetails")} onClick={() => updatePreferences({ inspectorOpen: false })} />}
      {overlay === "new-session" && <NewSessionDialog workspaces={state.workspaces} profiles={state.profiles} readonly={readonly} onClose={() => setOverlay(undefined)} onCreate={createSession} onOpenSettings={() => setOverlay("settings")} />}
      {overlay === "settings" && <WorkspaceProfileManager workspaces={state.workspaces} profiles={state.profiles} sessions={state.sessions} readonly={readonly} onClose={() => setOverlay(undefined)} onOpenFolder={openFolder} onCreateWorkspace={async (input) => runAction(() => api.createWorkspace(input), false)} onCreateProfile={async (input) => runAction(() => api.createProfile(input), false)} onDeleteWorkspace={(item) => setPendingDelete({ type: "workspace", item })} onDeleteProfile={(item) => setPendingDelete({ type: "profile", item })} />}
      {overlay === "resume" && activeSession && <ActionDialog title={`${t("resume")} ${activeSession.name}?`} description={t("resumeDescription", { profile: activeProfile?.name ?? t("profileFallback"), workspace: activeWorkspace?.path ?? t("thisWorkspace") })} confirmLabel={t("resumeSession")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.startSession(activeSession.id))} />}
      {overlay === "archive-session" && activeSession && <ActionDialog danger title={t("archiveSessionTitle")} description={t("archiveSessionDescription", { name: activeSession.name })} confirmLabel={t("archive")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.archiveSession(activeSession.id, activeSession.revision ?? 1, true))} />}
      {overlay === "complete-session" && activeSession && <ActionDialog title={t("completeSessionTitle")} description={t("completeSessionDescription", { name: activeSession.name })} confirmLabel={t("complete")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.completeSession(activeSession.id, activeSession.revision ?? 1, true))} />}
      {overlay === "fork-session" && activeSession && <ActionDialog title={t("forkSessionTitle")} description={t("forkSessionDescription", { name: activeSession.name })} confirmLabel={t("fork")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(async () => { const fork = await api.forkSession(activeSession.id, activeSession.revision ?? 1); setActiveSessionId(fork.session.id); })} />}
      {overlay === "rename" && activeSession && <ActionDialog title={t("renameSessionTitle")} description={t("renameSessionDescription")} inputLabel={t("sessionName")} initialValue={activeSession.name} confirmLabel={t("saveName")} onClose={() => setOverlay(undefined)} onConfirm={(value) => runAction(() => api.renameSession(activeSession.id, value!, activeSession.revision ?? 1))} />}
      {overlay === "delete-session" && activeSession && <ActionDialog danger title={t("deleteSessionTitle")} description={t("deleteSessionDescription", { name: activeSession.name })} confirmLabel={t("deleteSession")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.deleteSession(activeSession.id))} />}
      {pendingDelete && <ActionDialog danger title={`${t("delete")} ${pendingDelete.item.name}?`} description={pendingDelete.type === "workspace" ? t("deleteWorkspaceDescription") : t("deleteProfileDescription")} confirmLabel={t("delete")} onClose={() => setPendingDelete(undefined)} onConfirm={async () => { const target = pendingDelete; setPendingDelete(undefined); await runAction(() => target.type === "workspace" ? api.deleteWorkspace(target.item.id) : api.deleteProfile(target.item.id), false); }} />}
    </main>
  </div>;
}

function isNarrowViewport() { return typeof window !== "undefined" && window.innerWidth < 900; }
