import { TemplateLibraryPage } from "@/components/templates/template-library-page";

export default function AgentTemplatesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return TemplateLibraryPage({
    description: "用于定义 Agent 职责、上下文边界、交付步骤和审查责任。",
    emptyText: "没有匹配的 Agent 模版。换一个关键词继续搜索。",
    route: "/agent-templates",
    searchLabel: "搜索 Agent 模版",
    searchParams,
    templateType: "agent_role",
    title: "Agent 模版"
  });
}
