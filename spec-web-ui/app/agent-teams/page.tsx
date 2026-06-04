import { TemplateLibraryPage } from "@/components/templates/template-library-page";

export default function AgentTeamsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return TemplateLibraryPage({
    description: "用于定义可复用的 agent team 路由、治理说明和团队级配置包。",
    emptyText: "没有匹配的 Agent Team。换一个关键词继续搜索。",
    route: "/agent-teams",
    searchLabel: "搜索 Agent Team",
    searchParams,
    templateType: "agent_team",
    title: "Agent Team"
  });
}
