import { useEffect, useState } from "react";
import type { CliProfile, FilePreview, FileTreePage, GitDiffResponse, GitStatusResponse, LanguageSummaryResponse, Session, Workspace } from "../../shared/types";
import { api } from "../api";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
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
}

export function SessionInspector({ profile, readonly, session, workspace, onClose, onDelete, onRename }: SessionInspectorProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<InspectorTab>("details");
  return <aside id="session-inspector" className="session-inspector" aria-label={t("sessionInspector")}>
    <header className="inspector-header"><div><span className="eyebrow">{t("session").toUpperCase()}</span><h2>{t("inspector")}</h2></div><button className="icon-button" onClick={onClose} aria-label={t("closeSessionDetails")}><Icon name="close" /></button></header>
    <div className="inspector-tabs" role="tablist" aria-label={t("inspectorTabs")}>
      {(["details", "files", "preview", "languages", "diff", "git"] as InspectorTab[]).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{t(`tab_${item}`)}</button>)}
    </div>
    <div className="inspector-content">
      {tab === "details" && <DetailsTab session={session} workspace={workspace} profile={profile} />}
      {tab === "files" && <FilesTab workspace={workspace} />}
      {tab === "preview" && <PreviewTab workspace={workspace} />}
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
    <div className="inspector-summary"><div className="session-avatar"><Icon name="terminal" /></div><div><strong>{session.name}</strong><StatusBadge status={session.status} /></div></div>
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

function FilesTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  const [data, setData] = useState<FileTreePage>();
  const [error, setError] = useState<string>();
  useEffect(() => { if (workspace) void api.workspaceFiles(workspace.id).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : t("operationFailed"))); }, [workspace, t]);
  if (!workspace) return <InspectorState text={t("unknownWorkspace")} />;
  if (error) return <InspectorState text={error} error />;
  if (!data) return <InspectorState text={t("loading")} />;
  return <div className="inspector-list">{data.entries.map((entry) => <div className="inspector-list-row" key={entry.path}><Icon name={entry.type === "directory" ? "folder" : "terminal"} /><span>{entry.path}</span></div>)}</div>;
}

function PreviewTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  const [path, setPath] = useState("");
  const [preview, setPreview] = useState<FilePreview>();
  const [error, setError] = useState<string>();
  async function load() {
    if (!workspace || !path.trim()) return;
    setError(undefined);
    setPreview(undefined);
    await api.filePreview(workspace.id, path.trim()).then(setPreview).catch((cause) => setError(cause instanceof Error ? cause.message : t("operationFailed")));
  }
  return <div className="preview-tab">
    <div className="preview-form"><input aria-label={t("filePath")} placeholder="README.md" value={path} onChange={(event) => setPath(event.target.value)} /><button className="secondary-button" onClick={() => void load()}>{t("preview")}</button></div>
    {error && <InspectorState text={error} error />}
    {preview && <pre className="file-preview"><code>{preview.content ?? t(preview.kind === "binary" ? "binaryFile" : "oversizedFile")}</code></pre>}
  </div>;
}

function LanguagesTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  const [data, setData] = useState<LanguageSummaryResponse>();
  const [error, setError] = useState<string>();
  useEffect(() => { if (workspace) void api.languageSummary(workspace.id).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : t("operationFailed"))); }, [workspace, t]);
  if (error) return <InspectorState text={error} error />;
  if (!data) return <InspectorState text={t("loading")} />;
  return <div className="inspector-list">{data.entries.map((entry) => <div className="detail-row" key={entry.language}><span>{entry.language}</span><strong>{entry.files} / {Math.round(entry.share * 100)}%</strong></div>)}</div>;
}

function DiffTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  const [scope, setScope] = useState<"unstaged" | "staged">("unstaged");
  const [data, setData] = useState<GitDiffResponse>();
  const [error, setError] = useState<string>();
  useEffect(() => { if (workspace) void api.gitDiff(workspace.id, scope).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : t("operationFailed"))); }, [workspace, scope, t]);
  return <div className="diff-tab">
    <select aria-label={t("diffScope")} value={scope} onChange={(event) => setScope(event.target.value as "unstaged" | "staged")}><option value="unstaged">{t("unstaged")}</option><option value="staged">{t("staged")}</option></select>
    {error && <InspectorState text={error} error />}
    {!data ? <InspectorState text={t("loading")} /> : <pre className="file-preview"><code>{data.files.flatMap((file) => file.hunks.flatMap((hunk) => [hunk.header, ...hunk.lines.map((line) => line.text)])).join("\n") || t("noDiff")}</code></pre>}
  </div>;
}

function GitTab({ workspace }: { workspace?: Workspace }) {
  const { t } = useI18n();
  const [data, setData] = useState<GitStatusResponse>();
  const [error, setError] = useState<string>();
  useEffect(() => { if (workspace) void api.gitStatus(workspace.id).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : t("operationFailed"))); }, [workspace, t]);
  if (error) return <InspectorState text={error} error />;
  if (!data) return <InspectorState text={t("loading")} />;
  if (!data.repository) return <InspectorState text={t("notGitRepository")} />;
  return <div className="inspector-list">
    <Detail label={t("branch")} value={data.branch ?? data.detachedHead ?? "-"} />
    <Detail label={t("gitState")} value={data.clean ? t("clean") : t("dirty")} />
    {data.entries.map((entry) => <div className="inspector-list-row" key={entry.path}><span>{entry.path}</span><small>{entry.staged}/{entry.unstaged}</small></div>)}
  </div>;
}

function InspectorState({ text, error = false }: { text: string; error?: boolean }) {
  return <div className={`inspector-state ${error ? "error" : ""}`}>{text}</div>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="detail-row"><span>{label}</span><strong className={mono ? "mono" : ""}>{value}</strong></div>;
}

function formatDate(value: string, language: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
