import { buildBusinessFlowMapFromPlan, buildScenarioChains, getAllTestPlans, getAllTestRuns } from "@/lib/data";

describe("business flow map", () => {
  it("prefers explicit flow stages from the plan", async () => {
    const [plans, runs] = await Promise.all([getAllTestPlans(), getAllTestRuns()]);
    const plan = plans.find((item) => item.specId === "R002-goalspec-console/S01-evidence-console");
    const latestRun = runs.find((item) => item.specId === "R002-goalspec-console/S01-evidence-console" && item.flowResults?.length);
    const chains = buildScenarioChains(plan, latestRun!);
    const flow = buildBusinessFlowMapFromPlan(plan, chains, latestRun!);

    expect(flow).toBeDefined();
    expect(flow?.stages.length).toBeGreaterThan(0);
    expect(flow?.name).toBe("Evidence control flow");
    expect(flow?.stages.some((stage) => stage.name === "Select child spec")).toBe(true);
  });
});
