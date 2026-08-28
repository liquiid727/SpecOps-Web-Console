import { describe, expect, it } from "vitest";
import {
  buildAgentExecutionPlan,
  buildRequestRoute,
  buildSpecChangeTestSchedule,
  buildDeterministicTestPlan,
  validateManifest,
  validateRouteRequestOutput,
  formatRouteRequestOutput,
} from "./artifacts";

const manifest = {
  schemaVersion: "specos/goalspec",
  project: { name: "demo", type: "spec-only" },
  stacks: {},
  artifacts: { requirementsDir: ".requirements/requirements", templatesDir: ".requirements/templates" },
  rulePacks: ["spec-driven-delivery"],
  agentTemplates: ["spec-editor"],
  workflows: ["default"],
  ci: { checkCommand: "npm test" },
};

describe("GoalSpec artifact contract", () => {
  it("accepts the manifest and rejects unknown fields", () => {
    expect(validateManifest(manifest).ok).toBe(true);
    const malformed = { ...manifest, unsupportedField: true };
    expect(validateManifest(malformed).ok).toBe(false);
    expect(validateManifest(malformed).errors?.some((error) => error.path === "manifest.unsupportedField")).toBe(true);
  });

  it("routes and serializes without a project mode or overlay", () => {
    const route = buildRequestRoute("实现一个 API，并补齐测试和 release gate");
    expect(route.requiredContext).toContain("docs/spec-modes/GoalSpec/README.md");
    const plan = buildAgentExecutionPlan("实现一个 API，并补齐测试和 release gate");
    expect(validateRouteRequestOutput(formatRouteRequestOutput(plan), "full").ok).toBe(true);
  });

  it("writes schedule paths inside the selected child spec evidence", () => {
    const plan = buildDeterministicTestPlan({
      specId: "SPEC-R002-S01",
      specVersion: "1.0.0",
      featureName: "Artifact Contract",
      title: "Artifact Contract",
      goals: [], nonGoals: [], actors: [], userFlows: [], systemFlows: [], rules: [], edgeCases: [],
      observability: [], tests: { requiredBranches: ["happy"] }, traceability: { prd: "../../prd.md" },
      userFlows: [{ name: "checkout", steps: ["submit"] }],
    });
    const schedule = buildSpecChangeTestSchedule(plan, {
      changeId: "R002",
      specPath: ".requirements/requirements/R002-goalspec-consolidation/specs/S01-artifact-contract/spec.md",
      manifest,
    });
    const serialized = JSON.stringify(schedule);
    expect(serialized).toContain(".requirements/requirements/R002-goalspec-consolidation/specs/S01-artifact-contract/evidence/");
    expect(serialized).not.toContain(".requirements/requirements/evidence/");
    expect(serialized).not.toContain("tests/results");
  });
});
