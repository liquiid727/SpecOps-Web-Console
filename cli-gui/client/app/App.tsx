import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CliProfile, WorkspaceV2 } from "../../shared/types";
import { api, type ClientAppState, mergeState } from "../api";
import { useI18n, type TranslationKey } from "../i18n";
import { toFeedbackError } from "../feedback-errors";
import { ActionDialog } from "../components/ActionDialog";
import { LanguageToggle } from "../components/LanguageToggle";
import { NewSessionDialog } from "../components/NewSessionDialog";
import { SessionInspector } from "../components/SessionInspector";
import { SessionNavigator } from "../components/SessionNavigator";
import { SessionWorkspace } from "../components/SessionWorkspace";
import { WorkspaceProfileManager } from "../components/WorkspaceProfileManager";
import { Icon } from "../components/ui/Icon";
import { useFeedback } from "../components/ui/Feedback";
import { defaultPreferences, readPreferences, writePreferences, type UiPreferencesV1 } from "./preferences";
import { groupSessions } from "./session-selectors";

const emptyState: ClientAppState = { workspaces: [], profiles: [], sessions: [] };
type OverlayState = "new-session" | "settings" | "resume" | "rename" | "delete-session" | "archive-session" | "complete-session" | "fork-session" | undefined;
type PendingDelete = { type: "workspace"; item: WorkspaceV2 } | { type: "profile"; item: CliProfile } | undefined;

export function App() {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [state, setState] = useState<ClientAppState>(emptyState);
  const [readonly, setReadonly] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<UiPreferencesV1>(() => readPreferences());
  const [overlay, setOverlay] = useState<OverlayState>();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>();
  const [pickerBusy, setPickerBusy] = useState(false);
  const pickerBusyRef = useRef(false);

  const updatePreferences = useCallback((update: Partial<UiPreferencesV1>) => {
    setPreferences((current) => ({ ...current, ...update, centerViewBySession: update.centerViewBySession ?? current.centerViewBySession }));
  }, []);

  const refresh = useCallback(async (notify = false) => {
    try {
      const next = await api.state();
      setState((previous) => mergeState(previous, next));
      setReadonly(next.readonly);
      setActiveSessionId((current) => current && next.sessions.some((session) => session.id === current) ? current : next.sessions[0]?.id);
    } catch (cause) {
      if (notify) feedback.error(toFeedbackError(cause, t, "failedToLoadWorkspace", "state-load"));
    } finally {
      setLoading(false);
    }
  }, [feedback, t]);

  useEffect(() => { void refresh(true); const timer = window.setInterval(() => void refresh(), 2000); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => { writePreferences(preferences); }, [preferences]);
  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [role='dialog'], .xterm")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") { event.preventDefault(); updatePreferences({ navigatorOpen: !preferences.navigatorOpen }); }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "i" && activeSessionId) { event.preventDefault(); updatePreferences({ inspectorOpen: !preferences.inspectorOpen }); }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [activeSessionId, preferences.inspectorOpen, preferences.navigatorOpen, updatePreferences]);

  const activeSession = state.sessions.find((session) => session.id === activeSessionId);
  const activeWorkspace = state.workspaces.find((workspace) => workspace.id === activeSession?.workspaceId);
  const activeProfile = state.profiles.find((profile) => profile.id === activeSession?.profileId);
  const groupedSessions = useMemo(() => groupSessions(state.sessions, state.workspaces, preferences.sessionGrouping, preferences.sessionFilter), [preferences.sessionFilter, preferences.sessionGrouping, state.sessions, state.workspaces]);

  async function runAction(action: () => Promise<unknown>, closeOverlay = true, success: TranslationKey | false = "operationCompleted") {
    try {
      await action();
      if (closeOverlay) window.setTimeout(() => setOverlay(undefined), 160);
      if (success) feedback.success({ title: t(success) });
      await refresh();
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t));
      await refresh();
    }
  }

  async function createSession(input: { name: string; workspaceId: string; profileId: string }) {
    await runAction(async () => {
      const result = await api.createSession({ ...input, start: true, confirmed: true });
      setActiveSessionId(result.session?.id ?? result.id);
    }, true, "sessionCreated");
  }

  function selectSession(id: string) {
    setActiveSessionId(id);
    updatePreferences({ inspectorOpen: false });
    if (window.innerWidth < 900) updatePreferences({ navigatorOpen: false });
  }

  function closeNavigator() {
    updatePreferences({ navigatorOpen: false });
    window.setTimeout(() => document.querySelector<HTMLElement>("[aria-controls='session-navigator']")?.focus(), 0);
  }

  function closeInspector() {
    updatePreferences({ inspectorOpen: false });
    window.setTimeout(() => document.querySelector<HTMLElement>("[aria-controls='session-inspector']")?.focus(), 0);
  }

  async function openFolder() {
    if (pickerBusyRef.current) return;
    pickerBusyRef.current = true;
    setPickerBusy(true);
    try {
      await runAction(async () => {
        const result = await api.pickWorkspace();
        if (!result.cancelled) {
          const existingSession = state.sessions.find((session) => session.workspaceId === result.workspace.id);
          if (existingSession) setActiveSessionId(existingSession.id);
        }
      }, false, false);
    } finally {
      pickerBusyRef.current = false;
      setPickerBusy(false);
    }
  }

  if (loading) return <main className="center-state"><span className="brand-orbit" aria-hidden="true">✦</span>{t("loadingWorkspace")}</main>;

  return <main className={`app-shell ${preferences.navigatorOpen ? "navigator-visible" : ""} ${preferences.inspectorOpen && activeSession ? "inspector-visible" : ""}`}>
    <aside className="utility-rail" aria-label={t("appControls")}>
      <div className="brand-mark" title={t("brandTitle")}>✦</div>
      <div className="rail-actions">
        <button className="rail-button primary" onClick={() => setOverlay("new-session")} aria-label={t("newSession")} title={t("newSession")}><Icon name="add" /></button>
        <button className={`rail-button ${preferences.navigatorOpen ? "active" : ""}`} onClick={() => updatePreferences({ navigatorOpen: !preferences.navigatorOpen })} aria-label={t("toggleSessions")} title={`${t("toggleSessions")} (⌘B)`} aria-expanded={preferences.navigatorOpen} aria-controls="session-navigator"><Icon name="menu" /></button>
      </div>
      <div className="rail-spacer" />
      <LanguageToggle />
      <button className="rail-button" onClick={() => setOverlay("settings")} aria-label={t("openSettings")} title={t("workspaceSettings")}><Icon name="settings" /></button>
      <span className={`connection-dot ${readonly ? "readonly" : ""}`} title={readonly ? t("readonlyMode") : t("localMode")} />
    </aside>

    {preferences.navigatorOpen && <SessionNavigator groups={groupedSessions} activeSessionId={activeSessionId} grouping={preferences.sessionGrouping} filter={preferences.sessionFilter} readonly={readonly} openFolderBusy={pickerBusy} onGroupingChange={(sessionGrouping) => updatePreferences({ sessionGrouping })} onFilterChange={(sessionFilter) => updatePreferences({ sessionFilter })} onOpenFolder={() => void openFolder()} onArchive={(session) => { setActiveSessionId(session.id); if (session.organizationStatus === "archived") void runAction(() => api.restoreSession(session.id, session.revision ?? 1), false); else setOverlay("archive-session"); }} onComplete={(session) => { setActiveSessionId(session.id); if (session.organizationStatus === "completed") void runAction(() => api.restoreSession(session.id, session.revision ?? 1), false); else setOverlay("complete-session"); }} onFork={(session) => { setActiveSessionId(session.id); setOverlay("fork-session"); }} onPin={(session) => void runAction(() => api.pinSession(session.id, !session.pinned, session.revision ?? 1), false)} onReorder={(orderedSessionIds, section) => void runAction(() => api.reorderSessions(orderedSessionIds, section.expectedRevisions, section.organizationStatus, section.pinned), false)} onRename={(session) => { setActiveSessionId(session.id); setOverlay("rename"); }} onDelete={(session) => { setActiveSessionId(session.id); setOverlay("delete-session"); }} onSelect={selectSession} onNewSession={() => setOverlay("new-session")} />}
    {preferences.navigatorOpen && <button className="drawer-backdrop navigator-backdrop" aria-label={t("closeSessionList")} onClick={closeNavigator} />}

    <div className="main-column">
      <SessionWorkspace session={activeSession} workspace={activeWorkspace} profile={activeProfile} readonly={readonly} centerView={activeSession ? preferences.centerViewBySession[activeSession.id] ?? "transcript" : "transcript"} onCenterViewChange={(centerView) => activeSession && updatePreferences({ centerViewBySession: { ...preferences.centerViewBySession, [activeSession.id]: centerView } })} onLaunchConfigChange={(change) => activeSession && void runAction(() => api.updateLaunchConfig(activeSession.id, change, activeSession.revision ?? 1), false)} onNewSession={() => setOverlay("new-session")} inspectorOpen={preferences.inspectorOpen} onOpenInspector={() => updatePreferences({ inspectorOpen: true })} onStop={() => activeSession && void runAction(() => api.stopSession(activeSession.id), false)} onResume={() => setOverlay("resume")} onStatus={() => void refresh()} />
    </div>

    {preferences.inspectorOpen && activeSession && <SessionInspector session={activeSession} workspace={activeWorkspace} profile={activeProfile} readonly={readonly} initialTab={preferences.inspectorTab} onTabChange={(inspectorTab) => updatePreferences({ inspectorTab })} onClose={() => updatePreferences({ inspectorOpen: false })} onRename={() => setOverlay("rename")} onDelete={() => setOverlay("delete-session")} />}
    {preferences.inspectorOpen && activeSession && <button className="drawer-backdrop inspector-backdrop" aria-label={t("closeSessionDetails")} onClick={closeInspector} />}
    {overlay === "new-session" && <NewSessionDialog workspaces={state.workspaces} profiles={state.profiles} readonly={readonly} onClose={() => setOverlay(undefined)} onCreate={createSession} onOpenSettings={() => setOverlay("settings")} />}
    {overlay === "settings" && <WorkspaceProfileManager workspaces={state.workspaces} profiles={state.profiles} sessions={state.sessions} readonly={readonly} onClose={() => setOverlay(undefined)} onOpenFolder={openFolder} onCreateWorkspace={async (input) => runAction(() => api.createWorkspace(input), false)} onCreateProfile={async (input) => runAction(() => api.createProfile(input), false)} onDeleteWorkspace={(item) => setPendingDelete({ type: "workspace", item })} onDeleteProfile={(item) => setPendingDelete({ type: "profile", item })} />}
    {overlay === "resume" && activeSession && <ActionDialog title={`${t("resume")} ${activeSession.name}?`} description={t("resumeDescription", { profile: activeProfile?.name ?? t("profileFallback"), workspace: activeWorkspace?.path ?? t("thisWorkspace") })} confirmLabel={t("resumeSession")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.startSession(activeSession.id))} />}
    {overlay === "archive-session" && activeSession && <ActionDialog danger title={t("archiveSessionTitle")} description={t("archiveSessionDescription", { name: activeSession.name })} confirmLabel={t("archive")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.archiveSession(activeSession.id, activeSession.revision ?? 1, true))} />}
    {overlay === "complete-session" && activeSession && <ActionDialog title={t("completeSessionTitle")} description={t("completeSessionDescription", { name: activeSession.name })} confirmLabel={t("complete")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.completeSession(activeSession.id, activeSession.revision ?? 1, true))} />}
    {overlay === "fork-session" && activeSession && <ActionDialog title={t("forkSessionTitle")} description={t("forkSessionDescription", { name: activeSession.name })} confirmLabel={t("fork")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(async () => { const fork = await api.forkSession(activeSession.id, activeSession.revision ?? 1); setActiveSessionId(fork.session.id); })} />}
    {overlay === "rename" && activeSession && <ActionDialog title={t("renameSessionTitle")} description={t("renameSessionDescription")} inputLabel={t("sessionName")} initialValue={activeSession.name} confirmLabel={t("saveName")} onClose={() => setOverlay(undefined)} onConfirm={(value) => runAction(() => api.renameSession(activeSession.id, value!, activeSession.revision ?? 1))} />}
    {overlay === "delete-session" && activeSession && <ActionDialog danger title={t("deleteSessionTitle")} description={t("deleteSessionDescription", { name: activeSession.name })} confirmLabel={t("deleteSession")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.deleteSession(activeSession.id))} />}
    {pendingDelete && <ActionDialog danger title={`${t("delete")} ${pendingDelete.item.name}?`} description={pendingDelete.type === "workspace" ? t("deleteWorkspaceDescription") : t("deleteProfileDescription")} confirmLabel={t("delete")} onClose={() => setPendingDelete(undefined)} onConfirm={async () => { const target = pendingDelete; setPendingDelete(undefined); await runAction(() => target.type === "workspace" ? api.deleteWorkspace(target.item.id) : api.deleteProfile(target.item.id), false); }} />}
  </main>;
}
