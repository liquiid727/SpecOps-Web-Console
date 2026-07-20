import { useCallback, useEffect, useMemo, useState } from "react";
import type { CliProfileV2, WorkspaceV2 } from "../../shared/types";
import { api, type ClientAppState, mergeState } from "../api";
import { useI18n } from "../i18n";
import { ActionDialog } from "../components/ActionDialog";
import { LanguageToggle } from "../components/LanguageToggle";
import { NewSessionDialog } from "../components/NewSessionDialog";
import { SessionInspector } from "../components/SessionInspector";
import { SessionNavigator } from "../components/SessionNavigator";
import { SessionWorkspace } from "../components/SessionWorkspace";
import { WorkspaceProfileManager } from "../components/WorkspaceProfileManager";
import { Icon } from "../components/ui/Icon";

const emptyState: ClientAppState = { workspaces: [], profiles: [], sessions: [] };
const preferencesKey = "product-ai-os-cli-gui-ui-preferences-v1";
type OverlayState = "new-session" | "settings" | "resume" | "rename" | "delete-session" | undefined;
type PendingDelete = { type: "workspace"; item: WorkspaceV2 } | { type: "profile"; item: CliProfileV2 } | undefined;

export function App() {
  const { t } = useI18n();
  const [state, setState] = useState<ClientAppState>(emptyState);
  const [readonly, setReadonly] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [navigatorOpen, setNavigatorOpen] = useState(() => readPreferences().navigatorOpen);
  const [inspectorOpen, setInspectorOpen] = useState(() => readPreferences().inspectorOpen);
  const [overlay, setOverlay] = useState<OverlayState>();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>();

  const refresh = useCallback(async () => {
    try {
      const next = await api.state();
      setState((previous) => mergeState(previous, next));
      setReadonly(next.readonly);
      setActiveSessionId((current) => current && next.sessions.some((session) => session.id === current) ? current : next.sessions[0]?.id);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("failedToLoadWorkspace"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [role='dialog'], .xterm")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setNavigatorOpen((open) => !open);
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "i") {
        event.preventDefault();
        if (activeSessionId) setInspectorOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [activeSessionId]);

  useEffect(() => {
    window.localStorage.setItem(preferencesKey, JSON.stringify({ navigatorOpen, inspectorOpen }));
  }, [navigatorOpen, inspectorOpen]);

  const activeSession = state.sessions.find((session) => session.id === activeSessionId);
  const activeWorkspace = state.workspaces.find((workspace) => workspace.id === activeSession?.workspaceId);
  const activeProfile = state.profiles.find((profile) => profile.id === activeSession?.profileId);
  const groupedSessions = useMemo(() => state.workspaces.map((workspace) => ({
    workspace,
    sessions: state.sessions
      .filter((session) => session.workspaceId === workspace.id)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.manualOrder - b.manualOrder || b.lastActiveAt.localeCompare(a.lastActiveAt))
  })), [state]);

  async function runAction(action: () => Promise<unknown>, closeOverlay = true) {
    try {
      await action();
      if (closeOverlay) setOverlay(undefined);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("operationFailed"));
    }
  }

  async function createSession(input: { name: string; workspaceId: string; profileId: string }) {
    await runAction(async () => {
      const session = await api.createSession({ ...input, confirmed: true });
      setActiveSessionId(session.id);
    });
  }

  function selectSession(id: string) {
    setActiveSessionId(id);
    setInspectorOpen(false);
    if (window.innerWidth < 900) setNavigatorOpen(false);
  }

  if (loading) return <main className="center-state"><span className="brand-orbit">✦</span>{t("loadingWorkspace")}</main>;

  return <main className={`app-shell ${navigatorOpen ? "navigator-visible" : ""} ${inspectorOpen && activeSession ? "inspector-visible" : ""}`}>
    <aside className="utility-rail" aria-label={t("appControls")}>
      <div className="brand-mark" title={t("brandTitle")}>✦</div>
      <div className="rail-actions">
        <button className="rail-button primary" onClick={() => setOverlay("new-session")} aria-label={t("newSession")} title={t("newSession")}><Icon name="add" /></button>
        <button className={`rail-button ${navigatorOpen ? "active" : ""}`} onClick={() => setNavigatorOpen((open) => !open)} aria-label={t("toggleSessions")} title={`${t("toggleSessions")} (⌘B)`} aria-expanded={navigatorOpen} aria-controls="session-navigator"><Icon name="menu" /></button>
      </div>
      <div className="rail-spacer" />
      <LanguageToggle />
      <button className="rail-button" onClick={() => setOverlay("settings")} aria-label={t("openSettings")} title={t("workspaceSettings")}><Icon name="settings" /></button>
      <span className={`connection-dot ${readonly ? "readonly" : ""}`} title={readonly ? t("readonlyMode") : t("localMode")} />
    </aside>

    {navigatorOpen && <SessionNavigator groups={groupedSessions} activeSessionId={activeSessionId} onArchive={(session) => void runAction(() => session.organizationStatus === "archived" ? api.restoreSession(session.id, session.revision) : api.archiveSession(session.id, session.revision), false)} onComplete={(session) => void runAction(() => session.organizationStatus === "completed" ? api.restoreSession(session.id, session.revision) : api.completeSession(session.id, session.revision), false)} onFork={(session) => void runAction(async () => { const fork = await api.forkSession(session.id, session.revision); setActiveSessionId(fork.session.id); }, false)} onPin={(session) => void runAction(() => api.pinSession(session.id, !session.pinned, session.revision), false)} onSelect={selectSession} onNewSession={() => setOverlay("new-session")} />}

    <div className="main-column">
      {error && <div className="alert" role="alert"><span>{error}</span><button onClick={() => setError(undefined)}>{t("dismiss")}</button></div>}
      <SessionWorkspace session={activeSession} workspace={activeWorkspace} profile={activeProfile} readonly={readonly} onNewSession={() => setOverlay("new-session")} onOpenInspector={() => setInspectorOpen(true)} onStop={() => void runAction(() => api.stopSession(activeSession!.id), false)} onResume={() => setOverlay("resume")} onStatus={() => void refresh()} />
    </div>

    {inspectorOpen && activeSession && <SessionInspector session={activeSession} workspace={activeWorkspace} profile={activeProfile} readonly={readonly} onClose={() => setInspectorOpen(false)} onRename={() => setOverlay("rename")} onDelete={() => setOverlay("delete-session")} />}

    {overlay === "new-session" && <NewSessionDialog workspaces={state.workspaces} profiles={state.profiles} readonly={readonly} onClose={() => setOverlay(undefined)} onCreate={createSession} onOpenSettings={() => setOverlay("settings")} />}
    {overlay === "settings" && <WorkspaceProfileManager workspaces={state.workspaces} profiles={state.profiles} sessions={state.sessions} readonly={readonly} onClose={() => setOverlay(undefined)} onOpenFolder={async () => runAction(async () => { const result = await api.pickWorkspace(); if (!result.cancelled) setActiveSessionId((current) => current); }, false)} onCreateWorkspace={async (input) => runAction(() => api.createWorkspace(input), false)} onCreateProfile={async (input) => runAction(() => api.createProfile(input), false)} onDeleteWorkspace={(item) => setPendingDelete({ type: "workspace", item })} onDeleteProfile={(item) => setPendingDelete({ type: "profile", item })} />}
    {overlay === "resume" && activeSession && <ActionDialog title={`${t("resume")} ${activeSession.name}?`} description={t("resumeDescription", { profile: activeProfile?.name ?? t("profileFallback"), workspace: activeWorkspace?.path ?? t("thisWorkspace") })} confirmLabel={t("resumeSession")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.startSession(activeSession.id))} />}
    {overlay === "rename" && activeSession && <ActionDialog title={t("renameSessionTitle")} description={t("renameSessionDescription")} inputLabel={t("sessionName")} initialValue={activeSession.name} confirmLabel={t("saveName")} onClose={() => setOverlay(undefined)} onConfirm={(value) => runAction(() => api.renameSession(activeSession.id, value!, activeSession.revision))} />}
    {overlay === "delete-session" && activeSession && <ActionDialog danger title={t("deleteSessionTitle")} description={t("deleteSessionDescription", { name: activeSession.name })} confirmLabel={t("deleteSession")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => api.deleteSession(activeSession.id))} />}
    {pendingDelete && <ActionDialog danger title={`${t("delete")} ${pendingDelete.item.name}?`} description={pendingDelete.type === "workspace" ? t("deleteWorkspaceDescription") : t("deleteProfileDescription")} confirmLabel={t("delete")} onClose={() => setPendingDelete(undefined)} onConfirm={async () => { const target = pendingDelete; setPendingDelete(undefined); await runAction(() => target.type === "workspace" ? api.deleteWorkspace(target.item.id) : api.deleteProfile(target.item.id), false); }} />}
  </main>;
}

function readPreferences() {
  if (typeof window === "undefined") return { navigatorOpen: true, inspectorOpen: false };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(preferencesKey) ?? "{}") as Partial<{ navigatorOpen: boolean; inspectorOpen: boolean }>;
    return { navigatorOpen: parsed.navigatorOpen ?? true, inspectorOpen: parsed.inspectorOpen ?? false };
  } catch {
    return { navigatorOpen: true, inspectorOpen: false };
  }
}
