import { useCallback, useEffect, useState } from "react";
import type { CliProfile, CliProfileCapabilities, Session, SessionLaunchConfig, Workspace } from "../../shared/types";
import { api } from "../api";
import { useI18n } from "../i18n";
import { PromptComposer } from "./PromptComposer";
import { TranscriptPanel } from "./TranscriptPanel";
import { TerminalView } from "../terminal";
import { Icon } from "./ui/Icon";
import { StatusBadge } from "./StatusBadge";
import type { CenterView } from "../app/preferences";

interface SessionWorkspaceProps {
  profile?: CliProfile;
  readonly: boolean;
  session?: Session;
  workspace?: Workspace;
  onNewSession: () => void;
  onOpenInspector: () => void;
  onResume: () => void;
  onStatus: () => void;
  onStop: () => void;
  centerView?: CenterView;
  onCenterViewChange?: (view: CenterView) => void;
  onLaunchConfigChange?: (change: Partial<SessionLaunchConfig>) => void;
  inspectorOpen?: boolean;
}

export function SessionWorkspace({ profile, readonly, session, workspace, onNewSession, onOpenInspector, onResume, onStatus, onStop, centerView: controlledCenterView, onCenterViewChange, onLaunchConfigChange, inspectorOpen = false }: SessionWorkspaceProps) {
  const { statusLabel, t } = useI18n();
  const [localCenterView, setLocalCenterView] = useState<CenterView>("transcript");
  const [capabilities, setCapabilities] = useState<CliProfileCapabilities>();
  const centerView = controlledCenterView ?? localCenterView;
  const [transcriptRefresh, setTranscriptRefresh] = useState(0);
  const sendPrompt = useCallback(async (content: string, clientMessageId: string) => {
    if (!session) return;
    await api.sendMessage(session.id, { clientMessageId, content, startIfStopped: runtimeStatus(session) !== "running", confirmedStart: true });
    setTranscriptRefresh((value) => value + 1);
    onStatus();
  }, [onStatus, session]);
  useEffect(() => {
    if (!profile) { setCapabilities(undefined); return; }
    const controller = new AbortController();
    setCapabilities(undefined);
    void api.profileCapabilities(profile.id, controller.signal).then(setCapabilities).catch(() => undefined);
    return () => controller.abort();
  }, [profile]);
  return <section className="session-workspace">
    <header className="workspace-toolbar">
      <div className="workspace-title-block">
        <div className="workspace-title-row"><h1>{session?.name ?? t("cliWorkspace")}</h1>{session && <StatusBadge status={runtimeStatus(session)} />}</div>
        <p>{session ? `${profile?.name ?? t("profileFallback")} · ${workspace?.name ?? t("unknownWorkspace")}` : t("runNativeTerminal")}</p>
      </div>
      <div className="workspace-actions">
        {readonly && <span className="readonly-label">{t("readonly")}</span>}
        {!session && <button className="primary-button" onClick={onNewSession} disabled={readonly}><Icon name="add" />{t("newSession")}</button>}
        {session && runtimeStatus(session) === "running" && <button className="secondary-button" onClick={onStop}><Icon name="stop" />{t("stop")}</button>}
        {session && runtimeStatus(session) !== "running" && <button className="primary-button" onClick={onResume} disabled={readonly || session.organizationStatus !== "active"}><Icon name="play" />{t("resume")}</button>}
        {session && <button className="icon-button" onClick={onOpenInspector} aria-label={t("openSessionDetails")} title={t("sessionDetails")} aria-expanded={inspectorOpen} aria-controls="session-inspector"><Icon name="panel" /></button>}
      </div>
    </header>
    <div className="terminal-surface">
      <div className="terminal-chrome">
        <div className="view-tabs" role="tablist" aria-label={t("centerView")}>
          <button role="tab" aria-selected={centerView === "transcript"} className={centerView === "transcript" ? "active" : ""} onClick={() => { setLocalCenterView("transcript"); onCenterViewChange?.("transcript"); }}><Icon name="panel" />{t("transcript")}</button>
          <button role="tab" aria-selected={centerView === "terminal"} className={centerView === "terminal" ? "active" : ""} onClick={() => { setLocalCenterView("terminal"); onCenterViewChange?.("terminal"); }}><Icon name="terminal" />{t("terminal")}</button>
        </div>
        <span>{workspace?.path ?? "127.0.0.1"}</span>
      </div>
      {session && runtimeStatus(session) === "error" && <div className="workspace-error" role="alert"><strong>{t("sessionStoppedWithError")}</strong><span>{typeof session.error === "string" ? session.error : session.error?.message}</span></div>}
      {!session ? <EmptyWorkspace session={session} onNewSession={onNewSession} readonly={readonly} /> : centerView === "transcript" ? <TranscriptPanel sessionId={session.id} refreshKey={transcriptRefresh} /> : runtimeStatus(session) === "running" ? <TerminalView sessionId={session.id} onStatus={onStatus} /> : <EmptyWorkspace session={session} onNewSession={onNewSession} readonly={readonly} statusText={statusLabel(runtimeStatus(session))} />}
    </div>
    {session && <PromptComposer disabled={readonly || session.organizationStatus !== "active"} onSend={sendPrompt} capabilities={capabilities} launchConfig={session.launchConfig} onLaunchConfigChange={onLaunchConfigChange} />}
  </section>;
}

function EmptyWorkspace({ session, onNewSession, readonly, statusText }: { session?: Session; onNewSession: () => void; readonly: boolean; statusText?: string }) {
  const { t } = useI18n();
  const error = runtimeStatus(session) === "error";
  return <div className={`empty-workspace ${error ? "error" : ""}`}>
    <div className="empty-icon"><Icon name={error ? "info" : "terminal"} /></div>
    <strong>{session ? (error ? t("sessionStoppedWithError") : t("sessionIsStatus", { status: statusText })) : t("startFirstSession")}</strong>
    <p>{session ? (typeof session.error === "string" ? session.error : session.error?.message) ?? t("resumeFreshPty") : t("startFirstSessionDescription")}</p>
    {!session && <button className="primary-button" onClick={onNewSession} disabled={readonly}><Icon name="add" />{t("newSession")}</button>}
  </div>;
}

function runtimeStatus(session?: Session) {
  return session?.runtimeStatus ?? session?.status ?? "stopped";
}
