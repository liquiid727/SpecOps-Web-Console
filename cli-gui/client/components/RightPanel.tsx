import { useEffect, useRef, useState } from "react";
import type { CliProfile, Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { TerminalView } from "../terminal";
import { EmptyState, Icon, IconButton, Tabs } from "./ui";
import { useMobileDrawerFocus } from "./ui/useMobileDrawerFocus";
import { DetailsTab, DiffTab, FilesTab as WorkspaceFilesTab, GitTab, LanguagesTab, PreviewTab } from "./inspector-tabs";

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
  const tabs = [
    { id: "summary", label: t("qoderSummary") },
    { id: "terminal", label: t("qoderTerminal") },
    { id: "files", label: t("qoderFiles") },
    { id: "spec", label: t("qoderSpec") },
    { id: "review", label: t("qoderReview") }
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
      {tab === "spec" && <SpecTab />}
      {tab === "review" && <ReviewTab />}
    </div>
  </aside>;
}

function SummaryTab({ session, workspace, profile, runningCount, runningLimit }: { session: Session; workspace?: Workspace; profile?: CliProfile; runningCount?: number; runningLimit?: number }) {
  const { t } = useI18n();
  const nearLimit = runningCount !== undefined && runningLimit !== undefined && runningLimit > 0 && runningCount >= runningLimit - 1;
  return <div className="summary-tab">
    {runningCount !== undefined && runningLimit !== undefined && <div className="runtime-monitor-row" role="status">
      <span>{t("runningSessionsLabel")}</span><strong>{runningCount}/{runningLimit}</strong>
      {nearLimit && <small className="runtime-monitor-warning">{t("nearConcurrencyLimit")}</small>}
    </div>}
    <div className="summary-details"><DetailsTab session={session} workspace={workspace} profile={profile} /></div>
    <div className="right-panel-empty">
      <div><Icon name="target" /><strong>{t("qoderProgress")}</strong><p>{t("qoderProgressEmpty")}</p></div>
      <div><Icon name="zap" /><strong>{t("qoderArtifacts")}</strong><p>{t("qoderArtifactsEmpty")}</p></div>
      <div><Icon name="book" /><strong>{t("qoderReferences")}</strong><p>{t("qoderReferencesEmpty")}</p></div>
    </div>
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

function SpecTab() {
  const { t } = useI18n();
  return <EmptyState className="right-panel-empty" icon={<Icon name="file" />} title={t("qoderSpec")} description={t("qoderSpecEmpty")} />;
}

function ReviewTab() {
  const { t } = useI18n();
  return <EmptyState className="right-panel-empty" icon={<Icon name="shield" />} title={t("qoderReview")} description={t("qoderReviewEmpty")} />;
}
