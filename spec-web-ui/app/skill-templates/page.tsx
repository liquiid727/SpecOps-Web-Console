import { TemplateLibraryPage } from "@/components/templates/template-library-page";

export default function SkillTemplatesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return TemplateLibraryPage({
    description: "用于定义技能边界、输入输出、参考资料和安全操作方式的可复用技能包。",
    emptyText: "没有匹配的 Skill 技能。换一个关键词继续搜索。",
    route: "/skill-templates",
    searchLabel: "搜索 Skill 技能",
    searchParams,
    templateType: "skill",
    title: "Skill 技能"
  });
}
