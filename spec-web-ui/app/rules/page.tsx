import { TemplateLibraryPage } from "@/components/templates/template-library-page";

export default function RulesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return TemplateLibraryPage({
    description: "用于浏览可复用的工程约束、治理规则和交付门禁。",
    emptyText: "没有匹配的 Rule。换一个关键词继续搜索。",
    route: "/rules",
    searchLabel: "搜索 Rule",
    searchParams,
    templateType: "rule",
    title: "Rule 规则"
  });
}
