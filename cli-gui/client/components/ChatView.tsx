import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CliProfile, CliProfileCapabilities, Session, SessionLaunchConfig, TranscriptEvent, Workspace } from "../../shared/types";
import type { SendMessageResponse } from "../../shared/types";
import type { ModelDeploymentSummary } from "../../shared/model-deployment";
import type { ResolvedRoute, RunRouteOverride, PriorityModelRoute } from "../../shared/model-route";
import type { TurnStatus } from "../../shared/websocket";
import type { CenterView, ComposerWorkMode } from "../app/preferences";
import { readPreferences, writePreferences } from "../app/preferences";
import { toFeedbackError, toFeedbackWarning } from "../feedback-errors";
import { useI18n } from "../i18n";
import { TerminalView } from "../terminal";
import { PromptComposer } from "./PromptComposer";
import { SessionLifecycleStatusBar } from "./SessionLifecycleStatusBar";
import { Icon } from "./ui/Icon";
import { useFeedback } from "./ui/Feedback";
import { Button, EmptyState } from "./ui";
import { deriveSessionLifecycleStatus, isTurnStillActive, type SessionLifecycleStatus } from "../transcript-display";
import { useClientRuntime } from "../runtime/client-runtime";

const TranscriptPanel = lazy(() => import("./TranscriptPanel").then((module) => ({ default: module.TranscriptPanel })));
const ChatTerminalReplay = lazy(() => import("./ChatTerminalReplay").then((module) => ({ default: module.ChatTerminalReplay })));

interface ChatViewProps {
  session: Session;
  workspace?: Workspace;
  profile?: CliProfile;
  readonly: boolean;
  centerView: CenterView;
  onCenterViewChange: (view: CenterView) => void;
  onLaunchConfigChange: (change: Partial<SessionLaunchConfig>) => void;
  onSend: (content: string, clientMessageId: string, routeOverride?: RunRouteOverride) => Promise<SendMessageResponse | void>;
  onStatus: () => void;
  onResume?: (id: string) => void;
  onStop?: (id: string) => void;
  /** 会话列表的轮次进行中指示（frontend-spec §6）：turnId 为空表示无进行中轮次 */
  onTurnActivity?: (sessionId: string, turnId?: string) => void;
  /** MVP02 工作模式：Default 正常执行；Plan 映射为后端只读/计划能力。 */
  workMode: ComposerWorkMode;
  onWorkModeChange: (mode: ComposerWorkMode) => void;
}

export function ChatView({ session, profile, readonly, centerView, onCenterViewChange, onLaunchConfigChange, onSend, onStatus, onResume, onStop, onTurnActivity, workMode, onWorkModeChange }: ChatViewProps) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const runtime = useClientRuntime();
  const [capabilities, setCapabilities] = useState<CliProfileCapabilities>();
  // 轮次状态双通道：turn-status 帧（实时）+ 事件流推导（重连/回放兜底，api-spec §4.2）
  const [frameTurn, setFrameTurn] = useState<{ turnId: string; status: TurnStatus }>();
  const [derivedTurnId, setDerivedTurnId] = useState<string>();
  const [echoEvents, setEchoEvents] = useState<TranscriptEvent[]>([]);
  const [lifecycleStatus, setLifecycleStatus] = useState<SessionLifecycleStatus>("idle");
  const cancelledTurnsRef = useRef(new Set<string>());
  const terminalTurnIdsRef = useRef(new Set<string>());
  const notifiedTurnsRef = useRef(new Set<string>());
  const [resolvedRoute, setResolvedRoute] = useState<ResolvedRoute>();
  const [routeOptions, setRouteOptions] = useState<PriorityModelRoute[]>([]);
  const [routeDeployments, setRouteDeployments] = useState<ModelDeploymentSummary[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeResolutionFailed, setRouteResolutionFailed] = useState(false);
  const [fixedDeploymentId, setFixedDeploymentId] = useState<string>();
  const [actualDeployment, setActualDeployment] = useState<{ name: string; modelId: string }>();

  useEffect(() => {
    if (!profile) { setCapabilities(undefined); return; }
    const controller = new AbortController();
    setCapabilities(undefined);
    void runtime.engines.profileCapabilities(profile.id, controller.signal).then((detected) => {
      setCapabilities(detected);
    }).catch((cause) => {
      if (cause?.name !== "AbortError") feedback.warning(toFeedbackWarning(cause, t, "capabilitiesUnavailable", `capabilities:${profile.id}`));
    });
    return () => controller.abort();
  }, [feedback, profile, runtime.engines, t]);

  useEffect(() => {
    if (session.interactionMode !== "chat") {
      setResolvedRoute(undefined);
      setRouteOptions([]);
      setRouteDeployments([]);
      setRouteLoading(false);
      setRouteResolutionFailed(false);
      setFixedDeploymentId(undefined);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setRouteLoading(true);
    setRouteResolutionFailed(false);
    void Promise.all([
      runtime.routing.resolveSessionModelRoute(session.id),
      runtime.routing.modelRoutes(controller.signal),
      runtime.routing.modelDeployments(controller.signal)
    ]).then(([resolved, routes, deployments]) => {
      if (!active) return;
      setResolvedRoute(resolved.resolvedRoute);
      setRouteOptions(routes.routes);
      setRouteDeployments(deployments.deployments);
    }).catch((cause) => {
      if (!active || cause?.name === "AbortError") return;
      setResolvedRoute(undefined);
      setRouteResolutionFailed(true);
    }).finally(() => {
      if (active) setRouteLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [runtime.routing, session.id, session.interactionMode, session.modelRouteId]);

  // 切换会话时重置轮次与回显状态
  useEffect(() => {
    setFrameTurn(undefined);
    setDerivedTurnId(undefined);
    setEchoEvents([]);
    setLifecycleStatus("idle");
    cancelledTurnsRef.current = new Set();
    terminalTurnIdsRef.current = new Set();
  }, [session.id]);

  const status = session.runtimeStatus ?? session.status ?? "stopped";
  const running = status === "running" || status === "starting";
  const chatSession = session.interactionMode === "chat";
  const chatReady = capabilities?.compatibility === "supported" && capabilities.supportsHeadlessTurns;
  const chatUnavailable = chatSession && capabilities !== undefined && !chatReady;
  const composerDisabled = readonly || (session.organizationStatus ?? "active") !== "active" || (chatSession && !chatReady);
  const routeBlocked = chatSession && (routeLoading || routeResolutionFailed || Boolean(resolvedRoute && !resolvedRoute.canSend));

  const handleTurnStatus = useCallback((turnId: string, turnStatus: TurnStatus) => {
    if (turnStatus === "running" || turnStatus === "waiting_approval") setFrameTurn({ turnId, status: turnStatus });
    else {
      // turn-status is an ephemeral but authoritative terminal signal. Keep it
      // ahead of transcript replay so a stale user_message cannot reactivate a
      // completed turn during the handoff between WS and history updates.
      terminalTurnIdsRef.current.add(turnId);
      setDerivedTurnId((current) => current === turnId ? undefined : current);
      setFrameTurn((current) => (current?.turnId === turnId ? undefined : current));
      setActualDeployment(undefined);
    }
    const notificationKey = `${turnId}:${turnStatus}`;
    if (!notifiedTurnsRef.current.has(notificationKey)) {
      if (turnStatus === "waiting_approval") void runtime.platform.notify(t("notificationApprovalTitle"), session.name);
      if (turnStatus === "completed") void runtime.platform.notify(t("notificationCompletedTitle"), session.name);
      if (turnStatus === "failed") void runtime.platform.notify(t("notificationFailedTitle"), session.name);
      notifiedTurnsRef.current.add(notificationKey);
    }
  }, [runtime.platform, session.name, t]);
  const handleDerivedTurn = useCallback((turnId: string | undefined) => setDerivedTurnId(turnId), []);

  const derivedActive = derivedTurnId && isTurnStillActive(derivedTurnId, terminalTurnIdsRef.current) && !cancelledTurnsRef.current.has(derivedTurnId) ? derivedTurnId : undefined;
  const activeTurnId = frameTurn?.turnId ?? (running ? derivedActive : undefined);
  const turnActive = chatSession && Boolean(activeTurnId);

  useEffect(() => { onTurnActivity?.(session.id, turnActive ? activeTurnId : undefined); }, [activeTurnId, onTurnActivity, session.id, turnActive]);
  useEffect(() => () => onTurnActivity?.(session.id, undefined), [onTurnActivity, session.id]);

  // 发送：stopped 会话静默 start-and-send（startIfStopped + confirmedStart），成功不打断用户，失败才提示
  async function handleSend(content: string, clientMessageId: string, routeOverride?: RunRouteOverride) {
    try {
      const result = routeOverride ? await onSend(content, clientMessageId, routeOverride) : await onSend(content, clientMessageId);
      if (result && typeof result === "object") {
        if (typeof result.turnId === "string") setFrameTurn({ turnId: result.turnId, status: "running" });
        if (result.event) setEchoEvents((current) => [...current, result.event]);
        if (result.resolvedDeployment) setActualDeployment({ name: result.resolvedDeployment.name, modelId: result.resolvedDeployment.modelId });
      }
    } finally {
      setFixedDeploymentId(undefined);
    }
  }

  // 取消进行中轮次；竞态 409 TURN_NOT_ACTIVE 静默刷新状态（frontend-spec §5.2）
  async function cancelActiveTurn() {
    const turnId = activeTurnId;
    if (!turnId) return;
    try {
      await runtime.sessions.cancelTurn(session.id, turnId);
      cancelledTurnsRef.current.add(turnId);
      terminalTurnIdsRef.current.add(turnId);
      setDerivedTurnId((current) => current === turnId ? undefined : current);
      setFrameTurn(undefined);
      onStatus();
    } catch (cause) {
      if ((cause as { code?: string } | undefined)?.code === "TURN_NOT_ACTIVE") {
        cancelledTurnsRef.current.add(turnId);
        terminalTurnIdsRef.current.add(turnId);
        setDerivedTurnId((current) => current === turnId ? undefined : current);
        setFrameTurn(undefined);
        onStatus();
        return;
      }
      feedback.error(toFeedbackError(cause, t, "composerFailed", `turn-cancel:${session.id}`));
    }
  }

  // 审批应答（frontend-spec §5.4 / api-spec §2.5）：409 APPROVAL_NOT_PENDING → toast 已失效 + 重抛定格气泡，刷新最终态
  const respondApproval = useCallback(async (approvalId: string, decision: "allow" | "deny") => {
    try {
      await runtime.sessions.respondApproval(session.id, approvalId, decision);
    } catch (cause) {
      if ((cause as { code?: string } | undefined)?.code === "APPROVAL_NOT_PENDING") {
        feedback.warning(toFeedbackWarning(cause, t, "approvalNoLongerPending", `approval:${session.id}:${approvalId}`));
        onStatus();
        throw cause;
      }
      feedback.error(toFeedbackError(cause, t, "composerFailed", `approval:${session.id}:${approvalId}`));
    }
  }, [feedback, onStatus, runtime.sessions, session.id, t]);

  // 模型即时切换：PATCH activeModel，下一轮生效（frontend-spec §5.3 / api-spec §2.6）
  function changeActiveModel(model: string | null) {
    if (!model) return;
    void (async () => {
      try {
        await runtime.sessions.updateActiveModel(session.id, model, session.revision ?? 1);
        feedback.success({ title: t("modelNextTurn") });
        onStatus();
        // 持久化最后使用模型（issue-055）：下次创建会话时自动预选
        if (profile) {
          const prefs = readPreferences();
          prefs.modelPreferences.lastUsedModel[profile.id] = model;
          writePreferences(prefs);
        }
      } catch (cause) {
        feedback.error(toFeedbackError(cause, t, "composerFailed", `active-model:${session.id}`));
      }
    })();
  }

  function changeSessionRoute(routeId: string | undefined) {
    if (turnActive) return;
    void runtime.sessions.updateSessionRoute(session.id, routeId ?? null, session.revision ?? 1).then(() => {
      setFixedDeploymentId(undefined);
      onStatus();
    }).catch((cause) => feedback.error(toFeedbackError(cause, t, "composerFailed", `model-route:${session.id}`)));
  }

  // 失败轮次重试：原 prompt + 新 clientMessageId（api-spec §2.2，无 retry 端点）
  function retryTurn(content: string) {
    void handleSend(content, crypto.randomUUID()).catch((cause) => {
      if ((cause as Error | undefined)?.name !== "ComposerCancelled") feedback.error(toFeedbackError(cause, t, "composerFailed", `turn-retry:${session.id}`));
    });
  }

  // 审批能力分流：supportsApproval 才开审批气泡；明确不支持时失败轮次错误附指引文案（frontend-spec §5.4）
  const approvalEnabled = chatSession && !composerDisabled && capabilities?.supportsApproval === true;
  const approvalFallback = chatSession && capabilities?.supportsApproval === false;
  const waitingApproval = chatSession && frameTurn?.status === "waiting_approval";
  // terminal 会话持有归因捕获的 resume 凭据时，恢复将续上上一次 CLI 会话而非全新启动
  const resumeContinues = session.interactionMode === "terminal" && Boolean(session.terminalContext?.resumeToken);
  const resumeTitle = resumeContinues ? t("resumeContinuesCli") : undefined;

  function changeWorkMode(mode: ComposerWorkMode) {
    onWorkModeChange(mode);
    if (!profile) return;
    if (profile.adapterId === "codex") {
      onLaunchConfigChange({ mode: mode === "plan" ? "read-only" : null });
    } else if (profile.adapterId === "claude-code") {
      onLaunchConfigChange({ permission: mode === "plan" ? "plan" : null });
    }
  }

  return (
    <div className="chat-view">
      {/* 会话头部已合并进全局标题栏（App → TitleBar），保持单一 header 行 */}
      <div className="chat-messages">
        <SessionLifecycleStatusBar status={lifecycleStatus} interactionMode={session.interactionMode} />
        {status === "error" && (
          <div className="session-error-banner" role="alert">
            <Icon name="warning" />
            <div className="session-error-body">
              <strong>{t("sessionStartFailedTitle")}</strong>
              <p>{typeof session.error === "string" ? session.error : session.error?.message ?? t("sessionStartFailedDetail")}</p>
            </div>
            {session.organizationStatus === "active" && (
              <Button variant="primary" className="primary-button" onClick={() => onResume?.(session.id)} disabled={readonly} title={resumeTitle}>
                <Icon name="play" />{t("resume")}
              </Button>
            )}
          </div>
        )}
        {/* dual-mode §9.2：双 View 常挂载——GUI 与 Terminal 同时存在，非活动视图 CSS 隐藏 */}
        <div className={`chat-center-panel${centerView !== "transcript" ? " is-hidden" : ""}`} aria-hidden={centerView !== "transcript"}>
          <Suspense fallback={<div className="transcript-state">{t("loadingTranscript")}</div>}>
            {chatSession
              ? <TranscriptPanel sessionId={session.id} chatMode={chatSession} turnPending={turnActive} localEvents={echoEvents} onTurnStatus={handleTurnStatus} onDerivedTurn={handleDerivedTurn} onRetry={composerDisabled ? undefined : retryTurn} onApprove={approvalEnabled ? respondApproval : undefined} approvalFallback={approvalFallback} onSessionLifecycle={setLifecycleStatus} onViewInTerminal={() => onCenterViewChange("terminal")} />
              : <TranscriptPanel sessionId={session.id} chatMode={false} turnPending={turnActive} localEvents={echoEvents} onTurnStatus={handleTurnStatus} onDerivedTurn={handleDerivedTurn} onRetry={composerDisabled ? undefined : retryTurn} onApprove={approvalEnabled ? respondApproval : undefined} approvalFallback={approvalFallback} onSessionLifecycle={setLifecycleStatus} onViewInTerminal={() => onCenterViewChange("terminal")} />}
          </Suspense>
        </div>
        {/* Terminal 视图：chat 会话为只读回放，terminal 会话为交互式 PTY */}
        {chatSession
          ? <div className={`chat-center-panel${centerView !== "terminal" ? " is-hidden" : ""}`} aria-hidden={centerView !== "terminal"}><Suspense fallback={<div className="transcript-state">{t("loadingTranscript")}</div>}><ChatTerminalReplay sessionId={session.id} /></Suspense></div>
          : <div className={`chat-center-panel${centerView !== "terminal" ? " is-hidden" : ""}`} aria-hidden={centerView !== "terminal"}><div className="chat-terminal">{running || true ? <TerminalView sessionId={session.id} onStatus={onStatus} hidden={centerView !== "terminal"} inputEnabled={(session as unknown as { inputOwner?: string }).inputOwner !== "gui"} /> : <EmptyState className="chat-empty" icon={<Icon name="terminal" />} description={t("terminalStopped")} />}</div></div>}
      </div>
      {/* terminal 会话切到 terminal 视图时隐藏 composer（输入直达 PTY）；chat 会话在 terminal 回放视图下仍保留（issue-046） */}
      {!(centerView === "terminal" && !chatSession) && (
      <div className="chat-composer">
        {chatUnavailable && <p className="composer-disabled-note" role="note">{t("interactionModeLocked")}</p>}
        {chatSession && capabilities === undefined && <p className="composer-disabled-note" role="status">{t("engineChecking")}</p>}
        {chatSession && routeLoading && <p className="composer-disabled-note" role="status">{t("routeResolving")}</p>}
        {chatSession && routeResolutionFailed && <p className="composer-disabled-note" role="alert">{t("routeResolutionFailed")}</p>}
        {chatSession && resolvedRoute?.canSend === false && <p className="composer-disabled-note" role="alert">{t("routeUnavailable")}</p>}
        <PromptComposer
          disabled={composerDisabled}
          onSend={handleSend}
          capabilities={capabilities}
          defaultModel={capabilities?.defaultModel}
          launchConfig={session.launchConfig}
          onLaunchConfigChange={onLaunchConfigChange}
          interactionMode={session.interactionMode}
          activeModel={session.chatContext?.activeModel}
          onActiveModelChange={chatSession ? changeActiveModel : undefined}
          resolvedRoute={chatSession ? resolvedRoute : undefined}
          routeOptions={chatSession ? routeOptions : undefined}
          routeDeployments={chatSession ? routeDeployments : undefined}
          sessionRouteId={session.modelRouteId}
          fixedDeploymentId={fixedDeploymentId}
          onSessionRouteChange={chatSession ? changeSessionRoute : undefined}
          onFixedDeploymentChange={chatSession ? setFixedDeploymentId : undefined}
          actualDeployment={actualDeployment}
          routeBlocked={routeBlocked}
          turnActive={turnActive}
          waitingApproval={waitingApproval}
          onCancelTurn={cancelActiveTurn}
          workMode={workMode}
          onWorkModeChange={changeWorkMode}
          profileId={session.profileId}
          enhanceSupported={capabilities?.supportsPromptEnhancement}
        />
      </div>
      )}
    </div>
  );
}
