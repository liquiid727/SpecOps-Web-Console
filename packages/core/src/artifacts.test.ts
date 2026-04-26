import { describe, expect, it } from "vitest";
import {
  buildDeterministicTestPlan,
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
      workflows: ["default-fullstack"],
      ci: { checkCommand: "npx specos check" },
    });

    expect(result.ok).toBe(true);
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
    expect(plan.scenarios.map((scenario) => scenario.branches[0])).toEqual([
      "happy",
      "limit",
      "error",
      "flow",
    ]);
  });

  it("accepts a normalized empty scenario result", () => {
    const result = validateScenarioResult({
      runId: "run-demo",
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      status: "pending",
      releaseDecision: "blocked",
      startedAt: "2026-04-26T00:00:00.000Z",
      endedAt: "2026-04-26T00:00:00.000Z",
      summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 0, totalScenarios: 0 },
      flowResults: [],
      items: [],
    });

    expect(result.ok).toBe(true);
  });
});
