import { buildBusinessFlowMapFromPlan, buildScenarioChains, getAllTestPlans, getAllTestRuns } from "@/lib/data";

describe("business flow map", () => {
  it("prefers explicit flow stages from the plan", async () => {
    const [plans, runs] = await Promise.all([getAllTestPlans(), getAllTestRuns()]);
    const plan = plans.find((item) => item.specId === "reward-order");
    const latestRun = runs.find((item) => item.specId === "reward-order" && item.releaseDecision === "blocked" && item.flowResults?.length);
    const chains = buildScenarioChains(plan, latestRun!);
    const flow = buildBusinessFlowMapFromPlan(plan, chains, latestRun!);

    expect(flow).toBeDefined();
    expect(flow?.stages.length).toBeGreaterThan(0);
    expect(flow?.name).toBe("奖励领取业务流");
    expect(flow?.stages.some((stage) => stage.name === "提交请求")).toBe(true);
  });
});
