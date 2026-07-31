import { useMemo, useState } from "react";
import type { Session, Workspace } from "../../shared/types";
import { useI18n, type TranslationKey } from "../i18n";
import { filterByInteractionMode, sortSessions } from "../app/session-selectors";
import { Icon } from "./ui/Icon";
import { Button, TextField } from "./ui";
import { ViewHeader } from "./patterns";

interface QuestBoardViewProps {
  sessions: Session[];
  workspaces: Workspace[];
  onSelectSession: (id: string) => void;
}

const VISIBLE_WORKSPACE_CHIPS = 5;

/** View all quests：侧栏 Quests 区“查看全部”入口对应的看板视图（Running / Waiting / Completed 三栏总览） */
export function QuestBoardView({ sessions, workspaces, onSelectSession }: QuestBoardViewProps) {
  const { t, statusLabel } = useI18n();
  const [query, setQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [chipsExpanded, setChipsExpanded] = useState(false);

  // 看板只呈现 Quest（terminal 会话）；归档的不展示，与侧栏 Quests 区口径一致
  const quests = useMemo(
    () => filterByInteractionMode(sessions, "terminal").filter((session) => (session.organizationStatus ?? "active") !== "archived"),
    [sessions]
  );
  const questCountByWorkspace = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of quests) counts.set(session.workspaceId, (counts.get(session.workspaceId) ?? 0) + 1);
    return counts;
  }, [quests]);
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return quests.filter((session) => (!text || session.name.toLowerCase().includes(text)) && (workspaceFilter === "all" || session.workspaceId === workspaceFilter));
  }, [quests, query, workspaceFilter]);

  // 列口径：Running=运行中，Waiting=启动排队中，Completed=其余（已停止/出错/标记完成）
  const columns: { id: string; labelKey: TranslationKey; tone: "running" | "waiting" | "completed"; sessions: Session[] }[] = [
    { id: "running", labelKey: "questBoardRunning", tone: "running", sessions: sortSessions(visible.filter((session) => session.runtimeStatus === "running"), "recent") },
    { id: "waiting", labelKey: "questBoardWaiting", tone: "waiting", sessions: sortSessions(visible.filter((session) => session.runtimeStatus === "starting"), "recent") },
    { id: "completed", labelKey: "questBoardCompleted", tone: "completed", sessions: sortSessions(visible.filter((session) => session.runtimeStatus !== "running" && session.runtimeStatus !== "starting"), "recent") }
  ];
  const shownWorkspaces = chipsExpanded ? workspaces : workspaces.slice(0, VISIBLE_WORKSPACE_CHIPS);
  const hiddenCount = workspaces.length - shownWorkspaces.length;

  function cardBadge(session: Session) {
    if (session.organizationStatus === "completed") return <span className="status-badge completed">{t("questBoardCompleted")}</span>;
    return <span className={`status-badge ${session.runtimeStatus ?? "stopped"}`}>{statusLabel(session.runtimeStatus ?? "stopped")}</span>;
  }

  return (
    <div className="quest-board">
      <ViewHeader title={<><Icon name="list" />{t("qoderMyQuests")}</>} />
      <div className="quest-board-toolbar">
        <TextField
          className="quest-board-search"
          type="search"
          aria-label={t("questBoardSearch")}
          placeholder={t("questBoardSearch")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="quest-board-filter" role="group" aria-label={t("qoderWorkspace")}>
          <span>{t("qoderWorkspace")}</span>
          <Button unstyled className={`quest-board-chip ${workspaceFilter === "all" ? "active" : ""}`} aria-pressed={workspaceFilter === "all"} onClick={() => setWorkspaceFilter("all")}>{t("questBoardAll")}</Button>
          {shownWorkspaces.map((workspace) => (
            <Button
              unstyled
              key={workspace.id}
              className={`quest-board-chip ${workspaceFilter === workspace.id ? "active" : ""}`}
              aria-pressed={workspaceFilter === workspace.id}
              onClick={() => setWorkspaceFilter(workspaceFilter === workspace.id ? "all" : workspace.id)}
            >
              {workspace.name} ({questCountByWorkspace.get(workspace.id) ?? 0})
            </Button>
          ))}
          {(hiddenCount > 0 || chipsExpanded) && workspaces.length > VISIBLE_WORKSPACE_CHIPS && (
            <Button unstyled className="quest-board-chip more" onClick={() => setChipsExpanded((expanded) => !expanded)}>
              {chipsExpanded ? t("questBoardLess") : t("questBoardMore", { count: hiddenCount })}
            </Button>
          )}
        </div>
      </div>
      <div className="quest-board-columns">
        {columns.map((column) => (
          <section className="quest-board-column" key={column.id} aria-label={t(column.labelKey)}>
            <header className="quest-board-column-heading">
              <span className={`quest-board-dot ${column.tone}`} aria-hidden="true" />
              <strong>{t(column.labelKey)}</strong>
              <span className="quest-board-count">{column.sessions.length}</span>
            </header>
            <div className="quest-board-cards">
              {column.sessions.length === 0 && <p className="quest-board-empty">{t("questBoardEmpty")}</p>}
              {column.sessions.map((session) => (
                <Button unstyled key={session.id} className="quest-board-card" onClick={() => onSelectSession(session.id)}>
                  <strong>{session.name}</strong>
                  <small>{workspaces.find((workspace) => workspace.id === session.workspaceId)?.name ?? "—"}</small>
                  {cardBadge(session)}
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
