import { describe, expect, it } from "vitest";
import {
  buildDeterministicTestPlan,
  validateBundle,
  validateManifest,
  validateScenarioResult,
  validateSpec,
  validateTestPlan,
} from "./artifacts";

describe("artifact validation", () => {
  it("accepts a minimal fullstack manifest", () => {
    const result = validateManifest({
      project: { name: "demo", type: "fullstack" },
      stacks: { frontend: "next", backend: "node-api" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "spec",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      rulePacks: ["fullstack-base"],
      agentTemplates: ["spec-editor"],
      workflows: ["default-fullstack"],
      ci: { checkCommand: "npx specos check" },
    });

    expect(result.ok).toBe(true);
  });

  it("accepts a minimal spec-only manifest", () => {
    const result = validateManifest({
      project: { name: "demo", type: "spec-only" },
      stacks: { frontend: "none", backend: "none" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "spec",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      rulePacks: ["spec-driven-delivery"],
      agentTemplates: ["spec-editor"],
      workflows: ["default-spec-only"],
      ci: { checkCommand: "npx specos check" },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a manifest without rule packs and agent templates", () => {
    const result = validateManifest({
      project: { name: "demo", type: "fullstack" },
      stacks: { frontend: "next", backend: "node-api" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "spec",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      workflows: ["default-fullstack"],
      ci: { checkCommand: "npx specos check" },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["rulePacks", "agentTemplates"]),
    );
  });

  it("rejects provider secret fields in manifest", () => {
    const result = validateManifest({
      project: { name: "demo", type: "fullstack" },
      stacks: { frontend: "next", backend: "node-api" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "spec",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      rulePacks: ["fullstack-base"],
      agentTemplates: ["spec-editor"],
      workflows: ["default-fullstack"],
      ci: { checkCommand: "npx specos check" },
      providers: { configPath: ".specos/providers.yaml", apiKey: "secret" },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain("providers.apiKey");
  });

  it("rejects specs without required coverage fields", () => {
    const result = validateSpec({
      id: "reward-order",
      version: "1.0.0",
      title: "Reward Order",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("SPECOS_SPEC_INVALID");
  });

  it("rejects specs missing happy, limit, error, and flow coverage", () => {
    const result = validateSpec({
      id: "reward-order",
      version: "1.0.0",
      title: "Reward Order",
      goals: ["Create reward orders"],
      nonGoals: ["Payment"],
      actors: ["member"],
      userFlows: [{ name: "Claim reward", steps: ["Open page", "Click claim", "View result"] }],
      systemFlows: [{ name: "Create order", steps: ["Validate", "Persist", "Respond"] }],
      rules: [{ id: "reward.order.create", description: "Create one order per claim" }],
      edgeCases: ["stock is zero"],
      observability: ["trace_id"],
      tests: { requiredBranches: ["happy"] },
      traceability: { draft: "spec-draft/reward-order.md" },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain("tests.requiredBranches");
  });

  it("builds deterministic happy, limit, error, and flow scenarios from a spec", () => {
    const spec = {
      id: "reward-order",
      version: "1.0.0",
      title: "Reward Order",
      goals: ["Create reward orders"],
      nonGoals: ["Payment"],
      actors: ["member"],
      userFlows: [{ name: "Claim reward", steps: ["Open page", "Click claim", "View result"] }],
      systemFlows: [{ name: "Create order", steps: ["Validate", "Persist", "Respond"] }],
      rules: [{ id: "reward.order.create", description: "Create one order per claim" }],
      edgeCases: ["stock is zero"],
      api: [{ name: "Create reward order", method: "POST", path: "/api/reward-orders" }],
      ui: [{ name: "Reward page", route: "/rewards" }],
      observability: ["trace_id"],
      tests: { requiredBranches: ["happy", "limit", "error", "flow"] },
      traceability: { draft: "spec-draft/reward-order.md" },
    };

    const plan = buildDeterministicTestPlan(spec);
    const validation = validateTestPlan(plan);

    expect(validation.ok).toBe(true);
    expect(plan.specId).toBe("reward-order");
    expect(plan.featureName).toBe("Reward Order");
    expect(plan.source).toBe("accepted-spec");
    expect(plan.endpoints[0]).toMatchObject({
      name: "Create reward order",
      method: "POST",
      path: "/api/reward-orders",
      branches: ["happy", "limit", "error", "flow"],
      relatedRule: "reward.order.create",
    });
    expect(plan.scenarios.map((scenario) => scenario.branches[0])).toEqual([
      "happy",
      "limit",
      "error",
      "flow",
    ]);
  });

  it("rejects test plans with unknown branch names", () => {
    const result = validateTestPlan({
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec",
      flows: [
        {
          name: "Claim reward",
          stages: [{ name: "Open", scenarioNames: ["Happy"], stepNames: ["Open"] }],
        },
      ],
      endpoints: [
        {
          name: "Create reward order",
          method: "POST",
          path: "/api/reward-orders",
          priority: "P0",
          branches: ["happy", "limit", "error", "flow", "typo"],
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Happy",
          priority: "P0",
          branches: ["happy"],
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          steps: ["Open"],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain("endpoints[0].branches");
  });

  it("accepts a normalized empty scenario result", () => {
    const result = validateScenarioResult({
      runId: "run-demo",
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      status: "warning",
      releaseDecision: "blocked",
      startedAt: "2026-04-26T00:00:00.000Z",
      endedAt: "2026-04-26T00:00:00.000Z",
      blockers: [],
      highRiskScenarios: [],
      coverageGaps: [],
      summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 0, totalScenarios: 0 },
      flowResults: [],
      items: [],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects scenario result arrays that would break the console", () => {
    const result = validateScenarioResult({
      runId: "run-demo",
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      status: "warning",
      releaseDecision: "blocked",
      startedAt: "2026-04-26T00:00:00.000Z",
      endedAt: "2026-04-26T00:00:00.000Z",
      blockers: [],
      highRiskScenarios: [],
      coverageGaps: [],
      summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 0, totalScenarios: 0 },
      flowResults: [{}],
      items: [{}],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["flowResults[0].name", "flowResults[0].stages", "items[0].testType"]),
    );
  });

  it("accepts a valid installable bundle manifest", () => {
    const result = validateBundle({
      id: "reward-center-bundle",
      name: "Reward Center Bundle",
      version: "0.1.0",
      specosVersion: ">=0.1.0",
      projectTypes: ["backend", "frontend", "mixed"],
      installs: [
        { target: "rules/", from: "files/rules/" },
        { target: "ai/agents/", from: "files/ai/agents/" },
        { target: ".specos/workflows/", from: "files/.specos/workflows/" },
      ],
      workflow: {
        default: "spec-driven-default",
        available: ["spec-driven-default"],
      },
      entrypoints: {
        draftTemplate: "template-feature-draft",
        specTemplate: "feature-spec-v1",
        workflowId: "spec-driven-default",
      },
      capabilities: {
        refineSpec: true,
        generateTestPlan: true,
        runApiTests: false,
        runUiTests: false,
        normalizeResults: true,
      },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects bundles whose default workflow is not installable", () => {
    const result = validateBundle({
      id: "reward-center-bundle",
      name: "Reward Center Bundle",
      version: "0.1.0",
      specosVersion: ">=0.1.0",
      projectTypes: ["mixed"],
      installs: [{ target: "rules/", from: "files/rules/" }],
      workflow: {
        default: "missing-workflow",
        available: ["spec-driven-default"],
      },
      entrypoints: {
        draftTemplate: "template-feature-draft",
        specTemplate: "feature-spec-v1",
        workflowId: "missing-workflow",
      },
      capabilities: {
        refineSpec: true,
        generateTestPlan: true,
        runApiTests: false,
        runUiTests: false,
        normalizeResults: true,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["workflow.default", "entrypoints.workflowId"]),
    );
  });

  it("rejects bundles that escape the files payload root", () => {
    const result = validateBundle({
      id: "reward-center-bundle",
      name: "Reward Center Bundle",
      version: "0.1.0",
      specosVersion: ">=0.1.0",
      projectTypes: ["mixed"],
      installs: [{ target: "../outside", from: "files/../../outside" }],
      workflow: {
        default: "spec-driven-default",
        available: ["spec-driven-default"],
      },
      entrypoints: {
        draftTemplate: "template-feature-draft",
        specTemplate: "feature-spec-v1",
        workflowId: "spec-driven-default",
      },
      capabilities: {
        refineSpec: true,
        generateTestPlan: true,
        runApiTests: false,
        runUiTests: false,
        normalizeResults: true,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["installs[0].target", "installs[0].from"]),
    );
  });
});
