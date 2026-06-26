import {
  buildReadinessSummary,
  getAllRunSessions,
  getAllTestPlans,
  getAllTestRuns,
  getLatestRunsBySpec,
  getSpecBundle,
} from "@/lib/data";

describe("file-backed data layer", () => {
  it("loads plans and runs from repository test artifacts", async () => {
    const [plans, runs] = await Promise.all([getAllTestPlans(), getAllTestRuns()]);

    expect(plans.length).toBeGreaterThan(0);
    expect(runs.length).toBeGreaterThan(0);
    expect(plans[0]).toHaveProperty("specId");
    expect(runs[0]).toHaveProperty("runId");
  });

  it("returns latest runs grouped by spec", async () => {
    const latestRuns = await getLatestRunsBySpec();
    const specIds = latestRuns.map((item) => item.specId);
    expect(new Set(specIds).size).toBe(specIds.length);
  });

  it("hydrates SpecOS Contract with plan and latest run", async () => {
    const bundle = await getSpecBundle("reward-order");
    expect(bundle.plan?.featureName).toBe("奖励订单发放");
    expect(bundle.latestRun?.specId).toBe("reward-order");
    expect(bundle.latestRun?.flowResults?.length).toBeGreaterThan(0);
  });

  it("ignores gate report json artifacts when loading test runs", async () => {
    const runs = await getAllTestRuns();
    expect(runs.every((run) => Array.isArray(run.items))).toBe(true);
    expect(runs.every((run) => run.runId)).toBe(true);
  });

  it("loads run session artifacts separately from normalized test runs", async () => {
    const [runs, sessions] = await Promise.all([getAllTestRuns(), getAllRunSessions()]);

    expect(runs.every((run) => !run.runId.includes("session"))).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0]).toMatchObject({
      specId: "reward-order",
      scope: expect.any(String),
      commands: expect.any(Array),
    });
  });

  it("derives performance, concurrency, gate, and evidence readiness from plan and run", () => {
    const summary = buildReadinessSummary(
      {
        specId: "reward-order",
        specVersion: "1.0.0",
        changeId: "reward-order-create",
        featureName: "Reward Order",
        source: "accepted-spec",
        flows: [],
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
            branches: ["happy"],
            preconditions: ["one inventory item remains"],
            expectedResults: ["only one successful order"],
            steps: ["Submit order"],
          },
        ],
        performanceTargets: [
          {
            endpoint: "POST /api/reward-orders",
            priority: "P0",
            slo: { p95Ms: 300 },
            gateImpact: "blocking",
          },
        ],
        concurrencyInvariants: [
          {
            scenario: "Concurrent claim",
            invariant: "Only one order may be created",
            actorProfile: "50 users",
            expectedFinalState: "one successful order",
            gateImpact: "blocking",
          },
        ],
        releaseGates: [
          {
            id: "release-p0",
            type: "release",
            requiredTestTypes: ["api", "performance", "concurrency"],
            blocking: true,
            evidenceRequired: ["trace", "raw-report"],
          },
        ],
      },
      {
        runId: "run-demo",
        specId: "reward-order",
        specVersion: "1.0.0",
        changeId: "reward-order-create",
        featureName: "Reward Order",
        status: "warning",
        releaseDecision: "blocked",
        startedAt: "2026-05-28T00:00:00.000Z",
        endedAt: "2026-05-28T00:01:00.000Z",
        blockers: [],
        highRiskScenarios: [],
        coverageGaps: [],
        summary: { apiPassRate: 1, scenarioPassRate: 0, totalEndpoints: 1, totalScenarios: 1 },
        flowResults: [],
        items: [
          {
            runId: "run-demo",
            specId: "reward-order",
            specVersion: "1.0.0",
            changeId: "reward-order-create",
            testType: "api",
            target: "POST /api/reward-orders",
            status: "pass",
            durationMs: 120,
            summary: "api passed",
            gateImpact: "blocking",
            artifactRefs: [{ type: "trace", path: "trace-api" }],
          },
          {
            runId: "run-demo",
            specId: "reward-order",
            specVersion: "1.0.0",
            changeId: "reward-order-create",
            testType: "performance",
            target: "POST /api/reward-orders",
            status: "pass",
            durationMs: 60000,
            summary: "p95 ok",
            gateImpact: "blocking",
            slo: { p95Ms: 300 },
            metrics: { p95Ms: 240, errorRate: 0 },
            artifactRefs: [{ type: "raw-report", path: "k6.json" }],
          },
        ],
      },
    );

    expect(summary.performanceStatus).toBe("pass");
    expect(summary.concurrencyStatus).toBe("pending");
    expect(summary.decision).toBe("blocked");
    expect(summary.missingEvidence).toContain("release-p0 missing concurrency result");
    expect(summary.requiredGates[0].id).toBe("release-p0");
    expect(summary.riskSummary.P0.blocked).toBeGreaterThan(0);
    expect(summary.standardCompliance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: "gate.release-p0.concurrency",
          status: "missing",
          ownerAgent: "concurrency-test-agent",
        }),
      ]),
    );
  });
});
