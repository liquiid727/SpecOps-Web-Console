import type { CatalogAsset, DraftAdvice, ProjectManifest } from "@/lib/types";
import { uniq } from "@/lib/utils";

const defaultSections = [
  "背景",
  "目标",
  "非目标",
  "用户角色",
  "User Flow",
  "System Flow",
  "API 草案",
  "状态机",
  "数据模型",
  "业务规则",
  "异常场景",
  "测试场景",
  "运营/后台配置",
  "指标与日志",
  "待确认问题"
] as const;

export function buildDefaultDraft(featureName = "New Feature") {
  return [
    `# ${featureName}`,
    "",
    ...defaultSections.flatMap((section) => [`## ${section}`, "", ""])
  ].join("\n");
}

export function getDraftSections(markdown: string) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, "").trim());
}

export function collectDraftAdvice(
  _project: ProjectManifest,
  selectedAssets: CatalogAsset[],
  markdown: string
): DraftAdvice {
  const sections = getDraftSections(markdown);
  const missingSections = defaultSections.filter((section) => !sections.includes(section));
  const ruleHints = uniq(selectedAssets.flatMap((asset) => asset.draftHints ?? []));

  return {
    missingSections,
    ruleHints
  };
}

export function getDefaultSections() {
  return [...defaultSections];
}

export function analyzeDraftProgress(markdown: string) {
  const sectionBodies = new Map<string, string>();
  const chunks = markdown.split(/^##\s+/m);

  for (const chunk of chunks.slice(1)) {
    const [headingLine, ...bodyLines] = chunk.split("\n");
    const heading = headingLine.trim();
    const body = bodyLines.join("\n").trim();

    sectionBodies.set(heading, body);
  }

  const completedSections = defaultSections.filter((section) => {
    const body = sectionBodies.get(section);

    return Boolean(body && body.replace(/[-*\d.\s]/g, "").length > 0);
  });
  const incompleteSections = defaultSections.filter((section) => !completedSections.includes(section));
  const completionPercent = Math.round((completedSections.length / defaultSections.length) * 100);

  return {
    totalSections: defaultSections.length,
    completedSections,
    incompleteSections,
    completionPercent
  };
}
