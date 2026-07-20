import { useEffect, useRef, useState } from "react";
import type { CliProfile, FilePreview, FileTreePage, GitDiffResponse, GitStatusResponse, LanguageSummaryResponse, Session, Workspace } from "../../shared/types";
import { api } from "../api";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { useFeedback } from "./ui/Feedback";
import { Select } from "./ui/Select";
import { StatusBadge } from "./StatusBadge";

type InspectorTab = "details" | "files" | "preview" | "languages" | "diff" | "git";

interface SessionInspectorProps {
  profile?: CliProfile;
  readonly: boolean;
  session: Session;
  workspace?: Workspace;
  onClose: () => void;
  onDelete: () => void;
  onRename: () => void;
  initialTab?: InspectorTab;
  onTabChange?: (tab: InspectorTab) => void;
}

export function SessionInspector({ profile, readonly, session, workspace, onClose, onDelete, onRename, initialTab = "details", onTabChange }: SessionInspectorProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<InspectorTab>(initialTab);
  const [selectedPath, setSelectedPath] = useState("");
  useEffect(() => setTab(initialTab), [initialTab]);
  function selectTab(next: InspectorTab) { setTab(next); onTabChange?.(next); }
  return <aside id="session-inspector" className="session-inspector" aria-label={t("sessionInspector")}>
    <header className="inspector-header"><div><span className="eyebrow">{t("session").toUpperCase()}</span><h2>{t("inspector")}</h2></div><button className="icon-button" onClick={onClose} aria-label={t("closeSessionDetails")}><Icon name="close" /></button></header>
    <div className="inspector-tabs" role="tablist" aria-label={t("inspectorTabs")}>
      {(["details", "files", "preview", "languages", "diff", "git"] as InspectorTab[]).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => selectTab(item)}>{t(`tab_${item}`)}</button>)}
    </div>
    <div className="inspector-content">
      {tab === "details" && <DetailsTab session={session} workspace={workspace} profile={profile} />}
      {tab === "files" && <FilesTab workspace={workspace} onSelect={(path) => { setSelectedPath(path); selectTab("preview"); }} />}
      {tab === "preview" && <PreviewTab workspace={workspace} initialPath={selectedPath} />}
      {tab === "languages" && <LanguagesTab workspace={workspace} />}
      {tab === "diff" && <DiffTab workspace={workspace} />}
      {tab === "git" && <GitTab workspace={workspace} />}
    </div>
    <footer className="inspector-actions">
      <button className="secondary-button" onClick={onRename}>{t("rename")}</button>
      <button className="danger-button" onClick={onDelete} disabled={readonly}><Icon name="trash" />{t("deleteSession")}</button>
    </footer>
  </aside>;
}

function DetailsTab({ profile, session, workspace }: { profile?: CliProfile; session: Session; workspace?: Workspace }) {
  const { language, t } = useI18n();
  const command = profile ? [profile.command, ...profile.args].map((part) => JSON.stringify(part)).join(" ") : "-";
  const error = typeof session.error === "string" ? session.error : session.error?.message;
  return <>
    <div className="inspector-summary"><div className="session-avatar"><Icon name="terminal" /></div><div><strong>{session.name}</strong><StatusBadge status={session.runtimeStatus ?? session.status ?? "stopped"} /></div></div>
    <Detail label={t("cliProfile")} value={profile?.name ?? t("unknownProfile")} />
    <Detail label={t("command")} value={command} mono />
    <Detail label={t("workspace")} value={workspace?.name ?? t("unknownWorkspace")} />
    <Detail label={t("directory")} value={workspace?.path ?? "-"} mono />
    <Detail label={t("created")} value={formatDate(session.createdAt, language)} />
    <Detail label={t("lastActive")} value={formatDate(session.lastActiveAt, language)} />
    {session.exitCode !== undefined && <Detail label={t("exitCode")} value={String(session.exitCode)} mono />}
    {error && <div className="session-error"><span>{t("error")}</span><p>{error}</p></div>}
  </>;
}

function FilesTab({ workspace, onSelect }: { workspace?: Workspace; onSelect: (path: string) => void }) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [data, setData] = useState<FileTreePage>();
  const [error, setError] = useState<string>();
  const [directory, setDirectory] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!workspace) return;
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    void api.workspaceFiles(workspace.id, directory, undefined, controller.signal).then(setData).catch((cause) => { if (cause?.name !== "AbortError") { setError(t("inspectionFailed")); feedback.error(toFeedbackError(cause, t, "inspectionFailed", `files:${workspace.id}:${directory}`)); } });
    return () => controller.abort();
  }, [directory, feedback, reload, workspace, t]);
  if (!workspace) return <InspectorState text={t("unknownWorkspace")} />;
  if (error) return <InspectorState text={error} error onRetry={() => setReload((value) => value + 1)} />;
  if (!data) return <InspectorState text={t("loading")} />;
  return <div className="inspector-list"><div className="inspector-tab-toolbar">{directory ? <button className="secondary-button" onClick={() => setDirectory(directory.split("/").slice(0, -1).join("/"))}>{t("parentDirectory")}</button> : <span className="eyebrow">{t("tab_files")}</span>}<button className="icon-button" onClick={() => setReload((value) => value + 1)} aria-label={t("refresh")} title={t("refresh")}><Icon name="refresh" /></button></div>{data.entries.map((entry) => <button className="inspector-list-row file-entry-button" key={entry.path} onClick={() => entry.type === "directory" ? setDirectory(entry.path) : onSelect(entry.path)}><Icon name={entry.type === "directory" ? "folder" : "terminal"} /><span>{entry.path}</span></button>)}{data.nextCursor && <button className="secondary-button" onClick={() => void api.workspaceFiles(workspace.id, directory, data.nextCursor).then((page) => setData({ ...page, entries: [...data.entries, ...page.entries] }))}>{t("loadMore")}</button>}</div>;
}

function PreviewTab({ workspace, initialPath }: { workspace?: Workspace; initialPath: string }) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [path, setPath] = useState(initialPath);
  const [preview, setPreview] = useState<FilePreview>();
  const [error, setError] = useState<string>();
  const requestRef = useRef<AbortController | undefined>(undefined);
  async function load(requestedPath = path) {
    if (!workspace || !requestedPath.trim()) return;
    setError(undefined);
    setPreview(undefined);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    await api.filePreview(workspace.id, requestedPath.trim(), controller.signal).then(setPreview).catch((cause) => { if (cause?.name !== "AbortError") { setError(t("inspectionFailed")); feedback.error(toFeedbackError(cause, t, "inspectionFailed", `preview:${workspace.id}:${requestedPath}`)); } });
  }
  useEffect(() => {
    setPath(initialPath);
    if (initialPath) void load(initialPath);
    return () => requestRef.current?.abort();
  }, [initialPath, workspace]);
  return <div className="preview-tab">
    <div className="preview-form"><input aria-label={t("filePath")} placeholder="README.md" value={path} onChange={(event) => setPath(event.target.value)} /><button className="secondary-button" onClick={() => void load()}>{t("preview")}</button></div>
    {error && <InspectorState text={error} error onRetry={() => void load()} />}
    {preview && <pre className="file-preview"><code>{preview.content ?? t(preview.kind === "binary" ? "binaryFile" : "oversizedFile")}</code></pre>}
  </div>;
}

function LanguagesTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [data, setData] = useState<LanguageSummaryResponse>();
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!workspace) return;
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    void api.languageSummary(workspace.id, controller.signal).then(setData).catch((cause) => { if (cause?.name !== "AbortError") { setError(t("inspectionFailed")); feedback.error(toFeedbackError(cause, t, "inspectionFailed", `languages:${workspace.id}`)); } });
    return () => controller.abort();
  }, [feedback, reload, workspace, t]);
  if (error) return <InspectorState text={error} error onRetry={() => setReload((value) => value + 1)} />;
  if (!data) return <InspectorState text={t("loading")} />;
  return <div className="inspector-list"><div className="inspector-tab-toolbar"><span className="eyebrow">{t("tab_languages")}</span><button className="icon-button" onClick={() => setReload((value) => value + 1)} aria-label={t("refresh")} title={t("refresh")}><Icon name="refresh" /></button></div>{data.partial && <div className="inspector-notice">{t("inspectionTruncated")}</div>}{data.entries.map((entry) => <div className="detail-row" key={entry.language}><span>{entry.language}</span><strong>{entry.files} / {Math.round(entry.share * 100)}%</strong></div>)}</div>;
}

function DiffTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [scope, setScope] = useState<"unstaged" | "staged">("unstaged");
  const [data, setData] = useState<GitDiffResponse>();
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!workspace) return;
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    void api.gitDiff(workspace.id, scope, controller.signal).then(setData).catch((cause) => { if (cause?.name !== "AbortError") { setError(t("inspectionFailed")); feedback.error(toFeedbackError(cause, t, "inspectionFailed", `diff:${workspace.id}:${scope}`)); } });
    return () => controller.abort();
  }, [feedback, workspace, scope, reload, t]);
  if (!workspace) return <InspectorState text={t("unknownWorkspace")} />;
  return <div className="diff-tab">
    <div className="inspector-tab-toolbar"><Select ariaLabel={t("diffScope")} value={scope} options={[{ value: "unstaged", label: t("unstaged") }, { value: "staged", label: t("staged") }]} onChange={(value) => setScope(value as "unstaged" | "staged")} /><button className="icon-button" onClick={() => setReload((value) => value + 1)} aria-label={t("refresh")} title={t("refresh")}><Icon name="refresh" /></button></div>
    {error && <InspectorState text={error} error onRetry={() => setReload((value) => value + 1)} />}
    {data?.truncated && <div className="inspector-notice">{t("inspectionTruncated")}</div>}
    {!data ? <InspectorState text={t("loading")} /> : data.files.length === 0 ? <InspectorState text={t("noDiff")} /> : <div className="diff-view">
      {data.files.map((file, fileIndex) => <section className="diff-file" key={`${file.oldPath ?? "new"}-${file.newPath ?? "deleted"}-${fileIndex}`}>
        <header className="diff-file-header"><strong>{file.newPath ?? file.oldPath ?? t("unknownFile")}</strong><span>{file.status}</span></header>
        {file.hunks.map((hunk, hunkIndex) => <div className="diff-hunk" key={`${hunk.header}-${hunkIndex}`}>
          <div className="diff-hunk-header">{hunk.header}</div>
          {hunk.lines.map((line, lineIndex) => <div className={`diff-line ${line.kind}`} key={`${lineIndex}-${line.text}`}><span>{line.oldLine ?? ""}</span><span>{line.newLine ?? ""}</span><code>{line.text}</code></div>)}
        </div>)}
      </section>)}
    </div>}
  </div>;
}

function GitTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [data, setData] = useState<GitStatusResponse>();
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!workspace) return;
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    void api.gitStatus(workspace.id, controller.signal).then(setData).catch((cause) => { if (cause?.name !== "AbortError") { setError(t("inspectionFailed")); feedback.error(toFeedbackError(cause, t, "inspectionFailed", `git:${workspace.id}`)); } });
    return () => controller.abort();
  }, [feedback, workspace, reload, t]);
  if (!workspace) return <InspectorState text={t("unknownWorkspace")} />;
  if (error) return <InspectorState text={error} error onRetry={() => setReload((value) => value + 1)} />;
  if (!data) return <InspectorState text={t("loading")} />;
  if (!data.repository) return <InspectorState text={t("notGitRepository")} />;
  const stagedCount = data.entries.filter((entry) => entry.staged !== "unmodified").length;
  const unstagedCount = data.entries.filter((entry) => entry.unstaged !== "unmodified").length;
  return <div className="inspector-list">
    <div className="inspector-tab-toolbar"><span className="eyebrow">{t("gitState")}</span><button className="icon-button" onClick={() => setReload((value) => value + 1)} aria-label={t("refresh")} title={t("refresh")}><Icon name="refresh" /></button></div>
    <Detail label={t("branch")} value={data.branch ?? "-"} />
    {data.detachedHead && <Detail label={t("detachedHead")} value={data.detachedHead} mono />}
    <Detail label={t("gitState")} value={data.clean ? t("clean") : t("dirty")} />
    <div className="git-counts"><span>{t("staged")}: <strong>{stagedCount}</strong></span><span>{t("unstaged")}: <strong>{unstagedCount}</strong></span></div>
    {data.truncated && <div className="inspector-notice">{t("inspectionTruncated")}</div>}
    {data.entries.map((entry) => <div className="inspector-list-row" key={entry.path}><span>{entry.path}</span><small>{entry.staged}/{entry.unstaged}</small></div>)}
  </div>;
}

function InspectorState({ text, error = false, onRetry }: { text: string; error?: boolean; onRetry?: () => void }) {
  const { t } = useI18n();
  return <div className={`inspector-state ${error ? "error" : ""}`} role={error ? "status" : undefined}><span>{text}</span>{onRetry && <button className="secondary-button" onClick={onRetry}>{t("retry")}</button>}</div>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="detail-row"><span>{label}</span><strong className={mono ? "mono" : ""}>{value}</strong></div>;
}

function formatDate(value: string, language: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
