import { useEffect, useRef, useState } from "react";
import type { CliProfile, Session, TranscriptEvent, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { TerminalView } from "../terminal";
import { reduceSessionEvents } from "../transcript-display";
import { EmptyState, Icon, IconButton, Tabs } from "./ui";
import { useMobileDrawerFocus } from "./ui/useMobileDrawerFocus";
import { Detail, DiffTab, FilesTab as WorkspaceFilesTab, GitTab, LanguagesTab, PreviewTab } from "./inspector-tabs";
import { useClientRuntime } from "../runtime/client-runtime";

interface RightPanelProps {
  session: Session;
  workspace?: Workspace;
  profile?: CliProfile;
  readonly: boolean;
  /** Runtime Monitor：全局 running 数与并发上限（issue-016，数据源 /api/state maxRunningSessions） */
  runningCount?: number;
  runningLimit?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onClose: () => void;
}

export function RightPanel({ session, workspace, profile, runningCount, runningLimit, activeTab = "summary", onTabChange, onClose }: RightPanelProps) {
  const { t } = useI18n();
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development" || (import.meta as unknown as { env?: { DEV?: boolean } })?.env?.DEV;
  const tabs = [
    { id: "summary", label: t("qoderSummary") },
    { id: "files", label: t("qoderFiles") },
    { id: "terminal", label: t("qoderTerminal") },
    ...(isDev ? [{ id: "raw-events", label: "Raw Events" }] : [])
  ];
  const [tab, setTab] = useState(activeTab);
  const panelRef = useRef<HTMLElement>(null);
  useMobileDrawerFocus(panelRef, onClose);
  useEffect(() => setTab(activeTab), [activeTab]);
  function selectTab(next: string) { setTab(next); onTabChange?.(next); }
  return <aside ref={panelRef} id="session-inspector" className="qoder-right-panel" aria-label={t("sessionInspector")}>
    <header className="right-panel-header"><Tabs className="right-panel-tabs" ariaLabel={t("inspectorTabs")} value={tab} onChange={selectTab} items={tabs} /><IconButton appearance="qoder" icon="close" onClick={onClose} label={t("closeSessionDetails")} /></header>
    <div className="right-panel-content">
      {tab === "summary" && <SummaryTab session={session} workspace={workspace} profile={profile} runningCount={runningCount} runningLimit={runningLimit} />}
      {tab === "terminal" && <TerminalTab session={session} />}
      {tab === "files" && <FilesTab workspace={workspace} />}
      {tab === "raw-events" && <RawEventsTab session={session} />}
    </div>
  </aside>;
}

function SummaryTab({ session, workspace, profile, runningCount, runningLimit }: { session: Session; workspace?: Workspace; profile?: CliProfile; runningCount?: number; runningLimit?: number }) {
  const { t } = useI18n();
  const runtime = useClientRuntime();
  const [branch, setBranch] = useState<string>();
  const [capabilityTransport, setCapabilityTransport] = useState<string>();
  const [defaultModel, setDefaultModel] = useState<string>();
  const [recentEvents, setRecentEvents] = useState<TranscriptEvent[]>([]);
  const nearLimit = runningCount !== undefined && runningLimit !== undefined && runningLimit > 0 && runningCount >= runningLimit - 1;
  useEffect(() => {
    const controller = new AbortController();
    setCapabilityTransport(undefined);
    setDefaultModel(undefined);
    if (workspace) void runtime.workspace.gitStatus(workspace.id, controller.signal).then((status) => setBranch(status.branch ?? status.detachedHead)).catch(() => undefined);
    if (profile) void runtime.engines.profileCapabilities(profile.id, controller.signal).then((capabilities) => {
      setCapabilityTransport(capabilities.supportsHeadlessTurns ? "json-stream" : "pty");
      setDefaultModel(capabilities.defaultModel);
    }).catch(() => undefined);
    void runtime.events.transcript(session.id, 0, 200, controller.signal).then((page) => setRecentEvents(Array.isArray(page?.events) ? page.events : [])).catch(() => undefined);
    return () => controller.abort();
  }, [profile, runtime.engines, runtime.events, runtime.workspace, session.id, workspace]);
  const progress = [...recentEvents].reverse().find((event) => event.kind === "tool_activity" || event.kind === "lifecycle");
  const artifacts = [...new Set(recentEvents.filter((event) => event.kind === "file_change").map((event) => String(event.metadata?.path ?? event.raw)))].slice(-5);
  return <div className="summary-tab">
    {runningCount !== undefined && runningLimit !== undefined && <div className="runtime-monitor-row" role="status">
      <span>{t("runningSessionsLabel")}</span><strong>{runningCount}/{runningLimit}</strong>
      {nearLimit && <small className="runtime-monitor-warning">{t("nearConcurrencyLimit")}</small>}
    </div>}
    <div className="summary-details">
      <Detail label={t("engine")} value={profile?.adapterId === "claude-code" ? "Claude" : profile?.adapterId === "codex" ? "Codex" : profile?.name ?? t("unknownProfile")} />
      <Detail label={t("model")} value={session.chatContext?.activeModel ?? session.launchConfig?.model ?? defaultModel ?? t("modelDefault")} />
      <Detail label={t("transport")} value={capabilityTransport ?? "—"} mono />
      <Detail label={t("workspace")} value={workspace?.name ?? t("unknownWorkspace")} />
      <Detail label={t("branch")} value={branch ?? "—"} mono />
    </div>
    {progress && <section className="runtime-monitor-section"><strong><Icon name="target" />{t("qoderProgress")}</strong><p>{progress.raw}</p></section>}
    {artifacts.length > 0 && <section className="runtime-monitor-section"><strong><Icon name="zap" />{t("qoderArtifacts")}</strong>{artifacts.map((artifact) => <code key={artifact}>{artifact}</code>)}</section>}
  </div>;
}

function TerminalTab({ session }: { session: Session }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<string>(session.runtimeStatus ?? session.status ?? "stopped");
  const running = (session.runtimeStatus ?? session.status) === "running" || (session.runtimeStatus ?? session.status) === "starting";
  if (!running) return <EmptyState className="right-panel-empty" icon={<Icon name="terminal" />} title={t("qoderTerminal")} description={t("terminalStopped")} />;
  return <div className="terminal-tab">
    <div className="terminal-tab-header"><span className="eyebrow">{session.name}</span><span className={`chat-status ${status}`}>{status}</span></div>
    <div className="terminal-tab-body"><TerminalView sessionId={session.id} onStatus={setStatus} /></div>
  </div>;
}

function FilesTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<"files" | "preview" | "languages" | "diff" | "git">("git");
  const [selectedPath, setSelectedPath] = useState("");
  const subTabs: Array<typeof subTab> = ["git", "files", "preview", "languages", "diff"];
  return <div className="files-tab">
    <Tabs className="files-subtabs" ariaLabel={t("inspectorTabs")} value={subTab} onChange={setSubTab} items={subTabs.map((item) => ({ id: item, label: t(`tab_${item}`) }))} />
    <div className="files-subtab-content">
      {subTab === "git" && <GitTab workspace={workspace} />}
      {subTab === "files" && <WorkspaceFilesTab workspace={workspace} onSelect={(path) => { setSelectedPath(path); setSubTab("preview"); }} />}
      {subTab === "preview" && <PreviewTab workspace={workspace} initialPath={selectedPath} />}
      {subTab === "languages" && <LanguagesTab workspace={workspace} />}
      {subTab === "diff" && <DiffTab workspace={workspace} />}
    </div>
  </div>;
}

/** dev-only Raw Events 调试面板（dual-mode 设计§2）：展示原始 transcript 事件与归并结果对照 */
function RawEventsTab({ session }: { session: Session }) {
  const runtime = useClientRuntime();
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void runtime.events.transcript(session.id, 0, 200, controller.signal).then((page) => setEvents(Array.isArray(page?.events) ? page.events : [])).catch(() => undefined);
    return () => controller.abort();
  }, [runtime.events, session.id]);
  const viewModel = reduceSessionEvents(events);
  return <div className="raw-events-tab" style={{ fontSize: "11px", overflow: "auto", padding: "8px", fontFamily: "monospace" }}>
    <details open><summary style={{ cursor: "pointer", fontWeight: 600 }}>Raw Events ({events.length})</summary>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "300px", overflow: "auto" }}>{JSON.stringify(events.map((e) => ({ seq: e.sequence, kind: e.kind, raw: e.raw?.slice(0, 80), meta: e.metadata })), null, 1)}</pre>
    </details>
    <details><summary style={{ cursor: "pointer", fontWeight: 600 }}>Reduced View Model</summary>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "300px", overflow: "auto" }}>{JSON.stringify({
        messages: [...viewModel.messagesById.values()].map((m) => ({ id: m.id, kind: m.kind, content: m.content.slice(0, 80) })),
        tools: [...viewModel.toolCallsById.values()].map((t) => ({ id: t.id, tool: t.tool })),
        shellRuns: [...viewModel.shellRunsById.values()].map((s) => ({ id: s.id, outputLen: s.output.length })),
        files: [...viewModel.fileChangesByPath.keys()],
        approvals: [...viewModel.approvalsById.values()].map((a) => ({ id: a.approvalId, decision: a.decision, expired: a.expired })),
        status: viewModel.currentStatus
      }, null, 1)}</pre>
    </details>
  </div>;
}
