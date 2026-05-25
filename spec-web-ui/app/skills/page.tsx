import { TemplateLibraryPage } from "@/components/templates/template-library-page";

export default function SkillsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return TemplateLibraryPage({
    description: "用于沉淀可复用 Agent 技能、触发条件、参考资料和运行边界。",
    emptyText: "没有匹配的 Skill。换一个关键词继续搜索。",
    route: "/skills",
    searchLabel: "搜索 Skill",
    searchParams,
    templateType: "skill",
    title: "Skill 仓库"
  });
}
