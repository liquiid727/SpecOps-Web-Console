import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CliProfile, CliProfileCapabilities, Session, SessionLaunchConfig, TranscriptEvent, Workspace } from "../../shared/types";
import type { SendMessageResponse } from "../../shared/types";
import type { TurnStatus } from "../../shared/websocket";
import { api, ApiClientError } from "../api";
import { CHAT_INTERACTION_ENABLED } from "../app/feature-flags";
import type { CenterView, ComposerWorkMode } from "../app/preferences";
import { toFeedbackError, toFeedbackWarning } from "../feedback-errors";
import { useI18n } from "../i18n";
import { TerminalView } from "../terminal";
import { PromptComposer } from "./PromptComposer";
import { SessionLifecycleStatusBar } from "./SessionLifecycleStatusBar";
import { Icon } from "./ui/Icon";
import { useFeedback } from "./ui/Feedback";
import { Badge, Button, EmptyState, Tabs } from "./ui";
import { deriveSessionLifecycleStatus, type SessionLifecycleStatus } from "../transcript-display";

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
  onSend: (content: string, clientMessageId: string) => Promise<SendMessageResponse | void>;
  onStatus: () => void;
  onResume?: (id: string) => void;
  onStop?: (id: string) => void;
  /** 会话列表的轮次进行中指示（frontend-spec §6）：turnId 为空表示无进行中轮次 */
  onTurnActivity?: (sessionId: string, turnId?: string) => void;
  /** 四态工作模式：App 层持久化状态下发至 composer（console-gaps SPEC §3） */
  workMode: ComposerWorkMode;
  onWorkModeChange: (mode: ComposerWorkMode) => void;
}

export function ChatView({ session, workspace, profile, readonly, centerView, onCenterViewChange, onLaunchConfigChange, onSend, onStatus, onResume, onStop, onTurnActivity, workMode, onWorkModeChange }: ChatViewProps) {
  const { t, statusLabel } = useI18n();
  const feedback = useFeedback();
  const [capabilities, setCapabilities] = useState<CliProfileCapabilities>();
  // 轮次状态双通道：turn-status 帧（实时）+ 事件流推导（重连/回放兜底，api-spec §4.2）
  const [frameTurn, setFrameTurn] = useState<{ turnId: string; status: TurnStatus }>();
  const [derivedTurnId, setDerivedTurnId] = useState<string>();
  const [echoEvents, setEchoEvents] = useState<TranscriptEvent[]>([]);
  const [lifecycleStatus, setLifecycleStatus] = useState<SessionLifecycleStatus>("idle");
  const cancelledTurnsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!profile) { setCapabilities(undefined); return; }
    const controller = new AbortController();
    setCapabilities(undefined);
    void api.profileCapabilities(profile.id, controller.signal).then(setCapabilities).catch((cause) => {
      if (cause?.name !== "AbortError") feedback.warning(toFeedbackWarning(cause, t, "capabilitiesUnavailable", `capabilities:${profile.id}`));
    });
    return () => controller.abort();
  }, [feedback, profile, t]);

  // 切换会话时重置轮次与回显状态
  useEffect(() => {
    setFrameTurn(undefined);
    setDerivedTurnId(undefined);
    setEchoEvents([]);
    setLifecycleStatus("idle");
    cancelledTurnsRef.current = new Set();
  }, [session.id]);

  const status = session.runtimeStatus ?? session.status ?? "stopped";
  const running = status === "running" || status === "starting";
  const chatSession = session.interactionMode === "chat";
  // chat 封闭期：存量 chat 会话 transcript 可查看，composer 禁用（console-gaps SPEC §1）
  const chatFeatureOff = chatSession && !CHAT_INTERACTION_ENABLED;
  const composerDisabled = readonly || session.organizationStatus !== "active" || chatFeatureOff;

  const handleTurnStatus = useCallback((turnId: string, turnStatus: TurnStatus) => {
    if (turnStatus === "running" || turnStatus === "waiting_approval") setFrameTurn({ turnId, status: turnStatus });
    else setFrameTurn((current) => (current?.turnId === turnId ? undefined : current));
  }, []);
  const handleDerivedTurn = useCallback((turnId: string | undefined) => setDerivedTurnId(turnId), []);

  const derivedActive = derivedTurnId && !cancelledTurnsRef.current.has(derivedTurnId) ? derivedTurnId : undefined;
  const activeTurnId = frameTurn?.turnId ?? (running ? derivedActive : undefined);
  const turnActive = chatSession && Boolean(activeTurnId);

  useEffect(() => { onTurnActivity?.(session.id, turnActive ? activeTurnId : undefined); }, [activeTurnId, onTurnActivity, session.id, turnActive]);
  useEffect(() => () => onTurnActivity?.(session.id, undefined), [onTurnActivity, session.id]);

  // 发送：stopped 会话静默 start-and-send（startIfStopped + confirmedStart），成功不打断用户，失败才提示
  async function handleSend(content: string, clientMessageId: string) {
    const result = await onSend(content, clientMessageId);
    if (result && typeof result === "object") {
      if (typeof result.turnId === "string") setFrameTurn({ turnId: result.turnId, status: "running" });
      if (result.event) setEchoEvents((current) => [...current, result.event]);
    }
  }

  // 取消进行中轮次；竞态 409 TURN_NOT_ACTIVE 静默刷新状态（frontend-spec §5.2）
  async function cancelActiveTurn() {
    const turnId = activeTurnId;
    if (!turnId) return;
    try {
      await api.cancelTurn(session.id, turnId);
      cancelledTurnsRef.current.add(turnId);
      setFrameTurn(undefined);
      onStatus();
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.code === "TURN_NOT_ACTIVE") {
        cancelledTurnsRef.current.add(turnId);
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
      await api.respondApproval(session.id, approvalId, decision);
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.code === "APPROVAL_NOT_PENDING") {
        feedback.warning(toFeedbackWarning(cause, t, "approvalNoLongerPending", `approval:${session.id}:${approvalId}`));
        onStatus();
        throw cause;
      }
      feedback.error(toFeedbackError(cause, t, "composerFailed", `approval:${session.id}:${approvalId}`));
    }
  }, [feedback, onStatus, session.id, t]);

  // 模型即时切换：PATCH activeModel，下一轮生效（frontend-spec §5.3 / api-spec §2.6）
  function changeActiveModel(model: string | null) {
    if (!model) return;
    void (async () => {
      try {
        await api.updateActiveModel(session.id, model, session.revision ?? 1);
        feedback.success({ title: t("modelNextTurn") });
        onStatus();
      } catch (cause) {
        feedback.error(toFeedbackError(cause, t, "composerFailed", `active-model:${session.id}`));
      }
    })();
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

  return (
    <div className="chat-view">
      <div className="chat-header">
        <div className="chat-header-main">
          <h2>{session.name}</h2>
          {workspace && <span className="chat-header-meta"><Icon name="folder" />{workspace.name}</span>}
          <span className="chat-header-meta"><Icon name="git" />{t("qoderDefaultBranch")}</span>
        </div>
        <div className="chat-header-actions">
          <Tabs className="view-tabs" ariaLabel={t("centerView")} value={centerView} onChange={onCenterViewChange} items={[{ id: "transcript", label: <><Icon name="panel" />{t("transcript")}</> }, { id: "terminal", label: <><Icon name="terminal" />{t("terminal")}</> }]} />
          <Badge className={`chat-status ${status}`}>{statusLabel(status)}</Badge>
          {session.organizationStatus === "active" && !running && (
            <Button variant="primary" className="primary-button" onClick={() => onResume?.(session.id)} disabled={readonly} title={resumeTitle}>
              <Icon name="play" />{t("resume")}
            </Button>
          )}
          {running && (
            <Button variant="secondary" className="secondary-button" onClick={() => onStop?.(session.id)} disabled={readonly}>
              <Icon name="stop" />{t("stop")}
            </Button>
          )}
        </div>
      </div>
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
        {centerView === "transcript" ? <Suspense fallback={<div className="transcript-state">{t("loadingTranscript")}</div>}><TranscriptPanel sessionId={session.id} chatMode={chatSession} turnPending={turnActive} localEvents={echoEvents} onTurnStatus={handleTurnStatus} onDerivedTurn={handleDerivedTurn} onRetry={composerDisabled ? undefined : retryTurn} onApprove={approvalEnabled ? respondApproval : undefined} approvalFallback={approvalFallback} onSessionLifecycle={setLifecycleStatus} /></Suspense> : chatSession ? <Suspense fallback={<div className="transcript-state">{t("loadingTranscript")}</div>}><ChatTerminalReplay sessionId={session.id} /></Suspense> : running ? <div className="chat-terminal"><TerminalView sessionId={session.id} onStatus={onStatus} /></div> : <EmptyState className="chat-empty" icon={<Icon name="terminal" />} description={t("terminalStopped")} />}
      </div>
      <div className="chat-composer">
        {chatFeatureOff && <p className="composer-disabled-note" role="note">{t("chatComposerDisabled")}</p>}
        <PromptComposer
          disabled={composerDisabled}
          onSend={handleSend}
          capabilities={capabilities}
          launchConfig={session.launchConfig}
          onLaunchConfigChange={onLaunchConfigChange}
          interactionMode={session.interactionMode}
          activeModel={session.chatContext?.activeModel}
          onActiveModelChange={chatSession ? changeActiveModel : undefined}
          turnActive={turnActive}
          waitingApproval={waitingApproval}
          onCancelTurn={cancelActiveTurn}
          workMode={workMode}
          onWorkModeChange={onWorkModeChange}
          profileId={session.profileId}
          enhanceSupported={capabilities?.supportsPromptEnhancement}
        />
      </div>
    </div>
  );
}
