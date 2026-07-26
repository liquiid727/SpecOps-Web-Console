import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { CliProfile, CliProfileCapabilities, Session, SessionLaunchConfig, TranscriptEvent, Workspace } from "../../shared/types";
import type { SendMessageResponse } from "../../shared/types";
import type { TurnStatus } from "../../shared/websocket";
import { api, ApiClientError } from "../api";
import type { CenterView } from "../app/preferences";
import { toFeedbackError, toFeedbackWarning } from "../feedback-errors";
import { useI18n } from "../i18n";
import { TerminalView } from "../terminal";
import { ActionDialog } from "./ActionDialog";
import { PromptComposer } from "./PromptComposer";
import { Icon } from "./ui/Icon";
import { useFeedback } from "./ui/Feedback";
import { Badge, Button, EmptyState, Tabs } from "./ui";

const TranscriptPanel = lazy(() => import("./TranscriptPanel").then((module) => ({ default: module.TranscriptPanel })));

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
}

export function ChatView({ session, workspace, profile, readonly, centerView, onCenterViewChange, onLaunchConfigChange, onSend, onStatus, onResume, onStop, onTurnActivity }: ChatViewProps) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [capabilities, setCapabilities] = useState<CliProfileCapabilities>();
  // 轮次状态双通道：turn-status 帧（实时）+ 事件流推导（重连/回放兜底，api-spec §4.2）
  const [frameTurn, setFrameTurn] = useState<{ turnId: string; status: TurnStatus }>();
  const [derivedTurnId, setDerivedTurnId] = useState<string>();
  const [echoEvents, setEchoEvents] = useState<TranscriptEvent[]>([]);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const startConfirmRef = useRef<((confirmed: boolean) => void) | undefined>(undefined);
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
    cancelledTurnsRef.current = new Set();
  }, [session.id]);

  const status = session.runtimeStatus ?? session.status ?? "stopped";
  const running = status === "running" || status === "starting";
  const composerDisabled = readonly || session.organizationStatus !== "active";
  const chatSession = session.interactionMode === "chat";

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

  function requestStartConfirm() {
    return new Promise<boolean>((resolve) => {
      startConfirmRef.current = resolve;
      setStartConfirmOpen(true);
    });
  }

  function resolveStartConfirm(confirmed: boolean) {
    setStartConfirmOpen(false);
    startConfirmRef.current?.(confirmed);
    startConfirmRef.current = undefined;
  }

  // 发送：stopped 会话先弹启动确认（命令预览 + cwd，frontend-spec §5.1），确认后 start-and-send
  async function handleSend(content: string, clientMessageId: string) {
    if (!running) {
      const confirmed = await requestStartConfirm();
      if (!confirmed) {
        const cancelled = new Error("Start confirmation dismissed.");
        cancelled.name = "ComposerCancelled";
        throw cancelled;
      }
    }
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

  const commandPreview = profile ? [profile.command, ...(profile.args ?? [])].join(" ") : "";

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
          <Badge className={`chat-status ${status}`}>{status}</Badge>
          {session.organizationStatus === "active" && !running && (
            <Button variant="primary" className="primary-button" onClick={() => onResume?.(session.id)} disabled={readonly}>
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
        {centerView === "transcript" ? <Suspense fallback={<div className="transcript-state">{t("loadingTranscript")}</div>}><TranscriptPanel sessionId={session.id} localEvents={echoEvents} onTurnStatus={handleTurnStatus} onDerivedTurn={handleDerivedTurn} onRetry={composerDisabled ? undefined : retryTurn} /></Suspense> : running ? <div className="chat-terminal"><TerminalView sessionId={session.id} onStatus={onStatus} /></div> : <EmptyState className="chat-empty" icon={<Icon name="terminal" />} description={t("terminalStopped")} />}
      </div>
      <div className="chat-composer">
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
          onCancelTurn={cancelActiveTurn}
        />
      </div>
      {startConfirmOpen && (
        <ActionDialog
          title={t("startAndSendTitle")}
          description={t("startAndSendDescription", { command: commandPreview || t("profileFallback"), cwd: workspace?.path ?? t("thisWorkspace") })}
          confirmLabel={t("resumeSession")}
          onClose={() => resolveStartConfirm(false)}
          onConfirm={() => resolveStartConfirm(true)}
        />
      )}
    </div>
  );
}
