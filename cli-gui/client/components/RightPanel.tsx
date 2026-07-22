import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, Workspace } from "../../shared/types";
import { api } from "../api";
import { toFeedbackError, toFeedbackWarning } from "../feedback-errors";
import { useI18n } from "../i18n";
import { useFeedback } from "./ui/Feedback";
import { Icon } from "./ui/Icon";
import { TerminalView } from "../terminal";

interface RightPanelProps {
  session: Session;
  workspace?: Workspace;
  profile?: { name: string };
  readonly: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onClose: () => void;
}

export function RightPanel({ session, workspace, profile, readonly, activeTab = "summary", onTabChange, onClose }: RightPanelProps) {
  const { t } = useI18n();
  const tabs = [
    { id: "summary", label: t("qoderSummary") },
    { id: "terminal", label: t("qoderTerminal") },
    { id: "files", label: t("qoderFiles") },
    { id: "spec", label: t("qoderSpec") },
    { id: "review", label: t("qoderReview") }
  ];
  const [tab, setTab] = useState(activeTab);
  useEffect(() => setTab(activeTab), [activeTab]);
  function selectTab(next: string) { setTab(next); onTabChange?.(next); }
  return <aside id="session-inspector" className="qoder-right-panel" aria-label={t("sessionInspector")}>
    <header className="right-panel-header"><div className="right-panel-tabs" role="tablist" aria-label={t("inspectorTabs")}>{tabs.map(({ id, label }) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => selectTab(id)}>{label}</button>)}</div><button type="button" className="qoder-icon-button" onClick={onClose} aria-label={t("closeSessionDetails")}><Icon name="close" /></button></header>
    <div className="right-panel-content">{tab === "summary" && <SummaryTab />}{tab === "terminal" && <TerminalTab sessionId={session.id} />}{tab === "files" && <FilesTab workspace={workspace} />}{tab === "spec" && <SpecTab />}{tab === "review" && <ReviewTab />}</div>
  </aside>;
}

function SummaryTab() {
  const { t } = useI18n();
  return <div className="right-panel-empty"><div><Icon name="target" /><strong>{t("qoderProgress")}</strong><p>{t("qoderProgressEmpty")}</p></div><div><Icon name="zap" /><strong>{t("qoderArtifacts")}</strong><p>{t("qoderArtifactsEmpty")}</p></div><div><Icon name="book" /><strong>{t("qoderReferences")}</strong><p>{t("qoderReferencesEmpty")}</p></div></div>;
}

function TerminalTab({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const [status, setStatus] = useState("");
  return <div className="right-panel-empty"><Icon name="terminal" /><strong>{t("qoderTerminal")}</strong><p>{t("qoderComingSoon")}</p></div>;
}

function FilesTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  return <div className="right-panel-empty"><Icon name="folder" /><strong>{t("qoderFiles")}</strong><p>{t("qoderNoFilesModified")}</p></div>;
}

function SpecTab() {
  const { t } = useI18n();
  return <div className="right-panel-empty"><Icon name="file" /><strong>{t("qoderSpec")}</strong><p>{t("qoderSpecEmpty")}</p></div>;
}

function ReviewTab() {
  const { t } = useI18n();
  return <div className="right-panel-empty"><Icon name="shield" /><strong>{t("qoderReview")}</strong><p>{t("qoderReviewEmpty")}</p></div>;
}
