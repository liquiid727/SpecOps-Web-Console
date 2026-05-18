import { describe, expect, it } from "vitest";
import {
  buildBlockedApiScenarioResult,
  buildBrunoCollectionAssets,
  buildDeterministicTestPlan,
  buildExecutedApiScenarioResult,
  buildSpecChangeTestSchedule,
  validateBundle,
  validateManifest,
  validateScenarioResult,
  validateSpec,
  validateTestSchedule,
  validateTestPlan,
} from "./artifacts";

describe("artifact validation", () => {
  it("accepts a minimal fullstack manifest", () => {
    const result = validateManifest({
      project: { name: "demo", type: "fullstack" },
      stacks: { frontend: "next", backend: "node-api" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "specs/current",
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
        specsDir: "specs/current",
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
        specsDir: "specs/current",
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
        specsDir: "specs/current",
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

  it("builds an isolated execution and test schedule from a test plan", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
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
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Happy",
          priority: "P0" as const,
          branches: ["happy"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          steps: ["Open"],
        },
      ],
    };

    const schedule = buildSpecChangeTestSchedule(plan, {
      changeId: "reward-order-create",
      executionMode: "parallel",
    });
    const validation = validateTestSchedule(schedule);

    expect(validation.ok).toBe(true);
    expect(schedule.changeId).toBe("reward-order-create");
    expect(schedule.executionMode).toBe("parallel");
    expect(schedule.tracks.map((track) => track.id)).toEqual(["execution", "testing"]);
    expect(schedule.tracks[0]).toMatchObject({
      id: "execution",
      agentRole: "execution-editor",
      isolation: "implementation-only",
    });
    expect(schedule.tracks[1]).toMatchObject({
      id: "testing",
      agentRole: "test-editor",
      isolation: "spec-and-contract-only",
    });
    expect(schedule.tasks.map((task) => task.agentRole)).toEqual([
      "execution-editor",
      "bruno-test-agent",
      "playwright-test-agent",
    ]);
    expect(schedule.tasks.find((task) => task.id === "implement-reward-order")?.outputs).toEqual([
      "specs/changes/reward-order-create/implementation-report.md",
      "tests/unit/reward-order/",
    ]);
    expect(schedule.tasks.find((task) => task.id === "ui-gap-Happy")).toMatchObject({
      status: "blocked",
      reason: "UI execution is scheduled as a gap until Playwright assets and selectors are available.",
    });
  });

  it("allows execution schedules to own implementation-coupled unit tests", () => {
    const result = validateTestSchedule({
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      changeId: "reward-order-create",
      executionMode: "parallel",
      tracks: [
        {
          id: "execution",
          agentRole: "execution-editor",
          isolation: "implementation-only",
          allowedInputs: ["specs/changes/reward-order-create/spec.md"],
          forbiddenInputs: ["tests/results/", "tests/bruno/", "tests/scenarios/"],
        },
        {
          id: "testing",
          agentRole: "test-editor",
          isolation: "spec-and-contract-only",
          allowedInputs: ["tests/plans/reward-order.test-plan.json"],
          forbiddenInputs: ["implementation report"],
        },
      ],
      tasks: [
        {
          id: "implementation-with-unit-tests",
          trackId: "execution",
          agentRole: "execution-editor",
          type: "implementation",
          status: "ready",
          inputs: ["specs/changes/reward-order-create/spec.md"],
          outputs: ["src/reward.ts", "tests/unit/reward-order/"],
          dependsOn: [],
          traceability: { scenarios: ["Happy"], endpoints: ["POST /api/reward-orders"] },
        },
        {
          id: "api-tests",
          trackId: "testing",
          agentRole: "bruno-test-agent",
          type: "api-test",
          status: "ready",
          inputs: ["tests/plans/reward-order.test-plan.json"],
          outputs: ["tests/bruno/reward-order/", "tests/results/reward-order.run.json"],
          dependsOn: [],
          traceability: { scenarios: ["Happy"], endpoints: ["POST /api/reward-orders"] },
        },
      ],
      gates: ["implementation_done", "tests_passed"],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects test schedules that merge execution and testing responsibilities", () => {
    const result = validateTestSchedule({
      specId: "reward-order",
      specVersion: "1.0.0",
      changeId: "reward-order-create",
      executionMode: "parallel",
      tracks: [
        {
          id: "execution",
          agentRole: "execution-editor",
          isolation: "implementation-only",
          allowedInputs: ["specs/changes/reward-order-create/spec.md"],
          forbiddenInputs: ["tests/results/"],
        },
      ],
      tasks: [
        {
          id: "mixed-task",
          trackId: "execution",
          agentRole: "execution-editor",
          type: "implementation",
          status: "ready",
          inputs: ["specs/changes/reward-order-create/spec.md"],
          outputs: ["src/reward.ts", "tests/bruno/reward-order/"],
          dependsOn: [],
          traceability: { scenarios: ["Happy"], endpoints: ["POST /api/reward-orders"] },
        },
      ],
      gates: ["implementation_done", "tests_passed"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["tracks", "tasks[0].outputs"]),
    );
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

  it("builds a blocked API scenario result when API execution assets are missing", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
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
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Happy",
          priority: "P0" as const,
          branches: ["happy"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          steps: ["Open"],
        },
      ],
    };
    const schedule = buildSpecChangeTestSchedule(plan, {
      changeId: "reward-order-create",
      executionMode: "parallel",
    });

    const result = buildBlockedApiScenarioResult(plan, schedule, {
      reason: "Bruno collection not found at tests/bruno/reward-order",
      runId: "run-api-blocked",
      timestamp: "2026-05-15T00:00:00.000Z",
    });
    const validation = validateScenarioResult(result);

    expect(validation.ok).toBe(true);
    expect(result.releaseDecision).toBe("blocked");
    expect(result.status).toBe("warning");
    expect(result.summary.apiPassRate).toBe(0);
    expect(result.summary.totalEndpoints).toBe(1);
    expect(result.blockers).toEqual(["Bruno collection not found at tests/bruno/reward-order"]);
    expect(result.items[0]).toMatchObject({
      testType: "api",
      target: "POST /api/reward-orders",
      status: "warning",
      summary: "Bruno collection not found at tests/bruno/reward-order",
    });
    expect(result.flowResults[0].stages[0].endpoints[0]).toMatchObject({
      target: "POST /api/reward-orders",
      status: "warning",
    });
  });

  it("builds deterministic Bruno API assets from a test plan", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
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
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
        {
          name: "Read reward order",
          method: "GET",
          path: "/api/reward-orders/:id",
          priority: "P1" as const,
          branches: ["happy", "error", "edge"] as const,
          preconditions: ["order exists"],
          expectedResults: ["order returned"],
          relatedRule: "reward.order.read",
        },
      ],
      scenarios: [
        {
          name: "Happy",
          priority: "P0" as const,
          branches: ["happy"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          steps: ["Open"],
        },
      ],
    };

    const assets = buildBrunoCollectionAssets(plan);

    expect(assets.map((asset) => asset.path)).toEqual([
      "bruno.json",
      "README.md",
      "create-reward-order.bru",
      "read-reward-order.bru",
    ]);
    expect(assets.find((asset) => asset.path === "bruno.json")?.content).toContain('"name": "reward-order"');
    expect(assets.find((asset) => asset.path === "create-reward-order.bru")?.content).toContain("post {");
    expect(assets.find((asset) => asset.path === "create-reward-order.bru")?.content).toContain("url: {{baseUrl}}/api/reward-orders");
    expect(assets.find((asset) => asset.path === "read-reward-order.bru")?.content).toContain("get {");
    expect(assets.find((asset) => asset.path === "README.md")?.content).toContain("Spec version: `1.0.0`");
  });

  it("builds a normalized passing API result from a command execution", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
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
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Happy",
          priority: "P0" as const,
          branches: ["happy"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          steps: ["Open"],
        },
      ],
    };
    const schedule = buildSpecChangeTestSchedule(plan, {
      changeId: "reward-order-create",
      executionMode: "parallel",
    });

    const result = buildExecutedApiScenarioResult(plan, schedule, {
      exitCode: 0,
      stdout: "bruno passed",
      stderr: "",
      command: "bru run tests/bruno/reward-order",
      runId: "run-api-pass",
      timestamp: "2026-05-15T00:00:00.000Z",
    });
    const validation = validateScenarioResult(result);

    expect(validation.ok).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.releaseDecision).toBe("ready");
    expect(result.summary.apiPassRate).toBe(1);
    expect(result.items[0]).toMatchObject({
      status: "pass",
      summary: "API command completed successfully",
    });
    expect(result.items[0].evidence.command).toBe("bru run tests/bruno/reward-order");
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
