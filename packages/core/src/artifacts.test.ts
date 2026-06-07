import { describe, expect, it } from "vitest";
import {
  buildBlockedApiScenarioResult,
  buildBrunoCollectionAssets,
  buildDeterministicTestPlan,
  buildExecutedApiScenarioResult,
  buildRequestRoute,
  buildTestGateReport,
  buildSpecChangeTestSchedule,
  validateBundle,
  validateManifest,
  validateScenarioResult,
  validateSpec,
  validateTestSchedule,
  validateTestPlan,
} from "./artifacts";

describe("artifact validation", () => {
  it("routes UI test console requests to frontend, tests, and gate agents", () => {
    const route = buildRequestRoute(
      "强化测试 UI 首页，支持 API、E2E、性能、并发测试，并接入 CI gate",
    );

    expect(route).toMatchObject({
      requestKind: "test",
      primaryAgent: "test-editor",
      needsChangePackage: true,
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["frontend", "tests", "ci"]));
    expect(route.supportingAgents).toEqual(
      expect.arrayContaining([
        "ui-design-agent",
        "bruno-test-agent",
        "playwright-test-agent",
        "performance-test-agent",
        "concurrency-test-agent",
        "ci-editor",
        "qa-agent",
      ]),
    );
    expect(route.rules).toEqual(
      expect.arrayContaining(["rules/testing/production-test-standards.md", "rules/ci/spec-release-gates.md"]),
    );
    expect(route.skills).toContain(".codex/skills/specos-ui-design/SKILL.md");
  });

  it("routes QA acceptance requests to the QA agent", () => {
    const route = buildRequestRoute("请 QA agent 做最终质量验收，汇总 gate report 和 review findings");

    expect(route).toMatchObject({
      requestKind: "acceptance",
      primaryAgent: "qa-agent",
      needsChangePackage: true,
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["tests", "ci", "orchestration"]));
    expect(route.supportingAgents).toEqual(expect.arrayContaining(["test-editor", "ci-editor", "reviewer"]));
  });

  it("routes architecture orchestration requests to the DDD domain agent with bounded supporting agents", () => {
    const route = buildRequestRoute(
      "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
    );

    expect(route).toMatchObject({
      requestKind: "test",
      primaryAgent: "ddd-domain-agent",
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["architecture", "backend", "tests", "orchestration"]));
    expect(route.supportingAgents).toEqual(
      expect.arrayContaining([
        "openapi-agent",
        "db-migration-agent",
        "performance-test-agent",
        "concurrency-test-agent",
        "test-editor",
        "reviewer",
      ]),
    );
    expect(route.rules).toEqual(expect.arrayContaining(["ai/workflows/nested-agent-orchestration.md"]));
  });

  it("routes pure architecture reviews to the DDD domain agent before spec intake", () => {
    const route = buildRequestRoute("请评估这个领域边界和跨服务架构风险");

    expect(route).toMatchObject({
      requestKind: "review",
      primaryAgent: "ddd-domain-agent",
      needsDraft: false,
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["architecture"]));
    expect(route.supportingAgents).toEqual(expect.arrayContaining(["reviewer", "test-editor"]));
  });

  it("routes raw requirements to spec intake before implementation", () => {
    const route = buildRequestRoute("我有一个新的支付路由需求，还没有 spec，先帮我整理一下");

    expect(route).toMatchObject({
      requestKind: "raw-requirement",
      primaryAgent: "spec-editor",
      needsDraft: true,
      needsChangePackage: true,
    });
    expect(route.workTypes).toContain("spec");
    expect(route.nextStep).toContain("spec-draft");
  });

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

  it("adds production testing standard metadata to generated test plans", () => {
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

    expect(validateTestPlan(plan).ok).toBe(true);
    expect(plan).toMatchObject({
      standardVersion: "specos-test-standard/v1",
      qualityProfile: "fullstack-flow",
      riskTier: "P0",
      flakePolicy: {
        allowedRetries: 1,
        quarantineAllowed: false,
        classificationRequired: true,
      },
    });
    expect(plan.standardRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "std.p0.api.contract",
          layer: "api",
          ownerAgent: "bruno-test-agent",
          requiredFor: ["P0", "P1"],
          requiredEvidence: ["trace"],
          gateImpact: "blocking",
        }),
      ]),
    );
  });

  it("rejects production test plans without standard owner and flake policy", () => {
    const result = validateTestPlan({
      standardVersion: "specos-test-standard/v1",
      qualityProfile: "backend-api",
      riskTier: "P0",
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec",
      flows: [{ name: "Claim reward", stages: [{ name: "Open", scenarioNames: ["Happy"], stepNames: ["Open"] }] }],
      endpoints: [
        {
          name: "Create reward order",
          method: "POST",
          path: "/api/reward-orders",
          priority: "P0",
          branches: ["happy", "limit", "error", "flow"],
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
      standardRequirements: [
        {
          id: "std.p0.api.contract",
          layer: "api",
          appliesTo: ["POST /api/reward-orders"],
          requiredFor: ["P0"],
          requiredEvidence: ["trace"],
          gateImpact: "blocking",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["standardRequirements[0].ownerAgent", "flakePolicy"]),
    );
  });

  it("rejects blocking production result items without requirement and artifact evidence", () => {
    const result = validateScenarioResult({
      runId: "run-demo",
      specId: "reward-order",
      specVersion: "1.0.0",
      standardVersion: "specos-test-standard/v1",
      qualityProfile: "backend-api",
      featureName: "Reward Order",
      status: "fail",
      releaseDecision: "blocked",
      startedAt: "2026-05-28T00:00:00.000Z",
      endedAt: "2026-05-28T00:01:00.000Z",
      blockers: ["api failed"],
      highRiskScenarios: [],
      coverageGaps: [],
      summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 1, totalScenarios: 0 },
      flowResults: [],
      items: [
        {
          runId: "run-demo",
          specId: "reward-order",
          specVersion: "1.0.0",
          testType: "api",
          target: "POST /api/reward-orders",
          status: "fail",
          durationMs: 120,
          summary: "api failed",
          gateImpact: "blocking",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["items[0].requirementId", "items[0].ownerAgent", "items[0].artifactRefs"]),
    );
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

  it("validates production test-plan metadata for performance, concurrency, and release gates", () => {
    const valid = validateTestPlan({
      specId: "reward-order",
      specVersion: "1.2.0",
      changeId: "reward-order-last-inventory",
      featureName: "Reward Order",
      source: "accepted-spec",
      flows: [
        {
          name: "Claim reward",
          stages: [{ name: "Submit", scenarioNames: ["Concurrent claim"], stepNames: ["Submit order"] }],
        },
      ],
      endpoints: [
        {
          name: "Create reward order",
          method: "POST",
          path: "/api/reward-orders",
          priority: "P0",
          branches: ["happy", "limit", "error", "flow"],
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Concurrent claim",
          priority: "P0",
          branches: ["happy", "limit", "error", "flow"],
          preconditions: ["one inventory item remains"],
          expectedResults: ["only one successful order"],
          steps: ["Submit order"],
        },
      ],
      performanceTargets: [
        {
          endpoint: "POST /api/reward-orders",
          priority: "P0",
          slo: { p95Ms: 300, p99Ms: 800, errorRate: 0.001 },
          gateImpact: "blocking",
        },
      ],
      concurrencyInvariants: [
        {
          scenario: "Concurrent claim",
          invariant: "Only one order may be created for one remaining inventory item",
          actorProfile: "50 users submit at the same time",
          expectedFinalState: "one successful order and zero remaining inventory",
          gateImpact: "blocking",
        },
      ],
      releaseGates: [
        {
          id: "p0-api-and-concurrency",
          type: "change-verification",
          requiredTestTypes: ["api", "scenario", "performance", "concurrency"],
          blocking: true,
          evidenceRequired: ["trace", "raw-report", "gate-report"],
        },
      ],
    });

    expect(valid.ok).toBe(true);

    const invalid = validateTestPlan({
      specId: "reward-order",
      specVersion: "1.2.0",
      featureName: "Reward Order",
      source: "accepted-spec",
      flows: [
        {
          name: "Claim reward",
          stages: [{ name: "Submit", scenarioNames: ["Concurrent claim"], stepNames: ["Submit order"] }],
        },
      ],
      endpoints: [
        {
          name: "Create reward order",
          method: "POST",
          path: "/api/reward-orders",
          priority: "P0",
          branches: ["happy", "limit", "error", "flow"],
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Concurrent claim",
          priority: "P0",
          branches: ["happy", "limit", "error", "flow"],
          preconditions: ["one inventory item remains"],
          expectedResults: ["only one successful order"],
          steps: ["Submit order"],
        },
      ],
      performanceTargets: [
        {
          endpoint: "POST /api/reward-orders",
          priority: "P0",
          slo: { p95Ms: "fast" },
          gateImpact: "blocking",
        },
      ],
      concurrencyInvariants: [
        {
          scenario: "Concurrent claim",
          invariant: "",
          actorProfile: "50 users submit at the same time",
          expectedFinalState: "one successful order",
          gateImpact: "blocking",
        },
      ],
      releaseGates: [
        {
          id: "broken",
          type: "unknown",
          requiredTestTypes: ["api", "bad-type"],
          blocking: true,
          evidenceRequired: ["trace"],
        },
      ],
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining([
        "performanceTargets[0].slo.p95Ms",
        "concurrencyInvariants[0].invariant",
        "releaseGates[0].type",
        "releaseGates[0].requiredTestTypes",
      ]),
    );
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

  it("accepts production test result metadata for performance, latency, concurrency, and gate evidence", () => {
    const result = validateScenarioResult({
      runId: "run-production",
      specId: "reward-order",
      specVersion: "1.2.0",
      changeId: "reward-order-last-inventory",
      featureName: "Reward Order",
      runner: {
        name: "k6",
        command: "k6 run tests/performance/reward-order/load.js",
        exitCode: 0,
      },
      environment: {
        id: "staging-cn",
        fixtureVersion: "reward-fixture-v3",
        seedCommand: "node scripts/seed-reward.js",
        cleanupCommand: "node scripts/cleanup-reward.js",
        externalDependencyMode: "stubbed",
      },
      commitSha: "abc1234",
      baselineRunId: "run-baseline",
      status: "warning",
      releaseDecision: "blocked",
      startedAt: "2026-05-28T00:00:00.000Z",
      endedAt: "2026-05-28T00:01:00.000Z",
      blockers: ["P0 concurrency invariant failed"],
      highRiskScenarios: ["多人同时领取最后一份库存"],
      coverageGaps: [],
      summary: { apiPassRate: 1, scenarioPassRate: 1, totalEndpoints: 1, totalScenarios: 1 },
      flowResults: [],
      items: [
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "performance",
          target: "POST /api/reward-orders",
          status: "pass",
          durationMs: 60000,
          summary: "p95 stayed within the blocking SLO",
          gateImpact: "blocking",
          slo: {
            p95Ms: 300,
            p99Ms: 800,
            errorRate: 0.001,
          },
          metrics: {
            p50Ms: 120,
            p95Ms: 240,
            p99Ms: 620,
            requestRate: 80,
            errorRate: 0,
          },
          artifactRefs: [
            {
              type: "raw-report",
              path: "tests/results/reward-order.k6.json",
            },
          ],
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "latency",
          target: "GET /api/reward-orders/:id",
          status: "pass",
          durationMs: 30000,
          summary: "read latency stayed under warning threshold",
          gateImpact: "warning",
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "concurrency",
          target: "reward.order.inventory",
          status: "fail",
          durationMs: 1800,
          summary: "50 concurrent claims created 2 successful orders for one remaining item",
          gateImpact: "blocking",
          concurrencyProfile: {
            actors: 50,
            requests: 50,
            invariant: "Only one order may be created for one remaining inventory item",
            expectedFinalState: "one successful order and zero remaining inventory",
            observedFinalState: "two successful orders and negative inventory",
          },
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "security",
          target: "POST /api/reward-orders",
          status: "pass",
          durationMs: 100,
          summary: "unauthenticated request rejected",
          gateImpact: "blocking",
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "migration",
          target: "reward_orders schema",
          status: "pass",
          durationMs: 500,
          summary: "migration dry-run completed",
          gateImpact: "blocking",
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "compatibility",
          target: "reward-order result schema",
          status: "pass",
          durationMs: 120,
          summary: "previous client response fields remain compatible",
          gateImpact: "warning",
        },
      ],
    });

    expect(result.ok).toBe(true);
  });

  it("builds a blocking gate report when required test evidence is missing or failed", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.2.0",
      changeId: "reward-order-last-inventory",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
      flows: [
        {
          name: "Claim reward",
          stages: [{ name: "Submit", scenarioNames: ["Concurrent claim"], stepNames: ["Submit order"] }],
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
          name: "Concurrent claim",
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["one inventory item remains"],
          expectedResults: ["only one successful order"],
          steps: ["Submit order"],
        },
      ],
      releaseGates: [
        {
          id: "p0-release",
          type: "release" as const,
          requiredTestTypes: ["api", "scenario", "performance", "concurrency"] as const,
          blocking: true,
          evidenceRequired: ["trace", "raw-report"] as const,
        },
      ],
    };
    const report = buildTestGateReport(
      plan,
      [
        {
          runId: "run-api",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          featureName: "Reward Order",
          status: "pass",
          releaseDecision: "ready",
          startedAt: "2026-05-28T00:00:00.000Z",
          endedAt: "2026-05-28T00:01:00.000Z",
          blockers: [],
          highRiskScenarios: [],
          coverageGaps: [],
          summary: { apiPassRate: 1, scenarioPassRate: 0, totalEndpoints: 1, totalScenarios: 1 },
          flowResults: [],
          items: [
            {
              runId: "run-api",
              specId: "reward-order",
              specVersion: "1.2.0",
              changeId: "reward-order-last-inventory",
              testType: "api",
              target: "POST /api/reward-orders",
              status: "pass",
              durationMs: 100,
              summary: "api passed",
              gateImpact: "blocking",
              artifactRefs: [{ type: "trace", path: "trace-api" }],
            },
            {
              runId: "run-concurrency",
              specId: "reward-order",
              specVersion: "1.2.0",
              changeId: "reward-order-last-inventory",
              testType: "concurrency",
              target: "reward.order.inventory",
              status: "fail",
              durationMs: 1800,
              summary: "invariant failed",
              gateImpact: "blocking",
              artifactRefs: [{ type: "trace", path: "trace-concurrency" }],
            },
          ],
        },
      ],
      { changeId: "reward-order-last-inventory" },
    );

    expect(report.decision).toBe("blocked");
    expect(report.failedGates).toContain("p0-release");
    expect(report.missingEvidence).toEqual(
      expect.arrayContaining(["p0-release missing scenario result", "p0-release missing performance result"]),
    );
    expect(report.blockers).toContain("p0-release concurrency failed: invariant failed");
    expect(report.requiredGates[0]).toMatchObject({
      id: "p0-release",
      requiredTestTypes: ["api", "scenario", "performance", "concurrency"],
      blocking: true,
    });
    expect(report.standardCompliance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: "gate.p0-release.scenario",
          status: "missing",
          gateImpact: "blocking",
        }),
        expect.objectContaining({
          requirementId: "gate.p0-release.concurrency",
          status: "failed",
          ownerAgent: "concurrency-test-agent",
        }),
      ]),
    );
    expect(report.riskSummary.P0.blocked).toBeGreaterThan(0);
    expect(report.agentEvidenceSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ownerAgent: "bruno-test-agent", passed: 1 }),
        expect.objectContaining({ ownerAgent: "concurrency-test-agent", failed: 1 }),
      ]),
    );
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

  it("accepts the reusable SpecOS agent team kit bundle manifest", () => {
    const result = validateBundle({
      id: "specos-agent-team-kit",
      name: "SpecOS Agent Team Kit",
      version: "0.1.0",
      specosVersion: ">=0.1.0",
      projectTypes: ["backend", "frontend", "mixed", "fullstack", "spec-only"],
      installs: [
        { target: "AGENTS.md", from: "files/AGENTS.md" },
        { target: ".agents/", from: "files/.agents/" },
        { target: "ai/agents/", from: "files/ai/agents/" },
        { target: "ai/workflows/", from: "files/ai/workflows/" },
        { target: ".rules/", from: "files/.rules/" },
        { target: "rules/", from: "files/rules/" },
        { target: ".codex/instructions.md", from: "files/.codex/instructions.md" },
        { target: ".codex/skills/", from: "files/.codex/skills/" },
        { target: ".skills/", from: "files/.skills/" },
        { target: "spec-draft/", from: "files/spec-draft/" },
        { target: "specs/", from: "files/specs/" },
        { target: "tests/", from: "files/tests/" },
        { target: "scripts/README.md", from: "files/scripts/README.md" },
        { target: "scripts/orchestration/README.md", from: "files/scripts/orchestration/README.md" },
        { target: "scripts/checks/README.md", from: "files/scripts/checks/README.md" },
        { target: ".specos/manifest.yaml", from: "files/.specos/manifest.yaml" },
        { target: ".specos/workflows/", from: "files/.specos/workflows/" },
      ],
      workflow: {
        default: "spec-driven-default",
        available: ["spec-driven-default"],
      },
      entrypoints: {
        draftTemplate: "spec-draft/_template/feature/product-ui.template.md",
        specTemplate: "specs/_template/feature/spec.example.md",
        workflowId: "spec-driven-default",
      },
      capabilities: {
        refineSpec: true,
        generateTestPlan: true,
        runApiTests: true,
        runUiTests: true,
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
