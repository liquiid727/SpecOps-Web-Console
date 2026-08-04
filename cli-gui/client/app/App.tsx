import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../components/ui/Icon";
import type { DowngradeReason, SessionLaunchConfig, SessionWithCompatibilityStatus } from "../../shared/types";
import type { RunRouteOverride } from "../../shared/model-route";
import { useI18n, type TranslationKey } from "../i18n";
import { CHAT_ENABLED } from "../feature-flags";
import { toFeedbackError } from "../feedback-errors";
import { ActionDialog } from "../components/ActionDialog";
import { NewSessionDialog } from "../components/NewSessionDialog";
import { TitleBar } from "../components/TitleBar";
import { Sidebar } from "../components/Sidebar";
import { MainArea } from "../components/MainArea";
import { RightPanel } from "../components/RightPanel";
import { WorkspaceProfileManager } from "../components/WorkspaceProfileManager";
import { useFeedback } from "../components/ui/Feedback";
import { cycleWorkMode, type UiPreferencesV1 } from "./preferences";
import { useAppStore, usePreferencesStore, useUiStore } from "./store";
import { matchesShortcut } from "./shortcuts";
import { groupSessions } from "./session-selectors";
import { useClientRuntime } from "../runtime/client-runtime";
import { Badge, Button } from "../components/ui";
import { SplashScreen } from "../components/SplashScreen";

const DOWNGRADE_REASON_KEY: Record<DowngradeReason, TranslationKey> = {
  "command-missing": "sessionDowngradeReasonCommandMissing",
  "version-out-of-range": "sessionDowngradeReasonVersionOutOfRange",
  "unknown-version": "sessionDowngradeReasonUnknownVersion",
  "adapter-unsupported": "sessionDowngradeReasonAdapterUnsupported",
  "capability-detect-failed": "sessionDowngradeReasonCapabilityDetectFailed"
};
// 视图切换快捷键：定义源在 app/shortcuts.ts，此处仅映射 shortcut id → 视图（console-gaps SPEC §4）
const SHORTCUT_VIEWS: Record<string, UiPreferencesV1["currentView"]> = { "view-quest-home": "quest-home", "view-chat": "chat", "view-knowledge": "knowledge", "view-marketplace": "marketplace", "view-settings": "settings" };

export function App() {
  const { t, statusLabel } = useI18n();
  const feedback = useFeedback();
  const [splashDismissed, setSplashDismissed] = useState(false);
  // 状态管理统一走 Zustand（frontend-spec §9）：服务端镜像 / UI 偏好 / 瞬态 UI 三切片；toast 与 i18n 编排留在组件层
  const { state, readonly, loading, loadError, activeSessionId, activeTurns, refresh: refreshState, markLoading, setActiveSessionId, reportTurnActivity } = useAppStore();
  const preferences = usePreferencesStore((store) => store.preferences);
  const updatePreferences = usePreferencesStore((store) => store.update);
  const { overlay, pendingDelete, pickerBusy, newSessionDefaultMode, questDraftActive, questDraftWorkspaceId, setOverlay, setPendingDelete, setPickerBusy, setNewSessionDefaultMode, setQuestDraftActive, setQuestDraftWorkspaceId } = useUiStore();
  const runtime = useClientRuntime();
  const platform = runtime.platform;

  // 右侧检查器默认隐藏：切视图只改 currentView，面板仅由用户通过标题栏开关 / ⌘J 主动打开
  const handleViewChange = useCallback((view: string) => {
    // 离开 Quest Home 即退出草稿态：侧栏占位行同步消失
    if (view !== "quest-home") {
      setQuestDraftActive(false);
      setQuestDraftWorkspaceId(undefined);
    }
    updatePreferences({ currentView: view as UiPreferencesV1["currentView"] });
  }, [setQuestDraftActive, setQuestDraftWorkspaceId, updatePreferences]);

  // 新建 Quest：进入草稿态 —— 侧栏 Quests 区顶部出现虚线占位行，右侧切到干净的 Quest Home 输入界面
  const startQuestDraft = useCallback((workspaceId?: string) => {
    setQuestDraftActive(true);
    setQuestDraftWorkspaceId(workspaceId);
    updatePreferences({ currentView: "quest-home" });
  }, [setQuestDraftActive, setQuestDraftWorkspaceId, updatePreferences]);

  const refresh = useCallback(async (notify = false) => {
    const cause = await refreshState();
    if (cause !== undefined && notify) feedback.error(toFeedbackError(cause, t, "failedToLoadWorkspace", "state-load"));
  }, [feedback, refreshState, t]);
  const refreshStatus = useCallback(() => { void refresh(); }, [refresh]);

  useEffect(() => { void refresh(true); const timer = window.setInterval(() => void refresh(), 2000); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      // Ctrl+Tab / Ctrl+Shift+Tab 循环工作模式：输入框聚焦时同样生效，仅终端内保留原按键（console-gaps SPEC §3）
      if (!target?.closest(".xterm") && (matchesShortcut(event, "work-mode-next") || matchesShortcut(event, "work-mode-previous"))) {
        event.preventDefault();
        updatePreferences({ composerWorkMode: cycleWorkMode(preferences.composerWorkMode, matchesShortcut(event, "work-mode-previous") ? -1 : 1) });
        return;
      }
      if (target?.closest("input, select, textarea, [role='dialog'], .xterm")) return;
      if (matchesShortcut(event, "toggle-navigator")) { event.preventDefault(); updatePreferences({ navigatorOpen: !preferences.navigatorOpen }); }
      // ⌘J / ⌘⇧I 切换右栏 Runtime Monitor drawer（frontend-spec §2：⌘B/⌘J/⌘N B 段验收）
      if ((matchesShortcut(event, "toggle-inspector") || matchesShortcut(event, "toggle-inspector-alt")) && activeSessionId) { event.preventDefault(); updatePreferences({ inspectorOpen: !preferences.inspectorOpen }); }
      // ⌘N 新建 Quest：直接进入 Quest Home 草稿态（composer 输入、发送时才创建会话），不弹表单
      if (matchesShortcut(event, "new-session")) { event.preventDefault(); startQuestDraft(); }
      // ⌘⇧C / ⌘⇧L 快捷切换 CLI 模式（cli-structured-tui-adaptation spec §2.2）
      if (matchesShortcut(event, "cli-mode-codex")) { event.preventDefault(); updatePreferences({ cliMode: "codex-cli" }); }
      if (matchesShortcut(event, "cli-mode-claude")) { event.preventDefault(); updatePreferences({ cliMode: "claude-cli" }); }
      // ⌘/Ctrl + 1..5 switch the primary view (Quest Home, Chat, Knowledge, Marketplace, Settings).
      for (const [id, view] of Object.entries(SHORTCUT_VIEWS)) {
        if (!matchesShortcut(event, id)) continue;
        if (view === "chat" && !activeSessionId) return;
        event.preventDefault();
        handleViewChange(view);
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [activeSessionId, handleViewChange, preferences.composerWorkMode, preferences.inspectorOpen, preferences.navigatorOpen, startQuestDraft, updatePreferences]);

  const activeSession = state.sessions.find((session) => session.id === activeSessionId) as SessionWithCompatibilityStatus | undefined;
  const activeWorkspace = state.workspaces.find((workspace) => workspace.id === activeSession?.workspaceId);
  const activeProfile = state.profiles.find((profile) => profile.id === activeSession?.profileId);
  const questGroups = useMemo(() => groupSessions(state.sessions, state.workspaces, preferences.sessionGrouping, preferences.sessionFilter, "terminal"), [preferences.sessionFilter, preferences.sessionGrouping, state.sessions, state.workspaces]);
  const chatGroups = useMemo(() => groupSessions(state.sessions, state.workspaces, preferences.sessionGrouping, preferences.sessionFilter, "chat"), [preferences.sessionFilter, preferences.sessionGrouping, state.sessions, state.workspaces]);

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

  async function createSession(input: { name: string; workspaceId: string; profileId: string; interactionMode?: "chat" | "terminal"; modelRouteId?: string; providerId?: string }) {
    await runAction(async () => {
      // chat 功能开关关闭：无论入口传入什么，一律降级 terminal（console-gaps SPEC §1）
      // 优先使用最后使用模型（issue-055）
      const lastModel = preferences.modelPreferences.lastUsedModel[input.profileId] || undefined;
      const result = await runtime.sessions.createSession({ ...input, interactionMode: CHAT_ENABLED ? input.interactionMode ?? "chat" : "terminal", start: true, confirmed: true, ...(lastModel ? { launchConfig: { model: lastModel } } : {}) });
      // profile 不支持 headless → 服务端降级 terminal，一次性说明（api-spec §2.6 / frontend-spec 降级说明）
      if (result.interactionModeDowngraded) feedback.warning({ title: t("sessionDowngradedToTerminal"), description: result.downgradeReason ? t(DOWNGRADE_REASON_KEY[result.downgradeReason]) : undefined });
      setActiveSessionId(result.session?.id ?? result.id);
      setQuestDraftActive(false);
      setQuestDraftWorkspaceId(undefined);
      updatePreferences({ currentView: "chat" });
    }, true, false);
  }

  // Quest Home 一次提交创建流：Chat-first；不支持 headless 的 profile 由服务端显式降级 terminal
  // 创建失败直接 reject：composer 保留输入并提示错误码文案；创建成功但首轮失败仍进入会话（可在会话内重发）
  const quickCreateSession = useCallback(async (input: { content: string; workspaceId: string; profileId: string; model?: string }) => {
    const name = input.content.replace(/\s+/g, " ").trim().slice(0, 48) || t("newCliSession");
    // 模型优先级：本次显式选择 > 最后使用模型（issue-055）；显式选择同时写回记忆
    const model = input.model || preferences.modelPreferences.lastUsedModel[input.profileId] || undefined;
    if (input.model) updatePreferences({ modelPreferences: { lastUsedModel: { ...preferences.modelPreferences.lastUsedModel, [input.profileId]: input.model } } });
    const result = await runtime.sessions.createSession({ name, workspaceId: input.workspaceId, profileId: input.profileId, interactionMode: CHAT_ENABLED ? "chat" : "terminal", start: true, confirmed: true, ...(model ? { launchConfig: { model } } : {}) });
    if (result.interactionModeDowngraded) feedback.warning({ title: t("sessionDowngradedToTerminal"), description: result.downgradeReason ? t(DOWNGRADE_REASON_KEY[result.downgradeReason]) : undefined });
    const sessionId = result.session?.id ?? result.id;
    try {
      await runtime.sessions.sendMessage(sessionId, { clientMessageId: crypto.randomUUID(), content: input.content, startIfStopped: true, confirmedStart: true });
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t));
    }
    setActiveSessionId(sessionId);
    setQuestDraftActive(false);
    setQuestDraftWorkspaceId(undefined);
    updatePreferences({ currentView: "chat" });
    await refresh();
  }, [feedback, preferences.modelPreferences.lastUsedModel, refresh, runtime.sessions, setQuestDraftActive, setQuestDraftWorkspaceId, t, updatePreferences]);

  async function resumeSession(id: string) {
    await runAction(() => runtime.sessions.startSession(id), false, false);
  }

  async function stopSession(id: string) {
    await runAction(() => runtime.sessions.stopSession(id), false, false);
  }

  function selectSession(id: string) {
    setActiveSessionId(id);
    setQuestDraftActive(false);
    setQuestDraftWorkspaceId(undefined);
    updatePreferences({
      currentView: "chat",
      ...(isNarrowViewport() ? { navigatorOpen: false } : {}),
    });
  }

  const reorderSessions = useCallback((sessionIds: string[], section: { organizationStatus: "active" | "completed" | "archived"; pinned: boolean; expectedRevisions: Record<string, number> }) => {
    void runAction(() => runtime.sessions.reorderSessions(sessionIds, section.expectedRevisions, section.organizationStatus, section.pinned), false, false);
  }, [runtime.sessions]);

  async function openFolder() {
    if (useUiStore.getState().pickerBusy) return;
    setPickerBusy(true);
    try {
      if (platform.kind === "tauri") {
        const picked = await platform.pickFolder();
        if (picked) {
          const name = picked.split("/").filter(Boolean).pop() ?? picked;
          await runAction(async () => { await runtime.workspace.createWorkspace({ name, path: picked }); }, false);
          return;
        }
      }
      await runAction(async () => {
        const result = await runtime.workspace.pickWorkspace();
        if (!result.cancelled) {
          const existingSession = state.sessions.find((session) => session.workspaceId === result.workspace.id);
          if (existingSession) setActiveSessionId(existingSession.id);
        }
      }, false, false, overlay === "settings");
    } finally {
      setPickerBusy(false);
    }
  }

  const sendPrompt = useCallback(async (content: string, clientMessageId: string, routeOverride?: RunRouteOverride) => {
    if (!activeSession) return;
    const result = await runtime.sessions.sendMessage(activeSession.id, { clientMessageId, content, startIfStopped: true, confirmedStart: true, ...(routeOverride ? { routeOverride } : {}) });
    await refresh();
    return result;
  }, [activeSession, refresh, runtime.sessions]);

  // 会话列表的轮次进行中指示（frontend-spec §6）：由 ChatView 上报轮次活动，落入 useAppStore.reportTurnActivity

  const updateLaunchConfig = useCallback((change: Partial<SessionLaunchConfig>) => {
    if (!activeSession) return;
    void runAction(() => runtime.sessions.updateLaunchConfig(activeSession.id, change, activeSession.revision ?? 1), false, false);
  }, [activeSession, runtime.sessions]);

  const showRightPanel = preferences.currentView === "quest-home" || preferences.currentView === "chat";
  // 单一 header 行（参考 Qoder 桌面壳）：chat 视图的会话操作上移到标题栏，ChatView 不再渲染自己的头部
  const centerView = activeSession ? preferences.centerViewBySession[activeSession.id] ?? "transcript" : "transcript";
  const sessionStatus = activeSession ? activeSession.runtimeStatus ?? activeSession.status ?? "stopped" : "stopped";
  const sessionRunning = sessionStatus === "running" || sessionStatus === "starting";
  // terminal 会话持有归因捕获的 resume 凭据时，恢复将续上上一次 CLI 会话而非全新启动
  const resumeTitle = activeSession?.interactionMode === "terminal" && activeSession.terminalContext?.resumeToken ? t("resumeContinuesCli") : undefined;

  // Splash 作为固定遮罩层覆盖在主界面之上；主界面始终在下方渲染，避免跃迁后白屏
  const splashOverlay = !splashDismissed && !loadError ? <SplashScreen ready={!loading} onEnter={() => setSplashDismissed(true)} /> : null;

  if (loading) return <>{splashOverlay}<main className="center-state"><span className="brand-orbit" aria-hidden="true">✦</span>{t("loadingWorkspace")}</main></>;
  if (loadError) return <main className="center-state"><Icon name="warning" /><strong>{t("failedToLoadWorkspace")}</strong><Button variant="secondary" className="secondary-button" onClick={() => { markLoading(); void refresh(true); }}><Icon name="refresh" />{t("retry")}</Button></main>;

  return <>{splashOverlay}<div className="qoder-app">
    <TitleBar title={activeSession?.name} workspaceName={activeWorkspace?.name} sidebarOpen={preferences.navigatorOpen} rightPanelOpen={showRightPanel && preferences.inspectorOpen} onToggleSidebar={() => updatePreferences({ navigatorOpen: !preferences.navigatorOpen })} onToggleRightPanel={() => updatePreferences({ inspectorOpen: !preferences.inspectorOpen })}>
      {preferences.currentView === "chat" && activeSession && <div className="chat-header-actions">
        <div className="center-view-toggle" role="radiogroup" aria-label={t("centerView")}>
          <Button unstyled role="radio" aria-checked={centerView === "transcript"} className={`toggle-item${centerView === "transcript" ? " active" : ""}`} onClick={() => { void runtime.sessions.switchView(activeSession.id, "gui", activeSession.revision ?? 1).then(() => refresh()).catch(() => undefined); updatePreferences({ centerViewBySession: { ...preferences.centerViewBySession, [activeSession.id]: "transcript" } }); }} title={t("transcript")}><Icon name="panel" /></Button>
          <Button unstyled role="radio" aria-checked={centerView === "terminal"} className={`toggle-item${centerView === "terminal" ? " active" : ""}`} onClick={() => { void runtime.sessions.switchView(activeSession.id, "terminal", activeSession.revision ?? 1).then(() => refresh()).catch(() => undefined); updatePreferences({ centerViewBySession: { ...preferences.centerViewBySession, [activeSession.id]: "terminal" } }); }} title={t("terminal")}><Icon name="terminal" /></Button>
        </div>
        <Badge className={`chat-status ${sessionStatus}`}>{statusLabel(sessionStatus)}</Badge>
        {(activeSession.organizationStatus ?? "active") === "active" && !sessionRunning && <Button variant="primary" className="primary-button" onClick={() => void resumeSession(activeSession.id)} disabled={readonly} title={resumeTitle}><Icon name="play" />{t("resume")}</Button>}
        {sessionRunning && <Button variant="secondary" className="secondary-button" onClick={() => void stopSession(activeSession.id)} disabled={readonly}><Icon name="stop" />{t("stop")}</Button>}
      </div>}
    </TitleBar>
    <main className={`qoder-body ${preferences.navigatorOpen ? "sidebar-open" : ""} ${showRightPanel && preferences.inspectorOpen ? "right-open" : ""}`}>
      {preferences.navigatorOpen && <Sidebar questGroups={questGroups} chatGroups={chatGroups} workspaces={state.workspaces} activeSessionId={activeSessionId} activeTurns={activeTurns} currentView={preferences.currentView} grouping={preferences.sessionGrouping} filter={preferences.sessionFilter} readonly={readonly} openFolderBusy={pickerBusy} questDraftActive={questDraftActive} questDraftWorkspaceId={questDraftWorkspaceId} onViewChange={handleViewChange} onNewQuest={startQuestDraft} onSelectSession={selectSession} onGroupingChange={(sessionGrouping) => updatePreferences({ sessionGrouping })} onFilterChange={(sessionFilter) => updatePreferences({ sessionFilter })} onReorder={reorderSessions} onOpenFolder={openFolder} onOpenSettings={() => setOverlay("settings")} onRename={(session, newName) => void runAction(() => runtime.sessions.renameSession(session.id, newName, session.revision ?? 1), false)} onPin={(session) => void runAction(() => runtime.sessions.pinSession(session.id, !session.pinned, session.revision ?? 1), false)} onComplete={(session) => void runAction(() => session.organizationStatus === "completed" ? runtime.sessions.restoreSession(session.id, session.revision ?? 1) : runtime.sessions.completeSession(session.id, session.revision ?? 1, true), false)} onArchive={(session) => { setActiveSessionId(session.id); if (session.organizationStatus === "archived") void runAction(() => runtime.sessions.restoreSession(session.id, session.revision ?? 1), false); else setOverlay("archive-session"); }} onFork={(session) => void runAction(async () => { const fork = await runtime.sessions.forkSession(session.id, session.revision ?? 1); setActiveSessionId(fork.session.id); }, false)} onDelete={(session) => void runAction(() => runtime.sessions.deleteSession(session.id), false)} onClose={() => updatePreferences({ navigatorOpen: false })} />}
      {preferences.navigatorOpen && <Button unstyled className="drawer-backdrop navigator-backdrop" aria-label={t("closeSessionList")} onClick={() => updatePreferences({ navigatorOpen: false })} />}
      <div className="qoder-main-column">
        <MainArea currentView={preferences.currentView} activeSession={activeSession} activeWorkspace={activeWorkspace} activeProfile={activeProfile} workspaces={state.workspaces} profiles={state.profiles} sessions={state.sessions} onSelectSession={selectSession} readonly={readonly} centerView={centerView} questDraftMode={questDraftActive} questDraftWorkspaceId={questDraftWorkspaceId} onCenterViewChange={(view) => activeSession && updatePreferences({ centerViewBySession: { ...preferences.centerViewBySession, [activeSession.id]: view } })} onLaunchConfigChange={updateLaunchConfig} onNewSession={() => { setNewSessionDefaultMode("terminal"); setOverlay("new-session"); }} onSendPrompt={sendPrompt} onQuickCreate={quickCreateSession} onStatus={refreshStatus} onOpenSettings={() => handleViewChange("settings")} onResume={resumeSession} onStop={stopSession} onTurnActivity={reportTurnActivity} workMode={preferences.composerWorkMode} onWorkModeChange={(mode) => updatePreferences({ composerWorkMode: mode })} />
      </div>
      {showRightPanel && preferences.inspectorOpen && activeSession && <RightPanel session={activeSession} workspace={activeWorkspace} profile={activeProfile} readonly={readonly} runningCount={state.sessions.filter((session) => session.runtimeStatus === "running" || session.runtimeStatus === "starting").length} runningLimit={state.maxRunningSessions} activeTab={preferences.rightPanelTab} onTabChange={(tab) => updatePreferences({ rightPanelTab: tab as UiPreferencesV1["rightPanelTab"] })} onClose={() => updatePreferences({ inspectorOpen: false })} />}
      {showRightPanel && preferences.inspectorOpen && activeSession && <Button unstyled className="drawer-backdrop inspector-backdrop" aria-label={t("closeSessionDetails")} onClick={() => updatePreferences({ inspectorOpen: false })} />}
      {overlay === "new-session" && <NewSessionDialog defaultMode={newSessionDefaultMode} workspaces={state.workspaces} profiles={state.profiles} readonly={readonly} onClose={() => setOverlay(undefined)} onCreate={createSession} onOpenSettings={() => setOverlay("settings")} />}
      {overlay === "settings" && <WorkspaceProfileManager workspaces={state.workspaces} profiles={state.profiles} sessions={state.sessions} readonly={readonly} onClose={() => setOverlay(undefined)} onOpenFolder={openFolder} onCreateWorkspace={async (input) => runAction(() => runtime.workspace.createWorkspace(input), false)} onCreateProfile={async (input) => runAction(() => runtime.engines.createProfile(input), false)} onDeleteWorkspace={(item) => setPendingDelete({ type: "workspace", item })} onDeleteProfile={(item) => setPendingDelete({ type: "profile", item })} />}
      {overlay === "resume" && activeSession && <ActionDialog title={`${t("resume")} ${activeSession.name}?`} description={t("resumeDescription", { profile: activeProfile?.name ?? t("profileFallback"), workspace: activeWorkspace?.path ?? t("thisWorkspace") })} confirmLabel={t("resumeSession")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => runtime.sessions.startSession(activeSession.id))} />}
      {overlay === "archive-session" && activeSession && <ActionDialog danger title={t("archiveSessionTitle")} description={t("archiveSessionDescription", { name: activeSession.name })} confirmLabel={t("archive")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => runtime.sessions.archiveSession(activeSession.id, activeSession.revision ?? 1, true))} />}
      {overlay === "complete-session" && activeSession && <ActionDialog title={t("completeSessionTitle")} description={t("completeSessionDescription", { name: activeSession.name })} confirmLabel={t("complete")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => runtime.sessions.completeSession(activeSession.id, activeSession.revision ?? 1, true))} />}
      {overlay === "fork-session" && activeSession && <ActionDialog title={t("forkSessionTitle")} description={t("forkSessionDescription", { name: activeSession.name })} confirmLabel={t("fork")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(async () => { const fork = await runtime.sessions.forkSession(activeSession.id, activeSession.revision ?? 1); setActiveSessionId(fork.session.id); })} />}
      {overlay === "rename" && activeSession && <ActionDialog title={t("renameSessionTitle")} description={t("renameSessionDescription")} inputLabel={t("sessionName")} initialValue={activeSession.name} confirmLabel={t("saveName")} onClose={() => setOverlay(undefined)} onConfirm={(value) => runAction(() => runtime.sessions.renameSession(activeSession.id, value!, activeSession.revision ?? 1))} />}
      {overlay === "delete-session" && activeSession && <ActionDialog danger title={t("deleteSessionTitle")} description={t("deleteSessionDescription", { name: activeSession.name })} confirmLabel={t("deleteSession")} onClose={() => setOverlay(undefined)} onConfirm={() => runAction(() => runtime.sessions.deleteSession(activeSession.id))} />}
      {pendingDelete && <ActionDialog danger title={`${t("delete")} ${pendingDelete.item.name}?`} description={pendingDelete.type === "workspace" ? t("deleteWorkspaceDescription") : t("deleteProfileDescription")} confirmLabel={t("delete")} onClose={() => setPendingDelete(undefined)} onConfirm={async () => { const target = pendingDelete; setPendingDelete(undefined); await runAction(() => target.type === "workspace" ? runtime.workspace.deleteWorkspace(target.item.id) : runtime.engines.deleteProfile(target.item.id), false); }} />}
    </main>
  </div></>;
}

function isNarrowViewport() { return typeof window !== "undefined" && window.innerWidth < 900; }
