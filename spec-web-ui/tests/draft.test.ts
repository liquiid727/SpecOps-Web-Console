import { describe, expect, it } from "vitest";

import {
  analyzeDraftProgress,
  buildDefaultDraft,
  collectDraftAdvice,
  getDraftSections
} from "@/lib/draft";
import type { CatalogAsset, ProjectManifest } from "@/lib/types";

const project: ProjectManifest = {
  id: "wallet-console",
  name: "Wallet Console",
  projectType: "frontend",
  architecture: "spa",
  stacks: ["react"],
  selectedAssets: [{ assetId: "rule-frontend-react", enabled: true }],
  draftTemplateId: "template-feature-draft",
  draftPath: "spec-web-ui/workspace/projects/wallet-console/draft.md",
  exportTargets: ["rules/", "specs/_template/", "ai/agents/", "agent-teams/", "project-manifest.yaml"]
};

const selectedAssets: CatalogAsset[] = [
  {
    id: "rule-frontend-react",
    type: "rule",
    title: "React Workbench Rules",
    summary: "Frontend delivery conventions for React teams.",
    direction: "frontend",
    stacks: ["react"],
    tags: ["react", "ui", "observability"],
    appliesTo: ["frontend"],
    dependsOn: [],
    conflictsWith: [],
    sourcePath: "rules/frontend/react-workbench-delivery.md",
    files: ["rules/frontend/react-workbench-delivery.md"],
    version: "1.0.0",
    draftHints: [
      "补充前端指标与日志采集方案",
      "说明关键界面的空态、错态和加载态"
    ]
  }
];

describe("buildDefaultDraft", () => {
  it("builds the 15-section studio template", () => {
    const draft = buildDefaultDraft("Wallet Recharge");

    const sections = getDraftSections(draft);

    expect(sections).toEqual([
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
    ]);
  });
});

describe("collectDraftAdvice", () => {
  it("reports missing sections and injects rule-based hints", () => {
    const advice = collectDraftAdvice(
      project,
      selectedAssets,
      "# Wallet Recharge\n\n## 背景\n已有钱包充值能力缺少充值结果通知。\n\n## 目标\n提供站内充值结果通知。\n\n## User Flow\n1. 用户完成充值。\n"
    );

    expect(advice.missingSections).toContain("System Flow");
    expect(advice.missingSections).toContain("指标与日志");
    expect(advice.ruleHints).toContain("补充前端指标与日志采集方案");
  });
});

describe("analyzeDraftProgress", () => {
  it("tracks completed and incomplete sections for the editor sidebar", () => {
    const progress = analyzeDraftProgress(
      "# Wallet Recharge\n\n## 背景\n已有钱包充值能力缺少充值结果通知。\n\n## 目标\n提供站内充值结果通知。\n\n## 非目标\n本次不处理活动营销。\n\n## 用户角色\n- 用户\n\n## User Flow\n1. 用户完成充值。\n\n## System Flow\n\n## API 草案\n- POST /wallet/recharge\n"
    );

    expect(progress.completedSections).toContain("背景");
    expect(progress.completedSections).toContain("API 草案");
    expect(progress.incompleteSections).toContain("System Flow");
    expect(progress.completionPercent).toBe(40);
  });
});
