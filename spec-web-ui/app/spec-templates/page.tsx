import { TemplateLibraryPage } from "@/components/templates/template-library-page";

export default function SpecTemplatesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return TemplateLibraryPage({
    description: "用于生成项目需求、UI handoff、后端领域、测试计划等结构化 Spec 草稿。",
    emptyText: "没有匹配的 Spec 模版。换一个关键词继续搜索。",
    route: "/spec-templates",
    searchLabel: "搜索 Spec 模版",
    searchParams,
    templateType: "spec_template",
    title: "Spec 模版"
  });
}
