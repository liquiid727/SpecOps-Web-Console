import { useEffect, useMemo, useState } from "react";
import type { SkillContentResponse, SkillScope, SkillSummary, Workspace } from "../../shared/types";
import { api } from "../api";
import { useI18n } from "../i18n";
import { Icon, type IconName } from "./ui/Icon";
import { Badge, Button, EmptyState, Select, Tabs, TextField } from "./ui";
import { ViewHeader } from "./patterns";

type KnowledgeTab = "wiki" | "card" | "memory" | "skills";

const wikiDocs = [
  { id: "readme", key: "qoderWikiReadme" as const },
  { id: "architecture", key: "qoderWikiArchitecture" as const },
  { id: "contributing", key: "qoderWikiContributing" as const }
];

const memoryItems = [
  { id: "recent", key: "qoderMemoryRecent" as const },
  { id: "preferences", key: "qoderMemoryPreferences" as const }
];

const tabMeta: { id: KnowledgeTab; key: string; icon: IconName }[] = [
  { id: "wiki", key: "qoderRepoWiki", icon: "book" },
  { id: "card", key: "qoderKnowledgeCard", icon: "file-code" },
  { id: "memory", key: "qoderMemory", icon: "sparkles" },
  { id: "skills", key: "qoderSkills", icon: "zap" }
];

interface KnowledgeViewProps {
  /** Skills tab workspace scope 数据源（console-gaps SPEC §7.4）；缺省空列表 */
  workspaces?: Workspace[];
  /** 默认选中当前活跃会话的 workspace */
  activeWorkspaceId?: string;
}

export function KnowledgeView({ workspaces = [], activeWorkspaceId }: KnowledgeViewProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<KnowledgeTab>("wiki");
  const [selectedWiki, setSelectedWiki] = useState<string>(wikiDocs[0].id);
  const [selectedMemory, setSelectedMemory] = useState<string>(memoryItems[0].id);
  const [query, setQuery] = useState("");

  const filteredWiki = useMemo(
    () => wikiDocs.filter((doc) => t(doc.key).toLowerCase().includes(query.trim().toLowerCase())),
    [query, t]
  );

  return (
    <div className="knowledge-view">
      <ViewHeader title={<><Icon name="book" />{t("qoderKnowledge")}</>} actions={<TextField className="view-search" type="search" aria-label={t("qoderSearchWiki")} placeholder={t("qoderSearchWiki")} value={query} onChange={(event) => setQuery(event.target.value)} />} />

      <Tabs className="knowledge-tabs" ariaLabel={t("qoderKnowledge")} value={tab} onChange={setTab} items={tabMeta.map((item) => ({ id: item.id, label: <><Icon name={item.icon} />{t(item.key)}</> }))} />

      <div className="knowledge-body">
        {tab === "wiki" && (
          <>
            <nav className="knowledge-tree" aria-label={t("qoderRepoWiki")}>
              {filteredWiki.length === 0 && <p className="sidebar-empty">{t("qoderKnowledgeUnavailable")}</p>}
              {filteredWiki.map((doc) => (
                <Button variant="ghost" key={doc.id} className={selectedWiki === doc.id ? "active" : ""} aria-current={selectedWiki === doc.id ? "page" : undefined} onClick={() => setSelectedWiki(doc.id)}>
                  <Icon name="file" />{t(doc.key)}
                </Button>
              ))}
            </nav>
            <section className="knowledge-detail">
              {filteredWiki.length === 0
                ? <EmptyState className="empty-state" icon={<Icon name="book" />} title={t("qoderKnowledgeTitle")} description={t("qoderKnowledgeUnavailable")} />
                : <article>
                  <h3>{t(wikiDocs.find((doc) => doc.id === selectedWiki)?.key ?? "qoderRepoWiki")}</h3>
                  <p>{t("qoderKnowledgeDescription")}</p>
                </article>}
            </section>
          </>
        )}

        {tab === "card" && (
          <section className="knowledge-detail">
            <article>
              <h3>{t("qoderKnowledgeCard")}</h3>
              <p>{t("qoderKnowledgeDescription")}</p>
            </article>
          </section>
        )}

        {tab === "memory" && (
          <>
            <nav className="knowledge-tree" aria-label={t("qoderMemory")}>
              {memoryItems.map((item) => (
                <Button variant="ghost" key={item.id} className={selectedMemory === item.id ? "active" : ""} aria-current={selectedMemory === item.id ? "page" : undefined} onClick={() => setSelectedMemory(item.id)}>
                  <Icon name="sparkles" />{t(item.key)}
                </Button>
              ))}
            </nav>
            <section className="knowledge-detail">
              <article>
                <h3>{t(memoryItems.find((item) => item.id === selectedMemory)?.key ?? "qoderMemory")}</h3>
                <p>{t("qoderKnowledgeDescription")}</p>
              </article>
            </section>
          </>
        )}

        {tab === "skills" && <SkillsPanel query={query} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />}
      </div>
    </div>
  );
}

/** Skills 只读浏览（console-gaps SPEC §7.4）：system/workspace scope 切换 + 列表 + SKILL.md 原文预览 */
function SkillsPanel({ query, workspaces, activeWorkspaceId }: { query: string; workspaces: Workspace[]; activeWorkspaceId?: string }) {
  const { t } = useI18n();
  const [scope, setScope] = useState<SkillScope>("system");
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(activeWorkspaceId ?? workspaces[0]?.id);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [content, setContent] = useState<SkillContentResponse | undefined>(undefined);
  const [contentStatus, setContentStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const workspaceMissing = scope === "workspace" && !workspaceId;

  useEffect(() => {
    setSelected(undefined);
    setContent(undefined);
    setContentStatus("idle");
    if (workspaceMissing) {
      setSkills([]);
      setStatus("ready");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    api.skills(scope, scope === "workspace" ? workspaceId : undefined, controller.signal)
      .then((response) => { setSkills(response.skills); setStatus("ready"); })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [scope, workspaceId, workspaceMissing]);

  const openSkill = (id: string) => {
    setSelected(id);
    setContentStatus("loading");
    api.skillContent(scope, id, scope === "workspace" ? workspaceId : undefined)
      .then((response) => { setContent(response); setContentStatus("ready"); })
      .catch(() => setContentStatus("error"));
  };

  const filtered = useMemo(
    () => skills.filter((skill) => `${skill.name} ${skill.description}`.toLowerCase().includes(query.trim().toLowerCase())),
    [skills, query]
  );
  const active = skills.find((skill) => skill.id === selected);

  return (
    <>
      <nav className="knowledge-tree skills-tree" aria-label={t("qoderSkills")}>
        <div className="skills-scope" role="group" aria-label={t("qoderSkills")}>
          <Button variant={scope === "system" ? "secondary" : "ghost"} aria-pressed={scope === "system"} onClick={() => setScope("system")}>{t("skillsScopeSystem")}</Button>
          <Button variant={scope === "workspace" ? "secondary" : "ghost"} aria-pressed={scope === "workspace"} onClick={() => setScope("workspace")}>{t("skillsScopeWorkspace")}</Button>
        </div>
        {scope === "workspace" && workspaces.length > 0 && (
          <Select className="skills-workspace" ariaLabel={t("skillsScopeWorkspace")} value={workspaceId ?? ""} onChange={setWorkspaceId} options={workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name }))} />
        )}
        {status === "loading" && <p className="sidebar-empty">{t("skillsLoading")}</p>}
        {status === "error" && <p className="sidebar-empty" role="alert">{t("skillsLoadFailed")}</p>}
        {status === "ready" && workspaceMissing && <p className="sidebar-empty">{t("skillsNoWorkspace")}</p>}
        {status === "ready" && !workspaceMissing && filtered.length === 0 && <p className="sidebar-empty">{t("skillsEmpty")}</p>}
        {status === "ready" && filtered.map((skill) => (
          <Button variant="ghost" key={skill.id} className={`skills-item ${selected === skill.id ? "active" : ""}`} aria-current={selected === skill.id ? "true" : undefined} onClick={() => openSkill(skill.id)}>
            <span className="skills-item-name"><Icon name="zap" />{skill.name}<Badge className={`skills-source skills-source-${skill.source}`}>{skill.source}</Badge></span>
            {skill.description && <span className="skills-item-description">{skill.description}</span>}
          </Button>
        ))}
      </nav>
      <section className="knowledge-detail">
        {contentStatus === "idle" && <EmptyState className="empty-state" icon={<Icon name="zap" />} title={t("qoderSkills")} description={t("skillsSelect")} />}
        {contentStatus === "loading" && <p className="sidebar-empty">{t("skillsLoading")}</p>}
        {contentStatus === "error" && <p className="sidebar-empty" role="alert">{t("skillsContentFailed")}</p>}
        {contentStatus === "ready" && content && (
          <article className="skills-content">
            <h3>{active?.name}</h3>
            <p className="skills-path">{active?.path}</p>
            {content.truncated && <p className="skills-truncated">{t("skillsTruncated")}</p>}
            <pre>{content.content}</pre>
          </article>
        )}
      </section>
    </>
  );
}
